import { Suspense } from 'react';
import { EmployeeListScreen } from '@/components/employees/employee-list-screen';
import { LoadingState } from '@/components/state-messages';

export default function EmployeesPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading employees…" />}>
      <EmployeeListScreen />
    </Suspense>
  );
}
