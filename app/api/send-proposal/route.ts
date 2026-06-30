import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PROPOSAL_WEBHOOK_URL =
  process.env.N8N_SEND_PROPOSAL_WEBHOOK_URL ??
  'https://hogwartsautomation.app.n8n.cloud/webhook/send-proposal';

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
      client_phone: String(body.client_phone ?? '').trim(),
      service_pitched: String(body.service_pitched ?? '').trim(),
      cost: String(body.cost ?? '').trim(),
      salesperson_name: String(body.salesperson_name ?? '').trim(),
    };

    const response = await fetch(PROPOSAL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('n8n send-proposal webhook failed:', response.status, text);
      return NextResponse.json(
        { error: 'Failed to send proposal via automation' },
        { status: 502 }
      );
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to proxy send-proposal webhook:', error);
    const message = error instanceof Error ? error.message : 'Failed to send proposal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
