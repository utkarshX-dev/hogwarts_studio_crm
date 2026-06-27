'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge, PriorityBadge, PaymentBadge } from '@/components/shared/Badges';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Users, FileText, Wallet, TrendingUp, Send } from 'lucide-react';
import { PROJECTS } from '@/lib/mock-data';
import { formatINR, formatDate, titleCase } from '@/lib/formatter';
import { useWorkflow } from '@/hooks/use-workflow';
import { useAuth } from '@/lib/auth-context';
import type { Project } from '@/lib/types';
import { toast } from 'sonner';

export default function SalesPage() {
  const { user } = useAuth();
  const { triggerWorkflow, triggering } = useWorkflow();
  const [proposalOpen, setProposalOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);

  const salesProjects = PROJECTS.filter((p) => p.salesMember === user?.name || user?.role === 'manager');

  const handleSendProposal = async () => {
    if (!selected) return;
    await triggerWorkflow('proposal.sent', {
      projectId: selected.id,
      clientId: selected.client.id,
      data: { budget: selected.budget, service: selected.service },
      triggeredBy: user?.name ?? 'sales',
    });
    setProposalOpen(false);
    toast.success('Proposal Sent', { description: `Proposal sent to ${selected.client.company}` });
  };

  const handleCreateLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await triggerWorkflow('lead.created', {
      data: {
        company: form.get('company'),
        contact: form.get('contact'),
        service: form.get('service'),
      },
      triggeredBy: user?.name ?? 'sales',
    });
    setLeadOpen(false);
    toast.success('Lead Created', { description: 'New lead added to pipeline' });
  };

  const columns: Column<Project>[] = [
    {
      key: 'serialNo',
      header: 'S.No',
      sortable: true,
      sortValue: (p) => p.serialNo,
      cell: (p) => <span className="text-muted-foreground tabular-nums">#{p.serialNo}</span>,
      className: 'w-16',
    },
    {
      key: 'client',
      header: 'Client',
      sortable: true,
      sortValue: (p) => p.client.company,
      cell: (p) => (
        <div>
          <p className="font-medium">{p.client.company}</p>
          <p className="text-xs text-muted-foreground">{p.client.name}</p>
        </div>
      ),
    },
    {
      key: 'service',
      header: 'Service',
      cell: (p) => <span className="text-sm">{titleCase(p.service)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'budget',
      header: 'Budget',
      sortable: true,
      sortValue: (p) => p.budget,
      cell: (p) => <span className="tabular-nums font-medium">{formatINR(p.budget)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'paid',
      header: 'Paid',
      cell: (p) => (
        <div>
          <span className="tabular-nums text-sm">{formatINR(p.paidAmount)}</span>
          <p className="text-xs text-muted-foreground">{p.budget > 0 ? `${Math.round((p.paidAmount / p.budget) * 100)}%` : '—'}</p>
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (p) => <PriorityBadge priority={p.priority} />,
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'action',
      header: '',
      cell: (p) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setSelected(p); setProposalOpen(true); }}
          disabled={!['new_lead', 'requirements_filled'].includes(p.status)}
        >
          <Send className="mr-1 h-3 w-3" />
          Proposal
        </Button>
      ),
    },
  ];

  const totalLeads = salesProjects.length;
  const proposalsSent = salesProjects.filter((p) => ['proposal_sent', 'payment_pending'].includes(p.status)).length;
  const totalPipeline = salesProjects.reduce((s, p) => s + p.budget, 0);
  const collected = salesProjects.reduce((s, p) => s + p.paidAmount, 0);

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Lead intake, proposals, and payment tracking"
        actions={
          <Button size="sm" onClick={() => setLeadOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Lead
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Total Leads" value={totalLeads} icon={Users} />
        <StatCard title="Proposals Sent" value={proposalsSent} icon={FileText} />
        <StatCard title="Pipeline Value" value={formatINR(totalPipeline)} icon={TrendingUp} />
        <StatCard title="Collected" value={formatINR(collected)} icon={Wallet} />
      </div>

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-4">
          <DataTable
            data={salesProjects}
            columns={columns}
            searchKeys={['client' as keyof Project]}
            searchPlaceholder="Search clients..."
            onRowClick={(p) => { setSelected(p); setProposalOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {['new_lead', 'requirements_filled', 'proposal_sent', 'payment_pending'].map((status) => {
              const items = salesProjects.filter((p) => p.status === status);
              return (
                <Card key={status}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium capitalize">{titleCase(status)}</CardTitle>
                      <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No items</p>
                    ) : (
                      items.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-md border border-border p-2.5 cursor-pointer hover:bg-secondary/50 transition-colors"
                          onClick={() => { setSelected(p); setProposalOpen(true); }}
                        >
                          <p className="text-sm font-medium truncate">{p.client.company}</p>
                          <p className="text-xs text-muted-foreground">{titleCase(p.service)}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs tabular-nums">{formatINR(p.budget)}</span>
                            <PriorityBadge priority={p.priority} />
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={salesProjects.filter((p) => p.budget > 0)}
                columns={[
                  { key: 'client', header: 'Client', cell: (p) => <span className="font-medium">{p.client.company}</span> },
                  { key: 'budget', header: 'Budget', cell: (p) => <span className="tabular-nums">{formatINR(p.budget)}</span>, hideOnMobile: true },
                  { key: 'paid', header: 'Paid', cell: (p) => <span className="tabular-nums">{formatINR(p.paidAmount)}</span>, hideOnMobile: true },
                  {
                    key: 'status',
                    header: 'Payment',
                    cell: (p) => {
                      const status = p.paidAmount >= p.budget ? 'paid' : p.paidAmount > 0 ? 'partial' : 'unpaid';
                      return <PaymentBadge status={status} />;
                    },
                  },
                  {
                    key: 'action',
                    header: '',
                    cell: (p) => (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={triggering['payment.link.sent']}
                        onClick={async (e) => {
                          e.stopPropagation();
                          await triggerWorkflow('payment.link.sent', {
                            projectId: p.id,
                            clientId: p.client.id,
                            data: { amount: p.budget - p.paidAmount, type: 'advance' },
                            triggeredBy: user?.name ?? 'sales',
                          });
                        }}
                      >
                        <Wallet className="mr-1 h-3 w-3" />
                        Send Link
                      </Button>
                    ),
                  },
                ]}
                searchKeys={['client' as keyof Project]}
                searchPlaceholder="Search..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Proposal Drawer */}
      <Sheet open={proposalOpen} onOpenChange={setProposalOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Send Proposal</SheetTitle>
            <SheetDescription>Generate and send a proposal to {selected?.client.company}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-6">
              <div className="rounded-md border border-border p-3 space-y-1">
                <p className="text-sm font-medium">{selected.client.company}</p>
                <p className="text-xs text-muted-foreground">{selected.client.name} · {selected.client.contact}</p>
                <p className="text-xs text-muted-foreground">{selected.client.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service">Service</Label>
                <Input id="service" defaultValue={titleCase(selected.service)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Quoted Budget (INR)</Label>
                <Input id="budget" type="number" defaultValue={selected.budget} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea id="requirements" defaultValue={selected.requirements ?? ''} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline</Label>
                <Select defaultValue="2weeks">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1week">1 Week</SelectItem>
                    <SelectItem value="2weeks">2 Weeks</SelectItem>
                    <SelectItem value="1month">1 Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setProposalOpen(false)}>Cancel</Button>
            <Button onClick={handleSendProposal} disabled={triggering['proposal.sent']}>
              <Send className="mr-1.5 h-4 w-4" />
              Send Proposal
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* New Lead Dialog */}
      <Sheet open={leadOpen} onOpenChange={setLeadOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Lead</SheetTitle>
            <SheetDescription>Capture a new lead from WhatsApp Business</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateLead} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input id="company" name="company" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input id="contact" name="contact" placeholder="+91 ..." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Username</Label>
              <Input id="whatsapp" name="whatsapp" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service">Service Required</Label>
              <Select name="service" defaultValue="podcast">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="brand_film">Brand Film</SelectItem>
                  <SelectItem value="product_video">Product Video</SelectItem>
                  <SelectItem value="event_coverage">Event Coverage</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setLeadOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={triggering['lead.created']}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create Lead
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
