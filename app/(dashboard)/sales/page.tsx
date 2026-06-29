import { SalesDashboard } from '@/components/sales/SalesDashboard';
import { fetchClientsFromSheet } from '@/lib/google/sheets';
import type { Lead } from '@/lib/sheets/types';

export const dynamic = 'force-dynamic';

async function getInitialLeads(): Promise<Lead[]> {
  try {
    return await fetchClientsFromSheet();
  } catch (error) {
    console.error('Failed to fetch initial leads:', error);
    return [];
  }
}

export default async function SalesPage() {
  const initialLeads = await getInitialLeads();

  return <SalesDashboard initialLeads={initialLeads} />;
}
