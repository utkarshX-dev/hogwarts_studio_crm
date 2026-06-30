import { NextResponse } from 'next/server';
import { appendClientToSheet, fetchLeadsWithPayments } from '@/lib/google/sheets';
import type { CreateLeadInput } from '@/lib/sheets/types';

export const dynamic = 'force-dynamic';

const SERVICE_LABELS: Record<string, string> = {
  podcast: 'Podcast',
  reel: 'Reel',
  brand_film: 'Brand Film',
  product_video: 'Product Video',
  event_coverage: 'Event Coverage',
  social_media: 'Social Media',
};

export async function GET() {
  try {
    const leads = await fetchLeadsWithPayments();
    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Failed to fetch clients from Google Sheets:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch clients';
    return NextResponse.json({ error: message, leads: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const phoneNumber = String(body.phoneNumber ?? body.contact ?? '').trim();
    const whatsapp = String(body.whatsapp ?? '').trim();
    const serviceKey = String(body.service ?? '').trim();
    const assignedTo = String(body.assignedTo ?? '').trim();
    const clientEmail = String(body.clientEmail ?? '').trim();
    const cost = String(body.cost ?? '').trim();
    const reachoutRaw = String(body.reachoutDone ?? 'no').trim().toLowerCase();
    const reachoutDone: 'yes' | 'no' = reachoutRaw === 'yes' ? 'yes' : 'no';

    if (!name) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Contact number is required' }, { status: 400 });
    }

    if (!serviceKey) {
      return NextResponse.json({ error: 'Service is required' }, { status: 400 });
    }

    if (!assignedTo) {
      return NextResponse.json({ error: 'Assign To is required' }, { status: 400 });
    }

    const input: CreateLeadInput = {
      name,
      phoneNumber,
      whatsapp: whatsapp || undefined,
      servicePitched: SERVICE_LABELS[serviceKey] ?? serviceKey,
      assignedTo,
      clientEmail: clientEmail || undefined,
      cost: cost || undefined,
      reachoutDone,
    };

    const lead = await appendClientToSheet(input);
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Failed to create client in Google Sheets:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
