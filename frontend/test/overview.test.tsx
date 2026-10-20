import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { OverviewScreen } from '@/components/overview/overview-screen';
import { format_money } from '@/lib/money';
import { render_with_client } from './render';
import { overview_fixture, overview_future_fixture } from './fixtures';
import { requests_to, server } from './server';

describe('Overview', () => {
  it('renders per-currency totals, a labeled USD snapshot, and median beside average', async () => {
    render_with_client(<OverviewScreen initial_as_of="2026-10-20" />);

    expect(await screen.findByText('9,500 people')).toBeInTheDocument();

    for (const row of overview_fixture.by_currency) {
      expect(screen.getAllByText(format_money(row.total_minor, row.currency)).length).toBeGreaterThan(0);
      expect(screen.getAllByText(format_money(row.median_minor, row.currency)).length).toBeGreaterThan(0);
      expect(screen.getAllByText(format_money(row.average_minor, row.currency)).length).toBeGreaterThan(0);
    }

    expect(screen.getByText(format_money(overview_fixture.usd.total_minor, 'USD'))).toBeInTheDocument();
    expect(screen.getByText('USD snapshot · rates as of 2026-10-01')).toBeInTheDocument();
    expect(screen.getByText(format_money(overview_fixture.usd.median_minor, 'USD'))).toBeInTheDocument();
    expect(screen.getByText(format_money(overview_fixture.usd.average_minor, 'USD'))).toBeInTheDocument();
    expect(screen.getByText('Median is typical pay. Average is pulled up by senior levels.')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /IN/ })).toHaveAttribute('href', '/employees?country_code=IN');
    expect(screen.getByRole('link', { name: 'Engineering' })).toHaveAttribute(
      'href',
      '/employees?department=Engineering',
    );

    const call = requests_to('GET', '/api/v1/analytics/overview')[0];
    expect(call?.url.searchParams.get('as_of')).toBe('2026-10-20');
  });

  it('changing the as-of date sends a new as_of and drops the previous totals', async () => {
    server.use(
      http.get('*/api/v1/analytics/overview', async ({ request }) => {
        const as_of = new URL(request.url).searchParams.get('as_of');
        if (as_of === '2027-01-15') {
          await delay(50);
          return HttpResponse.json(overview_future_fixture);
        }
        return HttpResponse.json(overview_fixture);
      }),
    );
    render_with_client(<OverviewScreen initial_as_of="2026-10-20" />);

    const old_total = format_money(overview_fixture.usd.total_minor, 'USD');
    const new_total = format_money(overview_future_fixture.usd.total_minor, 'USD');
    expect(await screen.findByText(old_total)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('As of date'), { target: { value: '2027-01-15' } });

    expect(screen.queryByText(old_total)).not.toBeInTheDocument();
    expect(await screen.findByText(new_total)).toBeInTheDocument();
    expect(screen.queryByText(old_total)).not.toBeInTheDocument();
    expect(screen.queryByText('9,500 people')).not.toBeInTheDocument();
    expect(screen.getByText('9,600 people')).toBeInTheDocument();

    await waitFor(() => {
      const sent = requests_to('GET', '/api/v1/analytics/overview').map((r) => r.url.searchParams.get('as_of'));
      expect(sent).toEqual(['2026-10-20', '2027-01-15']);
    });
  });
});
