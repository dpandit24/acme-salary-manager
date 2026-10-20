import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { EmployeeDetailScreen } from '@/components/employees/employee-detail-screen';
import { DUPLICATE_DATE_MESSAGE } from '@/components/employees/pay-forms';
import { TERMINATION_COPY } from '@/components/employees/profile-form';
import { render_with_client } from './render';
import { employee_detail_fixture } from './fixtures';
import { api_error, requests_to, server } from './server';

const ID = employee_detail_fixture.id;
const DETAIL_PATH = `/api/v1/employees/${ID}`;
const COMP_PATH = `${DETAIL_PATH}/compensations`;

async function render_detail() {
  render_with_client(<EmployeeDetailScreen id={ID} />);
  await screen.findByRole('heading', { name: 'Ada Lovelace' });
}

describe('Employee detail', () => {
  it('shows current pay and history oldest first', async () => {
    await render_detail();
    expect(screen.getByTestId('current-pay')).toHaveTextContent('$120,000.00 USD');
    const rows = within(screen.getByRole('table', { name: 'Pay history' })).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('2022-03-01');
    expect(rows[2]).toHaveTextContent('2024-04-01');
  });

  it('Record a change allows a future effective_from and invalidates the detail', async () => {
    server.use(http.post(`*${COMP_PATH}`, () => HttpResponse.json({}, { status: 201 })));
    const user = userEvent.setup();
    await render_detail();
    const form = screen.getByRole('form', { name: 'Record a change' });

    fireEvent.change(within(form).getByLabelText('Effective from'), { target: { value: '2027-06-01' } });
    await user.type(within(form).getByLabelText('New annual base amount'), '130000');
    await user.selectOptions(within(form).getByLabelText('Reason'), 'promotion');
    await user.click(within(form).getByRole('button', { name: 'Record change' }));

    await waitFor(() => expect(requests_to('POST', COMP_PATH)).toHaveLength(1));
    expect(requests_to('POST', COMP_PATH)[0]!.body).toEqual({
      effective_from: '2027-06-01',
      amount_minor: 13000000,
      currency: 'USD',
      reason: 'promotion',
      note: null,
    });
    expect(await within(form).findByText('Change recorded.')).toBeInTheDocument();
    await waitFor(() => expect(requests_to('GET', DETAIL_PATH).length).toBeGreaterThanOrEqual(2));
  });

  it('shows a duplicate-date 409 on the date field', async () => {
    server.use(
      http.post(`*${COMP_PATH}`, () =>
        api_error(409, 'CONFLICT', 'A compensation already exists for this effective date'),
      ),
    );
    const user = userEvent.setup();
    await render_detail();
    const form = screen.getByRole('form', { name: 'Record a change' });

    const date = within(form).getByLabelText('Effective from');
    fireEvent.change(date, { target: { value: '2024-04-01' } });
    await user.type(within(form).getByLabelText('New annual base amount'), '125000');
    await user.click(within(form).getByRole('button', { name: 'Record change' }));

    expect(await within(form).findByText(DUPLICATE_DATE_MESSAGE)).toBeInTheDocument();
    expect(date).toHaveAttribute('aria-invalid', 'true');
    expect(date).toHaveAccessibleDescription(expect.stringContaining(DUPLICATE_DATE_MESSAGE));
  });

  it('Correct sends reason correction to the row PATCH', async () => {
    server.use(http.patch(`*${COMP_PATH}/:compensation_id`, () => HttpResponse.json({})));
    const user = userEvent.setup();
    await render_detail();
    await user.click(screen.getByRole('button', { name: 'Correct row from 2024-04-01' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('does not record a raise');
    const amount = within(dialog).getByLabelText('Annual base amount');
    await user.clear(amount);
    await user.type(amount, '121000');
    await user.click(within(dialog).getByRole('button', { name: 'Save correction' }));

    await waitFor(() => expect(requests_to('PATCH', `${COMP_PATH}/comp-2`)).toHaveLength(1));
    expect(requests_to('PATCH', `${COMP_PATH}/comp-2`)[0]!.body).toMatchObject({
      amount_minor: 12100000,
      currency: 'USD',
      effective_from: '2024-04-01',
      reason: 'correction',
    });
  });

  it('profile save sends no amount fields', async () => {
    server.use(http.patch(`*${DETAIL_PATH}`, () => HttpResponse.json(employee_detail_fixture)));
    const user = userEvent.setup();
    await render_detail();
    const form = screen.getByRole('form', { name: 'Edit profile' });
    const title = within(form).getByLabelText('Job title');
    await user.clear(title);
    await user.type(title, 'Principal Engineer');
    await user.click(within(form).getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(requests_to('PATCH', DETAIL_PATH)).toHaveLength(1));
    const body = requests_to('PATCH', DETAIL_PATH)[0]!.body as Record<string, unknown>;
    expect(body.job_title).toBe('Principal Engineer');
    for (const key of ['amount_minor', 'currency', 'amount_usd_minor', 'effective_from', 'reason', 'compensations']) {
      expect(body).not.toHaveProperty(key);
    }
  });

  it('termination requires confirmation; dismissing sends nothing', async () => {
    server.use(http.patch(`*${DETAIL_PATH}`, () => HttpResponse.json({ ...employee_detail_fixture, status: 'terminated' })));
    const user = userEvent.setup();
    await render_detail();
    const form = screen.getByRole('form', { name: 'Edit profile' });

    await user.selectOptions(within(form).getByLabelText('Status'), 'terminated');
    await user.click(within(form).getByRole('button', { name: 'Save profile' }));
    let dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(TERMINATION_COPY);
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(requests_to('PATCH', DETAIL_PATH)).toHaveLength(0);

    await user.click(within(form).getByRole('button', { name: 'Save profile' }));
    dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm termination' }));

    await waitFor(() => expect(requests_to('PATCH', DETAIL_PATH)).toHaveLength(1));
    expect(requests_to('PATCH', DETAIL_PATH)[0]!.body).toMatchObject({ status: 'terminated' });
  });
});
