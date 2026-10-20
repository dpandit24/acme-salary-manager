'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, query_keys } from '@/lib/api/endpoints';
import type { Meta } from '@/lib/api/types';
import { apply_api_error } from '@/lib/form-errors';
import { use_meta } from '@/lib/hooks';
import { amount_schema, amount_to_minor, date_schema, required_text } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormAlert, FormField, field_aria } from '@/components/form-field';
import { ErrorState, LoadingState } from '@/components/state-messages';

const schema = z.object({
  employee_number: required_text('Employee number', 20),
  first_name: required_text('First name', 100),
  last_name: required_text('Last name', 100),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(320),
  country_code: z.string().min(1, 'Country is required'),
  department: z.string().min(1, 'Department is required'),
  job_title: required_text('Job title', 150),
  level: z.string().min(1, 'Level is required'),
  hire_date: date_schema,
  effective_from: date_schema,
  amount: amount_schema,
  currency: z.string().min(1, 'Currency is required'),
});
type AddEmployeeValues = z.infer<typeof schema>;

const FIELDS = [
  'employee_number',
  'first_name',
  'last_name',
  'email',
  'country_code',
  'department',
  'job_title',
  'level',
  'hire_date',
  'effective_from',
  'amount',
  'currency',
] as const;

const LABELS: Record<string, string> = {
  email: 'work email',
  country_code: 'country',
  amount_minor: 'annual base amount',
  effective_from: 'effective from date',
};

export function AddEmployeeScreen() {
  const meta = use_meta();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/employees" className="text-sm text-primary underline-offset-4 hover:underline">
          ← Back to employees
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add employee</h1>
        <p className="text-sm text-muted-foreground">Creates the person and their opening salary together.</p>
      </div>
      {meta.isPending ? (
        <LoadingState label="Loading form options…" />
      ) : meta.isError ? (
        <ErrorState title="Could not load form options" error={meta.error} on_retry={() => void meta.refetch()} />
      ) : (
        <AddEmployeeForm meta={meta.data} />
      )}
    </div>
  );
}

export function AddEmployeeForm({ meta }: { meta: Meta }) {
  const router = useRouter();
  const query_client = useQueryClient();
  const [form_error, set_form_error] = React.useState<string | null>(null);
  const form = useForm<AddEmployeeValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_number: '',
      first_name: '',
      last_name: '',
      email: '',
      country_code: '',
      department: '',
      job_title: '',
      level: '',
      hire_date: '',
      effective_from: '',
      amount: '',
      currency: '',
    },
  });
  const { errors } = form.formState;

  const create = useMutation({
    mutationFn: api.create_employee,
    onSuccess: async (employee) => {
      await Promise.all([
        query_client.invalidateQueries({ queryKey: query_keys.employees_all }),
        query_client.invalidateQueries({ queryKey: query_keys.overview_all }),
      ]);
      router.push(`/employees/${employee.id}`);
    },
    onError: (error) => {
      set_form_error(
        apply_api_error(error, form.setError, { known_fields: FIELDS, aliases: { amount_minor: 'amount' }, labels: LABELS }),
      );
    },
  });

  const on_submit = form.handleSubmit((values) => {
    if (create.isPending) return;
    set_form_error(null);
    create.mutate({
      employee_number: values.employee_number.trim(),
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email: values.email.trim(),
      country_code: values.country_code,
      department: values.department,
      job_title: values.job_title.trim(),
      level: values.level,
      hire_date: values.hire_date,
      effective_from: values.effective_from,
      amount_minor: amount_to_minor(values.amount),
      currency: values.currency,
      reason: 'hire',
    });
  });

  const err = (name: (typeof FIELDS)[number]) => errors[name]?.message;

  return (
    <form onSubmit={on_submit} noValidate className="flex flex-col gap-5">
      <FormAlert message={form_error} />
      <Card>
        <CardHeader>
          <CardTitle>Person</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField id="employee_number" label="Employee number" error={err('employee_number')}>
            <Input {...field_aria('employee_number', err('employee_number'))} {...form.register('employee_number')} />
          </FormField>
          <FormField id="email" label="Work email" error={err('email')}>
            <Input type="email" {...field_aria('email', err('email'))} {...form.register('email')} />
          </FormField>
          <FormField id="first_name" label="First name" error={err('first_name')}>
            <Input {...field_aria('first_name', err('first_name'))} {...form.register('first_name')} />
          </FormField>
          <FormField id="last_name" label="Last name" error={err('last_name')}>
            <Input {...field_aria('last_name', err('last_name'))} {...form.register('last_name')} />
          </FormField>
          <FormField id="country_code" label="Country" error={err('country_code')}>
            <Select
              {...field_aria('country_code', err('country_code'))}
              {...form.register('country_code', {
                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                  const country = meta.countries.find((c) => c.code === event.target.value);
                  if (country) form.setValue('currency', country.default_currency, { shouldValidate: true });
                },
              })}
            >
              <option value="">Select a country</option>
              {meta.countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="department" label="Department" error={err('department')}>
            <Select {...field_aria('department', err('department'))} {...form.register('department')}>
              <option value="">Select a department</option>
              {meta.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="job_title" label="Job title" error={err('job_title')}>
            <Input {...field_aria('job_title', err('job_title'))} {...form.register('job_title')} />
          </FormField>
          <FormField id="level" label="Level" error={err('level')}>
            <Select {...field_aria('level', err('level'))} {...form.register('level')}>
              <option value="">Select a level</option>
              {meta.levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="hire_date" label="Hire date" error={err('hire_date')}>
            <Input
              type="date"
              {...field_aria('hire_date', err('hire_date'))}
              {...form.register('hire_date', {
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  if (!form.getFieldState('effective_from').isDirty) {
                    form.setValue('effective_from', event.target.value);
                  }
                },
              })}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opening salary</CardTitle>
          <CardDescription>Annual base pay. Recorded with reason “Hire”.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            id="amount"
            label="Annual base amount"
            error={err('amount')}
            hint="Major units, e.g. 85000 or 85000.50."
          >
            <Input
              inputMode="decimal"
              autoComplete="off"
              {...field_aria('amount', err('amount'), 'hint')}
              {...form.register('amount')}
            />
          </FormField>
          <FormField
            id="currency"
            label="Currency"
            error={err('currency')}
            hint="Defaults to the country's currency. Change it for expat contracts."
          >
            <Select {...field_aria('currency', err('currency'), 'hint')} {...form.register('currency')}>
              <option value="">Select a currency</option>
              {meta.currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            id="effective_from"
            label="Effective from"
            error={err('effective_from')}
            hint="Normally the hire date."
          >
            <Input
              type="date"
              {...field_aria('effective_from', err('effective_from'), 'hint')}
              {...form.register('effective_from')}
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create employee'}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/employees">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
