import { NextResponse } from 'next/server';
import { fetchShootsFromSheet } from '@/lib/google/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const shoots = await fetchShootsFromSheet();
    return NextResponse.json({ shoots });
  } catch (error) {
    console.error('Failed to fetch shoots from Google Sheets:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch shoots';
    return NextResponse.json({ error: message, shoots: [] }, { status: 500 });
  }
}
