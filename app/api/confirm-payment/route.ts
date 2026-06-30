import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CONFIRM_PAYMENT_WEBHOOK_URL =
  process.env.N8N_CONFIRM_PAYMENT_WEBHOOK_URL ??
  'https://hogwartsautomation.app.n8n.cloud/webhook/confirm-payment';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const lead_id = String(body.lead_id ?? '').trim();
    const verified_by = String(body.verified_by ?? '').trim();

    if (!lead_id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    if (!verified_by) {
      return NextResponse.json({ error: 'Verifier name is required' }, { status: 400 });
    }

    const payload = { lead_id, verified_by };

    const response = await fetch(CONFIRM_PAYMENT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('n8n confirm-payment webhook failed:', response.status, text);
      return NextResponse.json(
        { error: 'Failed to confirm payment via automation' },
        { status: 502 }
      );
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to proxy confirm-payment webhook:', error);
    const message = error instanceof Error ? error.message : 'Failed to confirm payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
