import { NextResponse } from 'next/server';
import { clearSheetsCache, fetchShootsFromSheet, fetchLeadsWithPayments, fetchEditingFromSheet } from '@/lib/google/sheets';
import { getAuthenticatedUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (new URL(request.url).searchParams.get('fresh') === '1') {
      clearSheetsCache();
    }

    const shoots = await fetchShootsFromSheet();
    let filteredShoots = shoots;

    if (user.role === 'shoot') {
      filteredShoots = shoots.filter(
        (shoot) =>
          shoot.shootMemberEmail.trim().toLowerCase() === user.email.trim().toLowerCase() ||
          shoot.shootMemberName.trim().toLowerCase() === user.name.trim().toLowerCase()
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
      filteredShoots = shoots.filter((s) => s.leadId && allowedLeadIds.has(s.leadId));
    } else if (user.role === 'editor') {
      const editingProjects = await fetchEditingFromSheet();
      const editorEdits = editingProjects.filter(
        (e) =>
          e.editorEmail.trim().toLowerCase() === user.email.trim().toLowerCase() ||
          e.editorName.trim().toLowerCase() === user.name.trim().toLowerCase()
      );
      const allowedLeadIds = new Set(editorEdits.map((e) => e.leadId));
      filteredShoots = shoots.filter((s) => s.leadId && allowedLeadIds.has(s.leadId));
    }

    return NextResponse.json({ shoots: filteredShoots });
  } catch (error) {
    console.error('Failed to fetch shoots from Google Sheets:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch shoots';
    return NextResponse.json({ error: message, shoots: [] }, { status: 500 });
  }
}
