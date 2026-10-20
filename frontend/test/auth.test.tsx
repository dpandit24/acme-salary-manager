import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { AuthGuard } from '@/components/auth-guard';
import { render_with_client } from './render';
import { api_error, server } from './server';
import { get_url, router_mock, set_url } from './mock-navigation';
import { me_fixture } from './fixtures';

describe('Auth redirect', () => {
  it('a 401 from /auth/me routes to /login and keeps the attempted URL', async () => {
    server.use(http.get('*/api/v1/auth/me', () => api_error(401, 'UNAUTHORIZED', 'Not signed in')));
    set_url('/employees?country_code=IN');
    render_with_client(
      <AuthGuard>
        <p>Salary data</p>
      </AuthGuard>,
    );

    await waitFor(() =>
      expect(router_mock.replace).toHaveBeenCalledWith('/login?next=%2Femployees%3Fcountry_code%3DIN'),
    );
    expect(get_url().pathname).toBe('/login');
    expect(get_url().searchParams.get('next')).toBe('/employees?country_code=IN');
    expect(screen.queryByText('Salary data')).not.toBeInTheDocument();
  });

  it('renders the app when the session is valid', async () => {
    render_with_client(
      <AuthGuard>
        <p>Salary data for {me_fixture.email}</p>
      </AuthGuard>,
    );
    expect(await screen.findByText(`Salary data for ${me_fixture.email}`)).toBeInTheDocument();
    expect(router_mock.replace).not.toHaveBeenCalled();
  });
});
