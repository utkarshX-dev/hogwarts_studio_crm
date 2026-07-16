import { NextResponse } from 'next/server';
import { fetchPaymentInstallmentsFromSheet } from '@/lib/google/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const leadId = new URL(request.url).searchParams.get('lead_id')?.trim();

  if (!leadId) {
    return NextResponse.json({ error: 'Lead ID is required', payments: [] }, { status: 400 });
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
