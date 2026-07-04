import type { EditingProject, Lead } from '@/lib/sheets/types';

export const N8N_WEBHOOK_BASE = 'https://hogwartsautomation.app.n8n.cloud/webhook';

export const EDITORS = [
  { name: 'Deepanshu', email: 'deepanshu@hogwartsmedia.com' },
  { name: 'Shubham', email: 'shubham@hogwartsmedia.com' },
  { name: 'Gulshan', email: 'gulshan@hogwartsmedia.com' },
];

const SALES_EMAILS_BY_NAME: Record<string, string> = {
  shubham: 'shubham@hogwartsmedia.com',
};

export function isExtraRevisionNeeded(edit: EditingProject) {
  return edit.revisionCount >= edit.maxFreeRevisions && !edit.extraRevisionApproved;
}

export function findAssignedSalespersonEmail(edit: EditingProject, leads: Lead[], fallback = '') {
  const lead = leads.find((item) => item.leadId === edit.leadId);
  const assignedTo = lead?.assignedTo?.trim() ?? '';
  if (assignedTo.includes('@')) return assignedTo;
  return SALES_EMAILS_BY_NAME[assignedTo.toLowerCase()] ?? fallback;
}

export function findClientEmail(edit: EditingProject, leads: Lead[]) {
  const editEmail = edit.emailId.trim();
  if (editEmail) return editEmail;

  const lead = leads.find((item) => item.leadId === edit.leadId);
  return lead?.clientEmail.trim() ?? '';
}

export async function postWebhook(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${N8N_WEBHOOK_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${path}`);
  }

  return response;
}
