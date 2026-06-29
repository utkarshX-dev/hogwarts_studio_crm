import { NextResponse } from 'next/server';
import { fetchClientsFromSheet } from '@/lib/google/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const leads = await fetchClientsFromSheet();
    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Failed to fetch clients from Google Sheets:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch clients';
    return NextResponse.json({ error: message, leads: [] }, { status: 500 });
  }
}
