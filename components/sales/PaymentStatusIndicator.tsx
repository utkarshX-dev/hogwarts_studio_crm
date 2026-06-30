import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Lead } from '@/lib/sheets/types';
import { PAYMENT_STATUS } from '@/lib/sheets/payment-utils';
import { cn } from '@/lib/utils';

interface PaymentStatusIndicatorProps {
  lead: Lead;
  className?: string;
}

export function PaymentStatusIndicator({ lead, className }: PaymentStatusIndicatorProps) {
  const status = lead.payment?.paymentStatus?.trim();
  if (!status) return null;

  if (status === PAYMENT_STATUS.LINK_SENT) {
    return (
      <p className={cn('text-[11px] font-medium text-blue-500', className)}>
        Payment Link Sent
      </p>
    );
  }

  if (status === PAYMENT_STATUS.PENDING_VERIFICATION) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600',
          className
        )}
      >
        <AlertCircle className="h-3 w-3" />
        Screenshot Uploaded — Pending Verification
      </span>
    );
  }

  if (status === PAYMENT_STATUS.CONFIRMED) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/15 px-2 py-0.5 text-[11px] font-medium text-green-600',
          className
        )}
      >
        <CheckCircle2 className="h-3 w-3" />
        Payment Confirmed
      </span>
    );
  }

  return null;
}
