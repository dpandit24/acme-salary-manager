'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, query_keys } from '@/lib/api/endpoints';
import type { Employee, Meta, UpdateEmployeeRequest } from '@/lib/api/types';
import { apply_api_error } from '@/lib/form-errors';
import { date_schema, required_text } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormAlert, FormField, field_aria } from '@/components/form-field';

export const TERMINATION_COPY = 'This person will drop out of payroll totals. Their history stays.';

const schema = z.object({
  first_name: required_text('First name', 100),
  last_name: required_text('Last name', 100),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(320),
  country_code: z.string().min(1, 'Country is required'),
  department: z.string().min(1, 'Department is required'),
  job_title: required_text('Job title', 150),
  level: z.string().min(1, 'Level is required'),
  status: z.enum(['active', 'on_leave', 'terminated']),
  hire_date: date_schema,
});
type ProfileValues = z.infer<typeof schema>;
const FIELDS = [
  'first_name',
  'last_name',
  'email',
  'country_code',
  'department',
  'job_title',
  'level',
  'status',
  'hire_date',
] as const;

function to_values(employee: Employee): ProfileValues {
  return {
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    country_code: employee.country_code,
    department: employee.department,
    job_title: employee.job_title,
    level: employee.level,
    status: employee.status,
    hire_date: employee.hire_date,
  };
}

function to_request(values: ProfileValues): UpdateEmployeeRequest {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    email: values.email.trim(),
    country_code: values.country_code,
    department: values.department,
    job_title: values.job_title.trim(),
    level: values.level,
    status: values.status,
    hire_date: values.hire_date,
  };
}

function with_current(options: string[], current: string): string[] {
  return current && !options.includes(current) ? [current, ...options] : options;
}

export function ProfileForm({ employee, meta }: { employee: Employee; meta: Meta | undefined }) {
  const query_client = useQueryClient();
  const [form_error, set_form_error] = React.useState<string | null>(null);
  const [saved, set_saved] = React.useState(false);
  const [pending_termination, set_pending_termination] = React.useState<ProfileValues | null>(null);
  const form = useForm<ProfileValues>({ resolver: zodResolver(schema), defaultValues: to_values(employee) });
  const { errors } = form.formState;

  React.useEffect(() => {
    form.reset(to_values(employee));
  }, [employee.id, employee.updated_at]);

  const save = useMutation({
    mutationFn: (values: ProfileValues) => api.update_employee(employee.id, to_request(values)),
    onSuccess: async () => {
      set_saved(true);
      set_pending_termination(null);
      await Promise.all([
        query_client.invalidateQueries({ queryKey: query_keys.employee(employee.id) }),
        query_client.invalidateQueries({ queryKey: query_keys.overview_all }),
        query_client.invalidateQueries({ queryKey: query_keys.employees_all }),
      ]);
    },
    onError: (error) => {
      set_pending_termination(null);
      set_form_error(apply_api_error(error, form.setError, { known_fields: FIELDS }));
    },
  });

  const on_submit = form.handleSubmit((values) => {
    if (save.isPending) return;
    set_form_error(null);
    set_saved(false);
    if (values.status === 'terminated' && employee.status !== 'terminated') {
      set_pending_termination(values);
      return;
    }
    save.mutate(values);
  });

  const err = (name: (typeof FIELDS)[number]) => errors[name]?.message;
  const countries = meta?.countries ?? [];
  const country_codes = with_current(countries.map((c) => c.code), employee.country_code);

  return (
    <>
      <form onSubmit={on_submit} noValidate aria-label="Edit profile" className="flex flex-col gap-4">
        <FormAlert message={form_error} />
        {saved ? (
          <p role="status" className="text-sm text-green-800">
            Profile saved.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">Saving the profile never changes pay.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField id="profile-first_name" label="First name" error={err('first_name')}>
            <Input {...field_aria('profile-first_name', err('first_name'))} {...form.register('first_name')} />
          </FormField>
          <FormField id="profile-last_name" label="Last name" error={err('last_name')}>
            <Input {...field_aria('profile-last_name', err('last_name'))} {...form.register('last_name')} />
          </FormField>
          <FormField id="profile-email" label="Work email" error={err('email')}>
            <Input type="email" {...field_aria('profile-email', err('email'))} {...form.register('email')} />
          </FormField>
          <FormField id="profile-job_title" label="Job title" error={err('job_title')}>
            <Input {...field_aria('profile-job_title', err('job_title'))} {...form.register('job_title')} />
          </FormField>
          <FormField id="profile-country_code" label="Country" error={err('country_code')}>
            <Select {...field_aria('profile-country_code', err('country_code'))} {...form.register('country_code')}>
              {country_codes.map((code) => {
                const name = countries.find((c) => c.code === code)?.name;
                return (
                  <option key={code} value={code}>
                    {name ? `${name} (${code})` : code}
                  </option>
                );
              })}
            </Select>
          </FormField>
          <FormField id="profile-department" label="Department" error={err('department')}>
            <Select {...field_aria('profile-department', err('department'))} {...form.register('department')}>
              {with_current(meta?.departments ?? [], employee.department).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="profile-level" label="Level" error={err('level')}>
            <Select {...field_aria('profile-level', err('level'))} {...form.register('level')}>
              {with_current(meta?.levels ?? [], employee.level).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="profile-status" label="Status" error={err('status')}>
            <Select {...field_aria('profile-status', err('status'))} {...form.register('status')}>
              <option value="active">Active</option>
              <option value="on_leave">On leave</option>
              <option value="terminated">Terminated</option>
            </Select>
          </FormField>
          <FormField id="profile-hire_date" label="Hire date" error={err('hire_date')}>
            <Input type="date" {...field_aria('profile-hire_date', err('hire_date'))} {...form.register('hire_date')} />
          </FormField>
        </div>
        <div>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>

      <Dialog
        open={pending_termination !== null}
        onOpenChange={(open) => {
          if (!open && !save.isPending) set_pending_termination(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Terminate {employee.first_name} {employee.last_name}?
            </DialogTitle>
            <DialogDescription>{TERMINATION_COPY}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={save.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={save.isPending}
              onClick={() => {
                if (pending_termination && !save.isPending) save.mutate(pending_termination);
              }}
            >
              {save.isPending ? 'Terminating…' : 'Confirm termination'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
