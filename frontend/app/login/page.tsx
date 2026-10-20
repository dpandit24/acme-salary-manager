import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-page p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_20%_-10%,rgb(37_99_235/0.14),transparent),radial-gradient(50rem_30rem_at_110%_110%,rgb(99_102_241/0.14),transparent)]"
      />
      <div className="relative flex flex-col items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-md"
        >
          A
        </span>
        <span className="text-lg font-semibold tracking-tight">ACME Salary</span>
      </div>
      <div className="relative w-full max-w-sm animate-fade-up">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
      <p className="relative text-xs text-muted-foreground">Salary data is private. Sign in with your HR account.</p>
    </main>
  );
}
