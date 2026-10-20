import * as React from 'react';
import { vi } from 'vitest';

type Listener = () => void;

let current_url = new URL('http://localhost:3000/');
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function set_url(path: string) {
  current_url = new URL(path, 'http://localhost:3000');
  emit();
}

export function get_url(): URL {
  return current_url;
}

function navigate(href: string) {
  set_url(href);
}

export const router_mock = {
  push: vi.fn(navigate),
  replace: vi.fn(navigate),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

export function reset_navigation(path = '/') {
  router_mock.push.mockClear();
  router_mock.replace.mockClear();
  current_url = new URL(path, 'http://localhost:3000');
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function use_snapshot(): string {
  return React.useSyncExternalStore(subscribe, () => current_url.toString(), () => current_url.toString());
}

export function useRouter() {
  return router_mock;
}

export function usePathname() {
  const href = use_snapshot();
  return new URL(href).pathname;
}

export function useSearchParams() {
  const href = use_snapshot();
  const search = new URL(href).search;
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams() {
  return {};
}

export function redirect(href: string): never {
  throw new Error(`redirect(${href})`);
}

export function notFound(): never {
  throw new Error('notFound()');
}
