import { NextResponse } from 'next/server';
import { fetchEditingFromSheet, fetchRevisionsFromSheet, type RevisionEntry } from '@/lib/google/sheets';

export const dynamic = 'force-dynamic';

function timestampValue(timestamp: string): number {
  const parsed = Date.parse(timestamp);
  if (!Number.isNaN(parsed)) return parsed;

  // Google Sheets may return dates formatted as DD/MM/YYYY instead of ISO 8601.
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
    const [editing, revisions] = await Promise.all([
      fetchEditingFromSheet(),
      fetchRevisionsFromSheet(),
    ]);
    const revisionsByProject = latestRevisionByProject(revisions);
    const editingWithRevisionFeedback = editing.map((edit) => ({
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
