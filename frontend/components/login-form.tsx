'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormAlert, FormField, field_aria } from '@/components/form-field';
import { api, query_keys } from '@/lib/api/endpoints';
import { is_api_error } from '@/lib/api/client';
import { apply_api_error } from '@/lib/form-errors';
import { safe_next_path } from '@/lib/utils';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type LoginValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const search_params = useSearchParams();
  const query_client = useQueryClient();
  const [form_error, set_form_error] = React.useState<string | null>(null);
  const form = useForm<LoginValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  const { errors } = form.formState;

  const login = useMutation({
    mutationFn: api.login,
    onSuccess: async () => {
      await query_client.invalidateQueries({ queryKey: query_keys.me });
      router.replace(safe_next_path(search_params.get('next')));
    },
    onError: (error) => {
      if (is_api_error(error) && error.status === 401) {
        set_form_error('Email or password is incorrect.');
        return;
      }
      set_form_error(apply_api_error(error, form.setError, { known_fields: ['email', 'password'] }));
    },
  });

  const on_submit = form.handleSubmit((values) => {
    if (login.isPending) return;
    set_form_error(null);
    login.mutate(values);
  });

  return (
    <Card className="w-full shadow-lift">
      <CardHeader>
        <CardTitle>
          <span className="text-xl">Sign in to ACME Salary</span>
        </CardTitle>
        <CardDescription>HR access only.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={on_submit} noValidate className="flex flex-col gap-4">
          <FormAlert message={form_error} />
          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="username" {...field_aria('email', errors.email?.message)} {...form.register('email')} />
          </FormField>
          <FormField id="password" label="Password" error={errors.password?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              {...field_aria('password', errors.password?.message)}
              {...form.register('password')}
            />
          </FormField>
          <Button type="submit" className="mt-3" disabled={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
