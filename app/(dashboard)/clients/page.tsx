'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Building2, Wallet, TrendingUp, Loader2 } from 'lucide-react';
import { LeadStatusBadge } from '@/components/shared/Badges';
import { formatINR } from '@/lib/formatter';
import { ClientsShimmer } from '@/components/shared/ShimmerLoader';

export default function ClientsPage() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [shoots, setShoots] = useState<any[]>([]);
  const [editing, setEditing] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const [clientsRes, realtimeRes, shootsRes, editingRes] = await Promise.all([
          fetch('/api/clients', { cache: 'no-store' }),
          fetch('/api/realtime-data', { cache: 'no-store' }),
          fetch('/api/shoots', { cache: 'no-store' }),
          fetch('/api/editing', { cache: 'no-store' }),
        ]);

        const [clientsJson, realtimeJson, shootsJson, editingJson] = await Promise.all([
          clientsRes.json(),
          realtimeRes.json(),
          shootsRes.json(),
          editingRes.json(),
        ]);

        if (!mounted) return;

        if (clientsRes.ok) setLeads(clientsJson.leads ?? []);
        if (realtimeRes.ok) setInvoices(realtimeJson.invoices ?? []);
        if (shootsRes.ok) setShoots(shootsJson.shoots ?? []);
        if (editingRes.ok) setEditing(editingJson.editing ?? []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching clients page data:', error);
      }
    }
    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <ClientsShimmer />;
  }

  // 1. Stats calculation
  const totalClients = leads.filter((l) => l.proposalAccepted).length;
  const activeClients = leads.filter((l) => l.proposalAccepted && !['closed', 'delivered'].includes((l.status || '').toLowerCase())).length;
  const totalRevenue = invoices.filter((i) => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const leadsCount = leads.filter((l) => !l.proposalAccepted).length;

  // 2. Clients list mapping
  const clientsData = leads.map((lead) => {
    const clientInvoices = invoices.filter((i) => i.projectId === lead.leadId && i.status === 'paid');
    const clientRevenue = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    const clientShoots = shoots.filter((s) => s.leadId === lead.leadId).length;
    const clientEdits = editing.filter((e) => e.leadId === lead.leadId).length;
    const totalProjects = Math.max(clientShoots, clientEdits);

    return {
      id: lead.leadId,
      name: lead.name || 'Unknown Client',
      contact: lead.phoneNumber || '—',
      email: lead.clientEmail || '—',
      service: lead.servicePitched || '—',
      totalProjects,
      totalRevenue: clientRevenue,
      status: lead.status || 'New Lead',
      whatsapp: lead.whatsapp || '',
    };
  });

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Client / Company',
      sortable: true,
      sortValue: (c) => c.name,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary border border-border text-xs">
              {c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.email}</p>
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
          {c.whatsapp && <p className="text-xs text-muted-foreground">WA: {c.whatsapp}</p>}
        </div>
      ),
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
      cell: (c) => <LeadStatusBadge status={c.status} />,
    },
  ];

  return (
    <div>
      <PageHeader title="Clients" description="B2B client directory and relationship history" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Total Clients" value={totalClients} icon={Users} />
        <StatCard title="Active" value={activeClients} icon={Building2} />
        <StatCard title="Total Revenue" value={formatINR(totalRevenue)} icon={Wallet} />
        <StatCard title="Leads" value={leadsCount} icon={TrendingUp} />
      </div>

      <DataTable
        data={clientsData}
        columns={columns}
        searchKeys={['name', 'email', 'contact']}
        searchPlaceholder="Search clients..."
        onRowClick={(c) => {
          const clientProjects = editing.filter((p) => p.leadId === c.id);
          console.log('Client projects:', clientProjects);
        }}
      />
    </div>
  );
}
