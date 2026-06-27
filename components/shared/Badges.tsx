import { cn } from '@/lib/utils';
import { STATUS_META, PAYMENT_META, PRIORITY_META } from '@/lib/status-config';
import type { ProjectStatus, PaymentStatus, Priority } from '@/lib/types';

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', className)}
      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
    >
      {meta.label}
    </span>
  );
}

interface PaymentBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function PaymentBadge({ status, className }: PaymentBadgeProps) {
  const meta = PAYMENT_META[status];
  return (
    <span
      className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', className)}
      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
    >
      {meta.label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', className)}
      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
    >
      {meta.label}
    </span>
  );
}
