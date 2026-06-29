import { google } from 'googleapis';
import type { Lead } from '@/lib/sheets/types';

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
  '1rZQ7OboQX3P83FprGJ7zIqpIjW4oUggIik96JDQzPgU';

const CLIENTS_RANGE = 'Clients!A2:O';

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
  };
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
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

export async function fetchClientsFromSheet(): Promise<Lead[]> {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: CLIENTS_RANGE,
  });

  const rows = response.data.values ?? [];

  return rows
    .map((row, index) => rowToLead(row as string[], index))
    .filter((lead): lead is Lead => lead !== null);
}
