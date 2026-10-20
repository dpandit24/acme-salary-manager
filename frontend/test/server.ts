import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  employee_detail_fixture,
  list_page_fixture,
  me_fixture,
  meta_fixture,
  overview_fixture,
} from './fixtures';

export interface RecordedRequest {
  method: string;
  url: URL;
  body: unknown;
}

export const requests: RecordedRequest[] = [];

export function requests_to(method: string, pathname: string): RecordedRequest[] {
  return requests.filter((r) => r.method === method && r.url.pathname === pathname);
}

export function api_error(status: number, code: string, message: string, fields?: Record<string, string>) {
  return HttpResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

export const default_handlers = [
  http.get('*/api/v1/auth/me', () => HttpResponse.json(me_fixture)),
  http.get('*/api/v1/meta', () => HttpResponse.json(meta_fixture)),
  http.get('*/api/v1/analytics/overview', () => HttpResponse.json(overview_fixture)),
  http.get('*/api/v1/employees', ({ request }) => {
    const page = Number(new URL(request.url).searchParams.get('page') ?? '1');
    return HttpResponse.json(list_page_fixture(page));
  }),
  http.get('*/api/v1/employees/:id', () => HttpResponse.json(employee_detail_fixture)),
];

export const server = setupServer(...default_handlers);

server.events.on('request:start', async ({ request }) => {
  const url = new URL(request.url);
  let body: unknown = undefined;
  if (request.method !== 'GET') {
    const text = await request.clone().text();
    body = text ? JSON.parse(text) : undefined;
  }
  requests.push({ method: request.method, url, body });
});
