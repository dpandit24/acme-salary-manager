import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { requests, server } from './server';
import { reset_navigation } from './mock-navigation';

vi.mock('next/navigation', () => import('./mock-navigation'));

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
    function MockLink({ href, children, ...rest }, ref) {
      return React.createElement('a', { href, ref, ...rest }, children);
    },
  ),
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  requests.length = 0;
  reset_navigation('/');
});
afterAll(() => server.close());
