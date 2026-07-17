import { NextResponse } from 'next/server';
import { fetchEditingFromSheet, fetchRevisionsFromSheet, fetchLeadsWithPayments, fetchShootsFromSheet, type RevisionEntry } from '@/lib/google/sheets';
import { getAuthenticatedUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

function timestampValue(timestamp: string): number {
  const parsed = Date.parse(timestamp);
  if (!Number.isNaN(parsed)) return parsed;

  const match = timestamp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
  if (!match) return Number.NEGATIVE_INFINITY;

  const [, day, month, year, rawHours = '0', minutes = '0', seconds = '0', meridiem] = match;
  let hours = Number(rawHours);
  if (meridiem?.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (meridiem?.toUpperCase() === 'AM' && hours === 12) hours = 0;

  return new Date(Number(year), Number(month) - 1, Number(day), hours, Number(minutes), Number(seconds)).getTime();
}

function latestRevisionByProject(revisions: RevisionEntry[]) {
  const latest = new Map<string, RevisionEntry>();

  for (const revision of revisions) {
    const current = latest.get(revision.projectId);
    if (!current || timestampValue(revision.timestamp) >= timestampValue(current.timestamp)) {
      latest.set(revision.projectId, revision);
    }
  }

  return latest;
}

export async function GET() {
  try {
    const user = getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [editing, revisions] = await Promise.all([
      fetchEditingFromSheet(),
      fetchRevisionsFromSheet(),
    ]);

    let filteredEditing = editing;

    if (user.role === 'editor') {
      filteredEditing = editing.filter(
        (edit) =>
          edit.editorEmail.trim().toLowerCase() === user.email.trim().toLowerCase() ||
          edit.editorName.trim().toLowerCase() === user.name.trim().toLowerCase()
      );
    } else if (user.role === 'sales') {
      const leads = await fetchLeadsWithPayments();
      const salesLeads = leads.filter(
        (lead) =>
          lead.assignedTo.trim().toLowerCase() === user.name.trim().toLowerCase() ||
          lead.assignedTo.trim().toLowerCase() === user.email.trim().toLowerCase() ||
          lead.assignedTo.trim().toLowerCase() === user.username.trim().toLowerCase()
      );
      const allowedLeadIds = new Set(salesLeads.map((l) => l.leadId));
      filteredEditing = editing.filter((e) => e.leadId && allowedLeadIds.has(e.leadId));
    } else if (user.role === 'shoot') {
      const shoots = await fetchShootsFromSheet();
      const shootCrew = shoots.filter(
        (shoot) =>
          shoot.shootMemberEmail.trim().toLowerCase() === user.email.trim().toLowerCase() ||
          shoot.shootMemberName.trim().toLowerCase() === user.name.trim().toLowerCase()
      );
      const allowedLeadIds = new Set(shootCrew.map((s) => s.leadId));
      filteredEditing = editing.filter((e) => e.leadId && allowedLeadIds.has(e.leadId));
    }

    const revisionsByProject = latestRevisionByProject(revisions);
    const editingWithRevisionFeedback = filteredEditing.map((edit) => ({
      ...edit,
      revisionFeedback: revisionsByProject.get(edit.editId)?.feedback ?? '',
    }));

    return NextResponse.json({ editing: editingWithRevisionFeedback });
  } catch (error) {
    console.error('Failed to fetch editing rows from Google Sheets:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch editing rows';
    return NextResponse.json({ error: message, editing: [] }, { status: 500 });
  }
}
