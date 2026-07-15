import { google } from 'googleapis';
import type { CreateLeadInput, EditingProject, Lead, Payment, Shoot } from '@/lib/sheets/types';

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID ??
  '1rZQ7OboQX3P83FprGJ7zIqpIjW4oUggIik96JDQzPgU';

const CLIENTS_SHEET = 'Clients';
const PAYMENTS_SHEET = 'Payments';
const SHOOT_SHEET = 'Shoot';
const EDITING_SHEET = 'Editing';
const REVISIONS_SHEET = 'Revisions';
// Clients has 31 columns (A:AE). Keeping both ranges aligned with the whole
// table is essential: Google Sheets uses the supplied range to find the table
// it appends to. A shorter range caused new rows to be appended from column V
// (`teaser_edit`) rather than from column A (`lead_id`).
const CLIENTS_READ_RANGE = `${CLIENTS_SHEET}!A2:AE`;
const PAYMENTS_READ_RANGE = `${PAYMENTS_SHEET}!A2:K`;
const SHOOT_READ_RANGE = `${SHOOT_SHEET}!A2:AB`;
const EDITING_READ_RANGE = `${EDITING_SHEET}!A2:AH`;
const REVISIONS_READ_RANGE = `${REVISIONS_SHEET}!A2:J`;

export interface RevisionEntry {
  projectId: string;
  feedback: string;
  timestamp: string;
}

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
    podcastDraft: row[15]?.trim() ?? '',
    podcastEdit: row[16]?.trim() ?? '',
    reelDraft: row[17]?.trim() ?? '',
    reelEdit: row[18]?.trim() ?? '',
    longFormatVideo: row[19]?.trim() ?? '',
    // The Clients sheet has `teaser_edit` and `thumbnail_edit`, not separate
    // teaser-demo/final-teaser columns. Keep the legacy aliases populated for
    // existing dashboards while exposing the actual sheet fields as well.
    teaserEdit: row[20]?.trim() ?? '',
    teaserDemo: row[20]?.trim() ?? '',
    teaser: row[20]?.trim() ?? '',
    thumbnailEdit: row[21]?.trim() ?? '',
    thumbnail: row[21]?.trim() ?? '',
    serviceNotes: row[22]?.trim() ?? '',
    camera: row[23]?.trim() ?? '',
    recordTime: row[24]?.trim() ?? '',
    studioTime: row[25]?.trim() ?? '',
    remainingAmount: row[26]?.trim() ?? '',
    shortFormatVideo: row[27]?.trim() ?? '',
    longFormatDuration: row[28]?.trim() ?? '',
    shortFormatDuration: row[29]?.trim() ?? '',
    additionalNotes: row[30]?.trim() ?? '',
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

function rowToShoot(row: string[]): Shoot | null {
  const shootId = row[0]?.trim();
  const leadId = row[1]?.trim();

  if (!shootId && !leadId) return null;

  const id = shootId || leadId;
  const clientName = row[2]?.trim() ?? '';
  const contactNum = row[3]?.trim() ?? '';

  return {
    id,
    shootId: shootId || leadId,
    leadId,
    clientName,
    contactNum,
    emailId: row[4]?.trim() ?? '',
    shootDate: row[5]?.trim() ?? '',
    shootStartTime: row[6]?.trim() ?? '',
    shootEndTime: row[7]?.trim() ?? '',
    camera: row[8]?.trim() ?? '',
    teleprompter: row[9]?.trim() ?? '',
    totalHours: row[10]?.trim() ?? '',
    assignedTo: row[11]?.trim() ?? '',
    bts: row[12]?.trim() ?? '',
    shootMemberName: row[13]?.trim() ?? '',
    shootMemberEmail: row[14]?.trim() ?? '',
    dataLink: row[15]?.trim() ?? '',
    driveLinkUploaded: row[16]?.trim() ?? 'false',
    createdAt: row[17]?.trim() ?? '',
    testimonials: row[18]?.trim() ?? '',
    recordTime: row[19]?.trim() ?? '',
    studioTime: row[20]?.trim() ?? '',
    extraCamera: row[21]?.trim() ?? '',
    extraTeleprompter: row[22]?.trim() ?? '',
    extraDurationHours: row[23]?.trim() ?? '',
    additionalCost: row[24]?.trim() ?? '',
    shootNotes: row[25]?.trim() ?? '',
    editedByShootTeam: row[26]?.trim() ?? 'false',
    searchText: `${clientName} ${contactNum} ${leadId}`.toLowerCase(),
  };
}

function parseNumber(value: string | undefined, fallback = 0): number {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined): boolean {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

function rowToEditingProject(row: string[]): EditingProject | null {
  const editId = row[0]?.trim();
  const shootId = row[1]?.trim();
  const leadId = row[2]?.trim();

  if (!editId && !shootId && !leadId) return null;

  const id = editId || shootId || leadId;
  const clientName = row[3]?.trim() ?? '';
  const editorName = row[20]?.trim() ?? '';
  const serviceType = row[22]?.trim() ?? '';

  return {
    id,
    editId: editId || id,
    shootId,
    leadId,
    clientName,
    month: row[4]?.trim() ?? '',
    editStartDate: row[5]?.trim() ?? '',
    editDeliveryDate: row[6]?.trim() ?? '',
    podcastDraft: row[7]?.trim() ?? '',
    podcastEdit: row[8]?.trim() ?? '',
    longFormatVideo: row[9]?.trim() ?? '',
    reelDraft: row[10]?.trim() ?? '',
    reel: row[11]?.trim() ?? '',
    teaserDemo: row[12]?.trim() ?? '',
    teaser: row[13]?.trim() ?? '',
    thumbnail: row[14]?.trim() ?? '',
    dataLink: row[15]?.trim() ?? '',
    status: row[16]?.trim() ?? '',
    totalService: row[17]?.trim() ?? '',
    emailId: row[18]?.trim() ?? '',
    handoverToClient: row[19]?.trim() ?? '',
    editorName,
    editorEmail: row[21]?.trim() ?? '',
    serviceType,
    revisionCount: parseNumber(row[23]),
    maxFreeRevisions: parseNumber(row[24], 2),
    extraRevisionApproved: parseBoolean(row[25]),
    extraRevisionCost: row[26]?.trim() ?? '',
    currentDraftLink: row[27]?.trim() ?? '',
    assignedAt: row[28]?.trim() ?? '',
    deadlineAt: row[29]?.trim() ?? '',
    deadlineNotified: row[30]?.trim() ?? '',
    finalDelivered: parseBoolean(row[31]),
    searchText: `${clientName} ${editorName} ${serviceType} ${leadId}`.toLowerCase(),
  };
}

function rowToRevisionEntry(row: string[]): RevisionEntry | null {
  const projectId = row[0]?.trim();
  if (!projectId) return null;

  return {
    projectId,
    feedback: row[4]?.trim() ?? '',
    timestamp: row[9]?.trim() ?? '',
  };
}

function joinLeadsWithPayments(leads: Lead[], payments: Payment[]): Lead[] {
  const paymentByLeadId = new Map<string, Payment>();
  for (const payment of payments) {
    paymentByLeadId.set(payment.leadId, payment);
  }

  return leads.map((lead) => {
    const payment = paymentByLeadId.get(lead.leadId) ?? null;
    const payment_status = payment?.paymentStatus?.trim() || undefined;

    return {
      ...lead,
      payment,
      payment_status,
    };
  });
}

function sortLeadsNewestFirst(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => b.serialNo - a.serialNo);
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
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
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
    input.podcastDraft?.trim() ?? '',
    input.podcastEdit?.trim() ?? '',
    input.reelDraft?.trim() ?? '',
    input.reelEdit?.trim() ?? '',
    input.longFormatVideo?.trim() ?? '',
    input.teaserEdit?.trim() ?? input.teaser?.trim() ?? input.teaserDemo?.trim() ?? '',
    input.thumbnailEdit?.trim() ?? input.thumbnail?.trim() ?? '',
    input.serviceNotes?.trim() ?? '',
    input.camera?.trim() ?? '',
    input.recordTime?.trim() ?? '',
    input.studioTime?.trim() ?? '',
    input.remainingAmount?.trim() ?? '',
    input.shortFormatVideo?.trim() ?? '',
    input.longFormatDuration?.trim() ?? '',
    input.shortFormatDuration?.trim() ?? '',
    input.additionalNotes?.trim() ?? '',
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

export async function fetchShootsFromSheet(): Promise<Shoot[]> {
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHOOT_READ_RANGE,
  });

  const rows = response.data.values ?? [];

  return rows
    .map((row) => rowToShoot(row as string[]))
    .filter((shoot): shoot is Shoot => shoot !== null);
}

export async function fetchEditingFromSheet(): Promise<EditingProject[]> {
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: EDITING_READ_RANGE,
  });

  const rows = response.data.values ?? [];

  return rows
    .map((row) => rowToEditingProject(row as string[]))
    .filter((project): project is EditingProject => project !== null);
}

export async function fetchRevisionsFromSheet(): Promise<RevisionEntry[]> {
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: REVISIONS_READ_RANGE,
  });

  const rows = response.data.values ?? [];

  return rows
    .map((row) => rowToRevisionEntry(row as string[]))
    .filter((revision): revision is RevisionEntry => revision !== null);
}

export async function fetchLeadsWithPayments(): Promise<Lead[]> {
  const [leads, payments] = await Promise.all([
    fetchClientsFromSheet(),
    fetchPaymentsFromSheet(),
  ]);

  return sortLeadsNewestFirst(joinLeadsWithPayments(leads, payments));
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

async function getNextClientRow(sheets: ReturnType<typeof getSheetsClient>): Promise<number> {
  // Do not use values.append here. Google Sheets infers a "table" from the
  // contiguous filled cells, and the old malformed rows start at column V.
  // Reading the complete grid gives us the real last occupied row instead.
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${CLIENTS_SHEET}!A:AE`,
  });

  // Row 1 is the header. `values` retains rows up to the last row that has a
  // value anywhere in A:AE, including rows whose first populated cell is V.
  return Math.max((response.data.values ?? []).length + 1, 2);
}

export async function appendClientToSheet(input: CreateLeadInput): Promise<Lead> {
  const sheets = getSheetsClient();
  const leadId = generateLeadId();
  const row = buildLeadRow(input, leadId);
  const nextRow = await getNextClientRow(sheets);

  // Write to a fully-qualified row, starting at A. This deliberately bypasses
  // the append endpoint's table-detection behaviour.
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${CLIENTS_SHEET}!A${nextRow}:AE${nextRow}`,
    valueInputOption: 'USER_ENTERED',
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
    podcastDraft: input.podcastDraft?.trim() ?? '',
    podcastEdit: input.podcastEdit?.trim() ?? '',
    reelDraft: input.reelDraft?.trim() ?? '',
    reelEdit: input.reelEdit?.trim() ?? '',
    longFormatVideo: input.longFormatVideo?.trim() ?? '',
    teaserEdit: input.teaserEdit?.trim() ?? input.teaser?.trim() ?? input.teaserDemo?.trim() ?? '',
    teaserDemo: input.teaserEdit?.trim() ?? input.teaser?.trim() ?? input.teaserDemo?.trim() ?? '',
    teaser: input.teaserEdit?.trim() ?? input.teaser?.trim() ?? input.teaserDemo?.trim() ?? '',
    thumbnailEdit: input.thumbnailEdit?.trim() ?? input.thumbnail?.trim() ?? '',
    thumbnail: input.thumbnailEdit?.trim() ?? input.thumbnail?.trim() ?? '',
    serviceNotes: input.serviceNotes?.trim() ?? '',
    camera: input.camera?.trim() ?? '',
    recordTime: input.recordTime?.trim() ?? '',
    studioTime: input.studioTime?.trim() ?? '',
    remainingAmount: input.remainingAmount?.trim() ?? '',
    shortFormatVideo: input.shortFormatVideo?.trim() ?? '',
    longFormatDuration: input.longFormatDuration?.trim() ?? '',
    shortFormatDuration: input.shortFormatDuration?.trim() ?? '',
    additionalNotes: input.additionalNotes?.trim() ?? '',
    serialNo: existingLeads.length + 1,
    searchText: `${input.name.trim()} ${input.phoneNumber.trim()}`.toLowerCase(),
    payment: null,
  };
}
