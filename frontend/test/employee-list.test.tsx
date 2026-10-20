import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { EmployeeListScreen } from '@/components/employees/employee-list-screen';
import { render_with_client } from './render';
import { empty_list_fixture } from './fixtures';
import { api_error, requests_to, server } from './server';
import { get_url, set_url } from './mock-navigation';

function list_requests() {
  return requests_to('GET', '/api/v1/employees');
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Employee list', () => {
  it('renders one page, shows the total, and sends page, page_size, country_code and q', async () => {
    set_url('/employees?country_code=IN');
    render_with_client(<EmployeeListScreen />);

    expect(await screen.findByText('1–25 of 9,840')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Employees' });
    expect(within(table).getAllByRole('row')).toHaveLength(26);
    expect(within(table).getByText('No pay yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();

    const first = list_requests()[0]!.url.searchParams;
    expect(first.get('page')).toBe('1');
    expect(first.get('page_size')).toBe('25');
    expect(first.get('country_code')).toBe('IN');
    expect(first.has('q')).toBe(false);

    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] });
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'ada' } });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(list_requests().some((r) => r.url.searchParams.get('q') === 'ada')).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1);
    });

    await waitFor(() => {
      const with_q = list_requests().find((r) => r.url.searchParams.get('q') === 'ada');
      expect(with_q).toBeDefined();
      expect(with_q!.url.searchParams.get('country_code')).toBe('IN');
      expect(with_q!.url.searchParams.get('page')).toBe('1');
      expect(with_q!.url.searchParams.get('page_size')).toBe('25');
    });
    expect(get_url().searchParams.get('q')).toBe('ada');
  });

  it('moves to the next page through the URL', async () => {
    set_url('/employees');
    const user = userEvent.setup();
    render_with_client(<EmployeeListScreen />);
    await screen.findByText('1–25 of 9,840');

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('26–50 of 9,840')).toBeInTheDocument();
    expect(get_url().searchParams.get('page')).toBe('2');
    expect(list_requests().at(-1)!.url.searchParams.get('page')).toBe('2');
  });

  it('labels the salary sort as USD equivalent', async () => {
    set_url('/employees');
    const user = userEvent.setup();
    render_with_client(<EmployeeListScreen />);
    await screen.findByText('1–25 of 9,840');

    await user.click(screen.getByRole('button', { name: 'Current annual pay (contract currency)' }));

    expect(await screen.findByRole('button', { name: 'Salary (USD equiv.)' })).toBeInTheDocument();
    expect(get_url().searchParams.get('sort')).toBe('salary');
    await waitFor(() => expect(list_requests().at(-1)!.url.searchParams.get('sort')).toBe('salary'));
    expect(screen.getByText(/Sorted by salary in USD equivalent/)).toBeInTheDocument();
    expect(screen.getAllByText(/USD equiv\.$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('≈ $30,000.00 USD equiv.').length).toBeGreaterThan(0);
  });

  it('an empty result and a server error do not look the same', async () => {
    server.use(http.get('*/api/v1/employees', () => HttpResponse.json(empty_list_fixture)));
    set_url('/employees?q=nobody');
    const first = render_with_client(<EmployeeListScreen />);
    expect(await screen.findByText('No employees match these filters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    first.unmount();

    server.use(http.get('*/api/v1/employees', () => api_error(500, 'INTERNAL', 'Internal server error')));
    render_with_client(<EmployeeListScreen />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load employees');
    expect(alert).toHaveTextContent('HTTP 500');
    expect(screen.queryByText('No employees match these filters')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });
});
