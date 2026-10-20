'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { is_api_error, login_url } from '@/lib/api/client';
import { use_me } from '@/lib/hooks';
import { ErrorState, LoadingState } from '@/components/state-messages';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const search_params = useSearchParams();
  const me = use_me();
  const unauthorized = is_api_error(me.error) && me.error.status === 401;

  const redirected = React.useRef(false);

  React.useEffect(() => {
    if (!unauthorized || redirected.current || pathname === '/login') return;
    redirected.current = true;
    const qs = search_params.toString();
    router.replace(login_url(`${pathname}${qs ? `?${qs}` : ''}`));
  }, [unauthorized, router, pathname, search_params]);

  if (unauthorized) return <LoadingState label="Redirecting to sign in…" />;
  if (me.isPending) return <LoadingState label="Checking your session…" />;
  if (me.isError) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <ErrorState title="Could not check your session" error={me.error} on_retry={() => void me.refetch()} />
      </div>
    );
  }
  return <>{children}</>;
}
