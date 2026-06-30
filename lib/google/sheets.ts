import { google } from 'googleapis';
import type { CreateLeadInput, Lead, Payment } from '@/lib/sheets/types';

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
  '1rZQ7OboQX3P83FprGJ7zIqpIjW4oUggIik96JDQzPgU';

const CLIENTS_SHEET = 'Clients';
const PAYMENTS_SHEET = 'Payments';
const CLIENTS_READ_RANGE = `${CLIENTS_SHEET}!A2:O`;
const CLIENTS_APPEND_RANGE = `${CLIENTS_SHEET}!A:O`;
const PAYMENTS_READ_RANGE = `${PAYMENTS_SHEET}!A2:K`;

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function parseProposalAccepted(value: string | undefined): boolean {
  if (!value) return false;
  return value.trim().toLowerCase() === 'true';
}

function rowToLead(row: string[], index: number): Lead | null {
  const leadId = row[0]?.trim();
  if (!leadId) return null;

  const name = row[6]?.trim() ?? '';
  const phoneNumber = row[1]?.trim() ?? '';

  return {
    id: leadId,
    leadId,
    phoneNumber,
    date: row[2]?.trim() ?? '',
    adRefCode: row[3]?.trim() ?? '',
    source: row[4]?.trim() ?? '',
    assignedTo: row[5]?.trim() ?? '',
    name,
    reachoutDone: row[7]?.trim() ?? '',
    servicePitched: row[8]?.trim() ?? '',
    cost: row[9]?.trim() ?? '',
    status: row[10]?.trim() ?? '',
    clientEmail: row[11]?.trim() ?? '',
    proposalSent: row[12]?.trim() ?? '',
    proposalAccepted: parseProposalAccepted(row[13]),
    proposalSentAt: row[14]?.trim() ?? '',
    serialNo: index + 1,
    searchText: `${name} ${phoneNumber}`.toLowerCase(),
    payment: null,
  };
}

function rowToPayment(row: string[]): Payment | null {
  const leadId = row[1]?.trim();
  if (!leadId) return null;

  return {
    paymentId: row[0]?.trim() ?? '',
    leadId,
    clientName: row[2]?.trim() ?? '',
    amount: row[3]?.trim() ?? '',
    paymentLinkSent: row[4]?.trim() ?? '',
    paymentLinkSentAt: row[5]?.trim() ?? '',
    screenshotUrl: row[6]?.trim() ?? '',
    utrNumber: row[7]?.trim() ?? '',
    paymentStatus: row[8]?.trim() ?? '',
    verifiedBy: row[9]?.trim() ?? '',
    verifiedAt: row[10]?.trim() ?? '',
  };
}

function joinLeadsWithPayments(leads: Lead[], payments: Payment[]): Lead[] {
  const paymentByLeadId = new Map<string, Payment>();
  for (const payment of payments) {
    paymentByLeadId.set(payment.leadId, payment);
  }

  return leads.map((lead) => ({
    ...lead,
    payment: paymentByLeadId.get(lead.leadId) ?? null,
  }));
}

function getAuthClient() {
  const email =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ??
    'hogwarts-automation@hogwarts-automation.iam.gserviceaccount.com';
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!privateKey) {
    throw new Error(
      'GOOGLE_PRIVATE_KEY is not configured. Add your service account private key to .env.local'
    );
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: [SHEETS_SCOPE],
  });
}

function getSheetsClient() {
  const auth = getAuthClient();
  return google.sheets({ version: 'v4', auth });
}

function generateLeadId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HL-${timestamp}-${random}`;
}

function formatLeadDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function buildLeadRow(input: CreateLeadInput, leadId: string): string[] {
  return [
    leadId,
    input.phoneNumber.trim(),
    formatLeadDate(new Date()),
    input.whatsapp?.trim() ?? '',
    'Manual Entry',
    input.assignedTo.trim(),
    input.name.trim(),
    input.reachoutDone,
    input.servicePitched.trim(),
    input.cost?.trim() ?? '',
    'New Lead',
    input.clientEmail?.trim() ?? '',
    'false',
    'false',
    '',
  ];
}

export async function fetchPaymentsFromSheet(): Promise<Payment[]> {
  try {
    const sheets = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: PAYMENTS_READ_RANGE,
    });

    const rows = response.data.values ?? [];

    return rows
      .map((row) => rowToPayment(row as string[]))
      .filter((payment): payment is Payment => payment !== null);
  } catch (error) {
    console.error('Failed to fetch payments from Google Sheets:', error);
    return [];
  }
}

export async function fetchLeadsWithPayments(): Promise<Lead[]> {
  const [leads, payments] = await Promise.all([
    fetchClientsFromSheet(),
    fetchPaymentsFromSheet(),
  ]);

  return joinLeadsWithPayments(leads, payments);
}

export async function fetchClientsFromSheet(): Promise<Lead[]> {
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: CLIENTS_READ_RANGE,
  });

  const rows = response.data.values ?? [];

  return rows
    .map((row, index) => rowToLead(row as string[], index))
    .filter((lead): lead is Lead => lead !== null);
}

export async function appendClientToSheet(input: CreateLeadInput): Promise<Lead> {
  const sheets = getSheetsClient();
  const leadId = generateLeadId();
  const row = buildLeadRow(input, leadId);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: CLIENTS_APPEND_RANGE,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row],
    },
  });

  const existingLeads = await fetchLeadsWithPayments();
  const createdLead = existingLeads.find((lead) => lead.leadId === leadId);

  if (createdLead) {
    return createdLead;
  }

  return {
    id: leadId,
    leadId,
    phoneNumber: input.phoneNumber.trim(),
    date: row[2],
    adRefCode: row[3],
    source: row[4],
    assignedTo: input.assignedTo.trim(),
    name: input.name.trim(),
    reachoutDone: input.reachoutDone,
    servicePitched: input.servicePitched.trim(),
    cost: input.cost?.trim() ?? '',
    status: 'New Lead',
    clientEmail: input.clientEmail?.trim() ?? '',
    proposalSent: 'false',
    proposalAccepted: false,
    proposalSentAt: '',
    serialNo: existingLeads.length + 1,
    searchText: `${input.name.trim()} ${input.phoneNumber.trim()}`.toLowerCase(),
    payment: null,
  };
}
