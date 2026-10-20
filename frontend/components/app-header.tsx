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
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">ACME Salary</span>
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
                        'rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active && 'bg-accent',
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
          {me.data ? <span className="text-muted-foreground">Signed in as {me.data.email}</span> : null}
          <Button variant="outline" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </div>
    </header>
  );
}
