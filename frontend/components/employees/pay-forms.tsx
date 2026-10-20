'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, query_keys } from '@/lib/api/endpoints';
import type { Compensation } from '@/lib/api/types';
import { apply_api_error } from '@/lib/form-errors';
import { minor_to_major_input } from '@/lib/money';
import { amount_schema, amount_to_minor, date_schema, note_schema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
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

export const DUPLICATE_DATE_MESSAGE = 'That date already has a compensation row for this person.';
export const RECORD_CHANGE_HINT =
  'The new amount becomes current pay on this date. Future dates are allowed; until then the current amount stays.';
export const CORRECTION_HINT =
  'This rewrites this row because it was wrong. It does not record a raise — use “Record a change” for that.';

export async function invalidate_after_pay_write(query_client: QueryClient, employee_id: string) {
  await Promise.all([
    query_client.invalidateQueries({ queryKey: query_keys.employee(employee_id) }),
    query_client.invalidateQueries({ queryKey: query_keys.overview_all }),
    query_client.invalidateQueries({ queryKey: query_keys.employees_all }),
  ]);
}

function currency_options(currencies: string[], current: string): string[] {
  return current && !currencies.includes(current) ? [current, ...currencies] : currencies;
}

const change_schema = z.object({
  effective_from: date_schema,
  amount: amount_schema,
  currency: z.string().min(1, 'Currency is required'),
  reason: z.enum(['merit', 'promotion', 'market_adjustment'], { message: 'Choose a reason' }),
  note: note_schema,
});
type ChangeValues = z.infer<typeof change_schema>;
const CHANGE_FIELDS = ['effective_from', 'amount', 'currency', 'reason', 'note'] as const;

export function RecordChangeForm({
  employee_id,
  default_currency,
  currencies,
}: {
  employee_id: string;
  default_currency: string;
  currencies: string[];
}) {
  const query_client = useQueryClient();
  const [form_error, set_form_error] = React.useState<string | null>(null);
  const [saved, set_saved] = React.useState(false);
  const defaults: ChangeValues = { effective_from: '', amount: '', currency: default_currency, reason: 'merit', note: '' };
  const form = useForm<ChangeValues>({ resolver: zodResolver(change_schema), defaultValues: defaults });
  const { errors } = form.formState;

  const create = useMutation({
    mutationFn: (values: ChangeValues) =>
      api.create_compensation(employee_id, {
        effective_from: values.effective_from,
        amount_minor: amount_to_minor(values.amount),
        currency: values.currency,
        reason: values.reason,
        note: values.note.trim() || null,
      }),
    onSuccess: async () => {
      form.reset({ ...defaults, currency: form.getValues('currency') });
      set_saved(true);
      await invalidate_after_pay_write(query_client, employee_id);
    },
    onError: (error) => {
      set_form_error(
        apply_api_error(error, form.setError, {
          known_fields: CHANGE_FIELDS,
          aliases: { amount_minor: 'amount' },
          conflict_field: 'effective_from',
          conflict_message: DUPLICATE_DATE_MESSAGE,
        }),
      );
    },
  });

  const on_submit = form.handleSubmit((values) => {
    if (create.isPending) return;
    set_form_error(null);
    set_saved(false);
    create.mutate(values);
  });

  return (
    <form onSubmit={on_submit} noValidate aria-label="Record a change" className="flex flex-col gap-4">
      <FormAlert message={form_error} />
      {saved ? (
        <p role="status" className="text-sm text-green-800">
          Change recorded.
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="change-effective_from" label="Effective from" error={errors.effective_from?.message} hint={RECORD_CHANGE_HINT}>
          <Input
            type="date"
            {...field_aria('change-effective_from', errors.effective_from?.message, 'hint')}
            {...form.register('effective_from')}
          />
        </FormField>
        <FormField id="change-reason" label="Reason" error={errors.reason?.message}>
          <Select {...field_aria('change-reason', errors.reason?.message)} {...form.register('reason')}>
            <option value="merit">Merit</option>
            <option value="promotion">Promotion</option>
            <option value="market_adjustment">Market adjustment</option>
          </Select>
        </FormField>
        <FormField id="change-amount" label="New annual base amount" error={errors.amount?.message} hint="Major units, e.g. 85000 or 85000.50.">
          <Input inputMode="decimal" autoComplete="off" {...field_aria('change-amount', errors.amount?.message, 'hint')} {...form.register('amount')} />
        </FormField>
        <FormField id="change-currency" label="Currency" error={errors.currency?.message}>
          <Select {...field_aria('change-currency', errors.currency?.message)} {...form.register('currency')}>
            <option value="">Select a currency</option>
            {currency_options(currencies, default_currency).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="change-note" label="Note (optional)" error={errors.note?.message} className="md:col-span-2">
          <Textarea {...field_aria('change-note', errors.note?.message)} {...form.register('note')} />
        </FormField>
      </div>
      <div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Recording…' : 'Record change'}
        </Button>
      </div>
    </form>
  );
}

const correction_schema = z.object({
  effective_from: date_schema,
  amount: amount_schema,
  currency: z.string().min(1, 'Currency is required'),
  note: note_schema,
});
type CorrectionValues = z.infer<typeof correction_schema>;
const CORRECTION_FIELDS = ['effective_from', 'amount', 'currency', 'note'] as const;

export function CorrectCompensationDialog({
  employee_id,
  compensation,
  currencies,
  on_close,
}: {
  employee_id: string;
  compensation: Compensation | null;
  currencies: string[];
  on_close: () => void;
}) {
  return (
    <Dialog open={compensation !== null} onOpenChange={(open) => (open ? undefined : on_close())}>
      <DialogContent>
        {compensation ? (
          <CorrectionForm employee_id={employee_id} compensation={compensation} currencies={currencies} on_done={on_close} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CorrectionForm({
  employee_id,
  compensation,
  currencies,
  on_done,
}: {
  employee_id: string;
  compensation: Compensation;
  currencies: string[];
  on_done: () => void;
}) {
  const query_client = useQueryClient();
  const [form_error, set_form_error] = React.useState<string | null>(null);
  const form = useForm<CorrectionValues>({
    resolver: zodResolver(correction_schema),
    defaultValues: {
      effective_from: compensation.effective_from,
      amount: minor_to_major_input(compensation.amount_minor),
      currency: compensation.currency,
      note: compensation.note ?? '',
    },
  });
  const { errors } = form.formState;

  const correct = useMutation({
    mutationFn: (values: CorrectionValues) =>
      api.correct_compensation(employee_id, compensation.id, {
        effective_from: values.effective_from,
        amount_minor: amount_to_minor(values.amount),
        currency: values.currency,
        reason: 'correction',
        note: values.note.trim() || null,
      }),
    onSuccess: async () => {
      await invalidate_after_pay_write(query_client, employee_id);
      on_done();
    },
    onError: (error) => {
      set_form_error(
        apply_api_error(error, form.setError, {
          known_fields: CORRECTION_FIELDS,
          aliases: { amount_minor: 'amount' },
          conflict_field: 'effective_from',
          conflict_message: DUPLICATE_DATE_MESSAGE,
        }),
      );
    },
  });

  const on_submit = form.handleSubmit((values) => {
    if (correct.isPending) return;
    set_form_error(null);
    correct.mutate(values);
  });

  return (
    <form onSubmit={on_submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Correct pay row from {compensation.effective_from}</DialogTitle>
        <DialogDescription>{CORRECTION_HINT}</DialogDescription>
      </DialogHeader>
      <FormAlert message={form_error} />
      <FormField id="correct-effective_from" label="Effective from" error={errors.effective_from?.message}>
        <Input type="date" {...field_aria('correct-effective_from', errors.effective_from?.message)} {...form.register('effective_from')} />
      </FormField>
      <FormField id="correct-amount" label="Annual base amount" error={errors.amount?.message} hint="Major units, e.g. 85000 or 85000.50.">
        <Input inputMode="decimal" autoComplete="off" {...field_aria('correct-amount', errors.amount?.message, 'hint')} {...form.register('amount')} />
      </FormField>
      <FormField id="correct-currency" label="Currency" error={errors.currency?.message}>
        <Select {...field_aria('correct-currency', errors.currency?.message)} {...form.register('currency')}>
          {currency_options(currencies, compensation.currency).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField id="correct-note" label="Note (optional)" error={errors.note?.message}>
        <Textarea {...field_aria('correct-note', errors.note?.message)} {...form.register('note')} />
      </FormField>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={correct.isPending}>
          {correct.isPending ? 'Saving correction…' : 'Save correction'}
        </Button>
      </DialogFooter>
    </form>
  );
}
