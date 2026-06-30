import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PAYMENT_LINK_WEBHOOK_URL =
  process.env.N8N_SEND_PAYMENT_LINK_WEBHOOK_URL ??
  'https://hogwartsautomation.app.n8n.cloud/webhook/send-payment-link';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const lead_id = String(body.lead_id ?? '').trim();
    const client_email = String(body.client_email ?? '').trim();

    if (!lead_id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    if (!client_email) {
      return NextResponse.json({ error: 'Client email is required' }, { status: 400 });
    }

    const payload = {
      lead_id,
      client_name: String(body.client_name ?? '').trim(),
      client_email,
      cost: String(body.cost ?? '').trim(),
      salesperson_name: String(body.salesperson_name ?? '').trim(),
      salesperson_email: String(body.salesperson_email ?? '').trim(),
    };

    const response = await fetch(PAYMENT_LINK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('n8n send-payment-link webhook failed:', response.status, text);
      return NextResponse.json(
        { error: 'Failed to send payment link via automation' },
        { status: 502 }
      );
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to proxy send-payment-link webhook:', error);
    const message = error instanceof Error ? error.message : 'Failed to send payment link';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
