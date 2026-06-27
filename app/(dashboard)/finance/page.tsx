'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { PaymentBadge } from '@/components/shared/Badges';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Wallet, TrendingUp, AlertCircle, FileText, Send } from 'lucide-react';
import { INVOICES } from '@/lib/mock-data';
import { formatINR, formatDate, titleCase } from '@/lib/formatter';
import { useWorkflow } from '@/hooks/use-workflow';
import { useAuth } from '@/lib/auth-context';
import type { Invoice } from '@/lib/types';
import { toast } from 'sonner';

export default function FinancePage() {
  const { user } = useAuth();
  const { triggerWorkflow, triggering } = useWorkflow();

  const totalCollected = INVOICES.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const pending = INVOICES.filter((i) => i.status === 'unpaid' || i.status === 'partial').reduce((s, i) => s + i.amount, 0);
  const overdue = INVOICES.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
  const totalInvoices = INVOICES.length;

  const sendLink = async (inv: Invoice) => {
    await triggerWorkflow('payment.link.sent', {
      projectId: inv.projectId,
      data: { invoiceId: inv.id, amount: inv.amount, type: inv.type },
      triggeredBy: user?.name ?? 'manager',
    });
    toast.success('Payment Link Sent', { description: `${formatINR(inv.amount)} link sent to ${inv.clientName}` });
  };

  const columns: Column<Invoice>[] = [
    {
      key: 'id',
      header: 'Invoice',
      sortable: true,
      sortValue: (i) => i.id,
      cell: (i) => <span className="font-mono text-xs text-muted-foreground">{i.id}</span>,
    },
    {
      key: 'client',
      header: 'Client',
      sortable: true,
      sortValue: (i) => i.clientName,
      cell: (i) => <span className="font-medium">{i.clientName}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      cell: (i) => <span className="text-sm capitalize">{i.type}</span>,
      hideOnMobile: true,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      sortValue: (i) => i.amount,
      cell: (i) => <span className="tabular-nums font-medium">{formatINR(i.amount)}</span>,
    },
    {
      key: 'due',
      header: 'Due Date',
      sortable: true,
      sortValue: (i) => i.dueDate,
      cell: (i) => <span className="text-sm text-muted-foreground">{formatDate(i.dueDate)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (i) => <PaymentBadge status={i.status} />,
    },
    {
      key: 'action',
      header: '',
      cell: (i) => (
        <Button
          variant="outline"
          size="sm"
          disabled={i.status === 'paid' || triggering['payment.link.sent']}
          onClick={(e) => { e.stopPropagation(); sendLink(i); }}
        >
          <Send className="mr-1 h-3 w-3" /> Send Link
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Finance" description="Invoices, payments, and revenue tracking" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Total Collected" value={formatINR(totalCollected)} icon={Wallet} trend={{ value: '8.2%', positive: true }} />
        <StatCard title="Pending" value={formatINR(pending)} icon={TrendingUp} />
        <StatCard title="Overdue" value={formatINR(overdue)} icon={AlertCircle} />
        <StatCard title="Total Invoices" value={totalInvoices} icon={FileText} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Invoices</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DataTable data={INVOICES} columns={columns} searchKeys={['clientName', 'id']} searchPlaceholder="Search invoices..." />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <DataTable data={INVOICES.filter((i) => i.status === 'unpaid' || i.status === 'partial')} columns={columns} searchKeys={['clientName']} searchPlaceholder="Search..." />
        </TabsContent>
        <TabsContent value="overdue" className="mt-4">
          <DataTable data={INVOICES.filter((i) => i.status === 'overdue')} columns={columns} searchKeys={['clientName']} searchPlaceholder="Search..." />
        </TabsContent>
        <TabsContent value="paid" className="mt-4">
          <DataTable data={INVOICES.filter((i) => i.status === 'paid')} columns={columns} searchKeys={['clientName']} searchPlaceholder="Search..." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
