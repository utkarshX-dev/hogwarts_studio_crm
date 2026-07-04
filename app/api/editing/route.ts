import { NextResponse } from 'next/server';
import { fetchEditingFromSheet } from '@/lib/google/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const editing = await fetchEditingFromSheet();
    return NextResponse.json({ editing });
  } catch (error) {
    console.error('Failed to fetch editing rows from Google Sheets:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch editing rows';
    return NextResponse.json({ error: message, editing: [] }, { status: 500 });
  }
}
