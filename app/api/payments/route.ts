import { NextResponse } from 'next/server';
import { fetchPaymentInstallmentsFromSheet, fetchLeadsWithPayments, fetchEditingFromSheet, fetchShootsFromSheet } from '@/lib/google/sheets';
import { getAuthenticatedUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', payments: [] }, { status: 401 });
  }

  const leadId = new URL(request.url).searchParams.get('lead_id')?.trim();

  if (!leadId) {
    return NextResponse.json({ error: 'Lead ID is required', payments: [] }, { status: 400 });
  }

  // Enforce role-based data isolation
  if (user.role === 'sales') {
    const leads = await fetchLeadsWithPayments();
    const isAssigned = leads.some(
      (l) =>
        l.leadId === leadId &&
        (l.assignedTo.trim().toLowerCase() === user.name.trim().toLowerCase() ||
          l.assignedTo.trim().toLowerCase() === user.email.trim().toLowerCase() ||
          l.assignedTo.trim().toLowerCase() === user.username.trim().toLowerCase())
    );
    if (!isAssigned) {
      return NextResponse.json({ error: 'Forbidden', payments: [] }, { status: 403 });
    }
  } else if (user.role === 'editor') {
    const editing = await fetchEditingFromSheet();
    const isAssigned = editing.some(
      (e) =>
        e.leadId === leadId &&
        (e.editorEmail.trim().toLowerCase() === user.email.trim().toLowerCase() ||
          e.editorName.trim().toLowerCase() === user.name.trim().toLowerCase())
    );
    if (!isAssigned) {
      return NextResponse.json({ error: 'Forbidden', payments: [] }, { status: 403 });
    }
  } else if (user.role === 'shoot') {
    const shoots = await fetchShootsFromSheet();
    const isAssigned = shoots.some(
      (s) =>
        s.leadId === leadId &&
        (s.shootMemberEmail.trim().toLowerCase() === user.email.trim().toLowerCase() ||
          s.shootMemberName.trim().toLowerCase() === user.name.trim().toLowerCase())
    );
    if (!isAssigned) {
      return NextResponse.json({ error: 'Forbidden', payments: [] }, { status: 403 });
    }
  }

  try {
    const payments = await fetchPaymentInstallmentsFromSheet(leadId);
    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Failed to fetch payments from Google Sheets:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json({ error: message, payments: [] }, { status: 500 });
  }
}
