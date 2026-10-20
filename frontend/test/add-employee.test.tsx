import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { AddEmployeeForm } from '@/components/employees/add-employee-form';
import { render_with_client } from './render';
import { employee_detail_fixture, meta_fixture } from './fixtures';
import { api_error, requests_to, server } from './server';
import { router_mock } from './mock-navigation';

async function fill_form(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Employee number'), 'ACME-20001');
  await user.type(screen.getByLabelText('First name'), 'Ravi');
  await user.type(screen.getByLabelText('Last name'), 'Kumar');
  await user.type(screen.getByLabelText('Work email'), 'ravi@acme.test');
  await user.selectOptions(screen.getByLabelText('Country'), 'IN');
  await user.selectOptions(screen.getByLabelText('Department'), 'Engineering');
  await user.type(screen.getByLabelText('Job title'), 'Engineer');
  await user.selectOptions(screen.getByLabelText('Level'), 'IC3');
  fireEvent.change(screen.getByLabelText('Hire date'), { target: { value: '2026-11-01' } });
  await user.type(screen.getByLabelText('Annual base amount'), '85000.50');
}

describe('Add employee', () => {
  it('posts amount_minor as an integer with reason hire, defaulting currency and effective_from', async () => {
    server.use(http.post('*/api/v1/employees', () => HttpResponse.json(employee_detail_fixture, { status: 201 })));
    const user = userEvent.setup();
    render_with_client(<AddEmployeeForm meta={meta_fixture} />);

    await fill_form(user);
    expect(screen.getByLabelText('Currency')).toHaveValue('INR');
    expect(screen.getByLabelText('Effective from')).toHaveValue('2026-11-01');

    await user.click(screen.getByRole('button', { name: 'Create employee' }));

    await waitFor(() => expect(requests_to('POST', '/api/v1/employees')).toHaveLength(1));
    const body = requests_to('POST', '/api/v1/employees')[0]!.body as Record<string, unknown>;
    expect(body).toMatchObject({
      employee_number: 'ACME-20001',
      country_code: 'IN',
      hire_date: '2026-11-01',
      effective_from: '2026-11-01',
      amount_minor: 8500050,
      currency: 'INR',
      reason: 'hire',
    });
    expect(Number.isInteger(body.amount_minor)).toBe(true);
    await waitFor(() => expect(router_mock.push).toHaveBeenCalledWith(`/employees/${employee_detail_fixture.id}`));
  });

  it('shows an API field error on that field', async () => {
    server.use(
      http.post('*/api/v1/employees', () =>
        api_error(400, 'VALIDATION', 'Validation failed', {
          email: 'is already used by another employee',
          amount_minor: 'must be a positive integer',
        }),
      ),
    );
    const user = userEvent.setup();
    render_with_client(<AddEmployeeForm meta={meta_fixture} />);
    await fill_form(user);
    await user.click(screen.getByRole('button', { name: 'Create employee' }));

    const duplicate = 'Another employee already has this work email. Enter a different one.';
    expect(await screen.findByText(duplicate)).toBeInTheDocument();
    const email = screen.getByLabelText('Work email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(`Error: ${duplicate}`);
    expect(screen.getByLabelText('Annual base amount')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Annual base amount must be a positive integer.')).toBeInTheDocument();
  });

  it('rejects more than two decimal places before sending', async () => {
    const user = userEvent.setup();
    render_with_client(<AddEmployeeForm meta={meta_fixture} />);
    await fill_form(user);
    await user.clear(screen.getByLabelText('Annual base amount'));
    await user.type(screen.getByLabelText('Annual base amount'), '100.123');
    await user.click(screen.getByRole('button', { name: 'Create employee' }));
    expect(await screen.findByText('Enter a number with at most two decimal places')).toBeInTheDocument();
    expect(requests_to('POST', '/api/v1/employees')).toHaveLength(0);
  });
});
