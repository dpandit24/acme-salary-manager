'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/endpoints';
import { use_me } from '@/lib/hooks';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/employees', label: 'Employees' },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const query_client = useQueryClient();
  const me = use_me();

  const logout = useMutation({
    mutationFn: api.logout,
    onSettled: () => {
      query_client.clear();
      router.replace('/login');
    },
  });

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm"
            >
              A
            </span>
            <span className="font-semibold tracking-tight">ACME Salary</span>
          </Link>
          <nav aria-label="Primary">
            <ul className="flex gap-1">
              {NAV.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {me.data ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                aria-hidden="true"
                className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold uppercase text-secondary-foreground"
              >
                {me.data.email.charAt(0)}
              </span>
              <span className="hidden sm:inline">Signed in as {me.data.email}</span>
            </span>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </div>
    </header>
  );
}
