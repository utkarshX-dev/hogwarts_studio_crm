import type { Lead } from '@/lib/sheets/types';

export const PAYMENT_STATUS = {
  LINK_SENT: 'Payment Link Sent',
  PENDING_VERIFICATION: 'Screenshot Uploaded - Pending Verification',
  CONFIRMED: 'Payment Confirmed',
} as const;

export function isPaymentLinkSent(lead: Lead): boolean {
  if (!lead.payment) return false;

  const linkSent = lead.payment.paymentLinkSent.trim().toLowerCase() === 'true';
  const status = lead.payment.paymentStatus;

  return (
    linkSent ||
    status === PAYMENT_STATUS.LINK_SENT ||
    status === PAYMENT_STATUS.PENDING_VERIFICATION ||
    status === PAYMENT_STATUS.CONFIRMED
  );
}

export function canSendPaymentLink(lead: Lead): boolean {
  return lead.proposalAccepted && !isPaymentLinkSent(lead);
}

export function isPendingPaymentVerification(lead: Lead): boolean {
  return lead.payment?.paymentStatus === PAYMENT_STATUS.PENDING_VERIFICATION;
}

export function isPaymentConfirmed(lead: Lead): boolean {
  return lead.payment?.paymentStatus === PAYMENT_STATUS.CONFIRMED;
}

export function filterSalesLeads<T extends Lead>(
  leads: T[],
  userName: string | undefined,
  userRole: string | undefined
): T[] {
  return leads.filter(
    (lead) => lead.assignedTo === userName || userRole === 'manager'
  );
}

export function countPendingVerifications(
  leads: Lead[],
  userName: string | undefined,
  userRole: string | undefined
): number {
  return filterSalesLeads(leads, userName, userRole).filter(isPendingPaymentVerification)
    .length;
}
