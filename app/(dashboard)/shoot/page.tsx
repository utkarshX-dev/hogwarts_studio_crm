import { ShootDashboard } from '@/components/shoot/ShootDashboard';
import { fetchShootsFromSheet } from '@/lib/google/sheets';
import type { Shoot } from '@/lib/sheets/types';

export const dynamic = 'force-dynamic';

async function getInitialShoots(): Promise<Shoot[]> {
  try {
    return await fetchShootsFromSheet();
  } catch (error) {
    console.error('Failed to fetch initial shoots:', error);
    return [];
  }
}

export default async function ShootPage() {
  const initialShoots = await getInitialShoots();

  return <ShootDashboard initialShoots={initialShoots} />;
}
