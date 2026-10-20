import { EmployeeDetailScreen } from '@/components/employees/employee-detail-screen';

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeeDetailScreen id={id} />;
}
