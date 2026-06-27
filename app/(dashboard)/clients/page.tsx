'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Building2, Wallet, TrendingUp } from 'lucide-react';
import { CLIENTS, PROJECTS } from '@/lib/mock-data';
import { formatINR, formatDate } from '@/lib/formatter';
import type { Client } from '@/lib/types';

const statusColor: Record<string, { color: string; bg: string; border: string }> = {
  active: { color: '#3FB950', bg: 'rgba(63,185,80,0.12)', border: 'rgba(63,185,80,0.3)' },
  inactive: { color: '#6E7681', bg: 'rgba(110,118,129,0.12)', border: 'rgba(110,118,129,0.3)' },
  lead: { color: '#58A6FF', bg: 'rgba(88,166,255,0.12)', border: 'rgba(88,166,255,0.3)' },
};

export default function ClientsPage() {
  const totalClients = CLIENTS.length;
  const activeClients = CLIENTS.filter((c) => c.status === 'active').length;
  const totalRevenue = CLIENTS.reduce((s, c) => s + c.totalRevenue, 0);
  const leads = CLIENTS.filter((c) => c.status === 'lead').length;

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: 'Client',
      sortable: true,
      sortValue: (c) => c.company,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary border border-border text-xs">
              {c.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{c.company}</p>
            <p className="text-xs text-muted-foreground">{c.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (c) => (
        <div>
          <p className="text-sm">{c.contact}</p>
          <p className="text-xs text-muted-foreground">{c.email}</p>
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'city',
      header: 'City',
      cell: (c) => <span className="text-sm">{c.city}</span>,
      hideOnMobile: true,
    },
    {
      key: 'projects',
      header: 'Projects',
      sortable: true,
      sortValue: (c) => c.totalProjects,
      cell: (c) => <span className="tabular-nums">{c.totalProjects}</span>,
      hideOnMobile: true,
    },
    {
      key: 'revenue',
      header: 'Revenue',
      sortable: true,
      sortValue: (c) => c.totalRevenue,
      cell: (c) => <span className="tabular-nums font-medium">{formatINR(c.totalRevenue)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (c) => {
        const m = statusColor[c.status];
        return (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium" style={{ color: m.color, backgroundColor: m.bg, borderColor: m.border }}>
            {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Clients" description="B2B client directory and relationship history" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Total Clients" value={totalClients} icon={Users} />
        <StatCard title="Active" value={activeClients} icon={Building2} />
        <StatCard title="Total Revenue" value={formatINR(totalRevenue)} icon={Wallet} />
        <StatCard title="Leads" value={leads} icon={TrendingUp} />
      </div>

      <DataTable
        data={CLIENTS}
        columns={columns}
        searchKeys={['company', 'name', 'email', 'city']}
        searchPlaceholder="Search clients..."
        onRowClick={(c) => {
          const projects = PROJECTS.filter((p) => p.client.id === c.id);
          console.log('Client projects:', projects);
        }}
      />
    </div>
  );
}
