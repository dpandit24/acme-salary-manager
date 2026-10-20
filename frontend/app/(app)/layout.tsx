import { Suspense } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { AppHeader } from '@/components/app-header';
import { LoadingState } from '@/components/state-messages';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <AuthGuard>
        <AppHeader />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </AuthGuard>
    </Suspense>
  );
}
