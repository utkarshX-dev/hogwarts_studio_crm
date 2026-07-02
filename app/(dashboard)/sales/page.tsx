import { SalesDashboard } from '@/components/sales/SalesDashboard';
import { fetchLeadsWithPayments, fetchShootsFromSheet } from '@/lib/google/sheets';
import type { Lead, Shoot } from '@/lib/sheets/types';

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

export default async function SalesPage() {
  const [initialLeads, initialShoots] = await Promise.all([
    getInitialLeads(),
    getInitialShoots(),
  ]);

  return <SalesDashboard initialLeads={initialLeads} initialShoots={initialShoots} />;
}
