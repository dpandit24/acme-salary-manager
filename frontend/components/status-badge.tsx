import { Badge } from '@/components/ui/badge';
import type { EmployeeStatus } from '@/lib/api/types';
import { STATUS_LABELS } from '@/lib/utils';

const VARIANTS = { active: 'success', on_leave: 'warning', terminated: 'muted' } as const;

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return <Badge variant={VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
