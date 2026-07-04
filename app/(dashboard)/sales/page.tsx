import { SalesDashboard } from '@/components/sales/SalesDashboard';
import { fetchEditingFromSheet, fetchLeadsWithPayments, fetchShootsFromSheet } from '@/lib/google/sheets';
import type { EditingProject, Lead, Shoot } from '@/lib/sheets/types';

export const dynamic = 'force-dynamic';

async function getInitialLeads(): Promise<Lead[]> {
  try {
    return await fetchLeadsWithPayments();
  } catch (error) {
    console.error('Failed to fetch initial leads:', error);
    return [];
  }
}

async function getInitialShoots(): Promise<Shoot[]> {
  try {
    return await fetchShootsFromSheet();
  } catch (error) {
    console.error('Failed to fetch initial shoots:', error);
    return [];
  }
}

async function getInitialEditing(): Promise<EditingProject[]> {
  try {
    return await fetchEditingFromSheet();
  } catch (error) {
    console.error('Failed to fetch initial editing rows:', error);
    return [];
  }
}

export default async function SalesPage() {
  const [initialLeads, initialShoots, initialEditing] = await Promise.all([
    getInitialLeads(),
    getInitialShoots(),
    getInitialEditing(),
  ]);

  return (
    <SalesDashboard
      initialLeads={initialLeads}
      initialShoots={initialShoots}
      initialEditing={initialEditing}
    />
  );
}
