'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { LeadStatusBadge } from '@/components/shared/Badges';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Users, FileText, Wallet, TrendingUp, Send, RefreshCw, Loader2 } from 'lucide-react';
import { formatINR } from '@/lib/formatter';
import { useAuth } from '@/lib/auth-context';
import { MOCK_USERS } from '@/lib/auth';
import type { Lead, LeadFilterTab } from '@/lib/sheets/types';
import {
  canSendPaymentLink,
  filterSalesLeads,
  isPaymentLinkSent,
  isPendingPaymentVerification,
  isPaymentVerified,
  PAYMENT_STATUS,
} from '@/lib/sheets/payment-utils';
import { PaymentStatusIndicator } from '@/components/sales/PaymentStatusIndicator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PROPOSAL_WEBHOOK_URL =
  'https://hogwartsautomation.app.n8n.cloud/webhook/send-proposal';

const DEFAULT_ASSIGNED_TO = MOCK_USERS.manager.name;

const FILTER_TABS: { value: LeadFilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new_leads', label: 'New Leads' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'accepted', label: 'Accepted' },
];

interface SalesDashboardProps {
  initialLeads: Lead[];
}

function parseCost(value: string): number {
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function SalesDashboard({ initialLeads }: SalesDashboardProps) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);
  const [newLeadService, setNewLeadService] = useState('podcast');
  const [reachoutDone, setReachoutDone] = useState<'yes' | 'no'>('no');
  const [assignedTo, setAssignedTo] = useState(DEFAULT_ASSIGNED_TO);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [filterTab, setFilterTab] = useState<LeadFilterTab>('all');
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    clientEmail: '',
    servicePitched: '',
    cost: '',
  });
  const [paymentLinkOpen, setPaymentLinkOpen] = useState(false);
  const [paymentLead, setPaymentLead] = useState<Lead | null>(null);
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);
  const [verifyingLeadId, setVerifyingLeadId] = useState<string | null>(null);

  const refreshLeads = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await fetch('/api/clients', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to refresh leads');
      }
      setLeads(data.leads ?? []);
      window.dispatchEvent(new CustomEvent('leads-updated'));
    } catch (error) {
      if (!silent) {
        toast.error('Failed to refresh leads', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshLeads(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshLeads]);

  const salesLeads = useMemo(() => {
    return filterSalesLeads(leads, user?.name, user?.role);
  }, [leads, user?.name, user?.role]);

  const filteredLeads = useMemo(() => {
    switch (filterTab) {
      case 'new_leads':
        return salesLeads.filter((lead) => lead.status === 'New Lead');
      case 'proposal_sent':
        return salesLeads.filter((lead) => lead.status === 'Proposal Sent');
      case 'accepted':
        return salesLeads.filter((lead) => lead.proposalAccepted);
      default:
        return salesLeads;
    }
  }, [salesLeads, filterTab]);

  const openProposalModal = (lead: Lead) => {
    setSelected(lead);
    setProposalForm({
      clientEmail: lead.clientEmail,
      servicePitched: lead.servicePitched,
      cost: lead.cost,
    });
    setProposalOpen(true);
  };

  const handleSendProposal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected) return;

    setSubmittingProposal(true);
    try {
      const response = await fetch(PROPOSAL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selected.leadId,
          client_name: selected.name,
          client_email: proposalForm.clientEmail,
          client_phone: selected.phoneNumber,
          service_pitched: proposalForm.servicePitched,
          cost: proposalForm.cost,
          salesperson_name: selected.assignedTo,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send proposal');
      }

      setProposalOpen(false);
      toast.success('Proposal sent successfully!');
      await refreshLeads(true);
    } catch (error) {
      toast.error('Failed to send proposal', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleLeadOpenChange = (open: boolean) => {
    setLeadOpen(open);
    if (open) {
      setNewLeadService('podcast');
      setReachoutDone('no');
      setAssignedTo(DEFAULT_ASSIGNED_TO);
    }
  };

  const handleCreateLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    setCreatingLead(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('company'),
          phoneNumber: form.get('contact'),
          whatsapp: form.get('whatsapp'),
          service: newLeadService,
          assignedTo,
          clientEmail: form.get('clientEmail'),
          cost: form.get('cost'),
          reachoutDone,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create lead');
      }

      formEl.reset();
      setNewLeadService('podcast');
      setReachoutDone('no');
      setAssignedTo(DEFAULT_ASSIGNED_TO);
      setLeadOpen(false);
      toast.success('Lead Created', { description: 'New lead added to Google Sheets' });
      await refreshLeads(true);
    } catch (error) {
      toast.error('Failed to create lead', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setCreatingLead(false);
    }
  };

  const handleSendPaymentLink = async () => {
    if (!paymentLead || !user) return;

    setSendingPaymentLink(true);
    try {
      const response = await fetch('/api/send-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: paymentLead.leadId,
          client_name: paymentLead.name,
          client_email: paymentLead.clientEmail,
          cost: paymentLead.cost,
          salesperson_name: paymentLead.assignedTo,
          salesperson_email: user.email,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to send payment link');
      }

      setPaymentLinkOpen(false);
      setPaymentLead(null);
      toast.success('Payment link sent!');
      await refreshLeads(true);
    } catch (error) {
      toast.error('Failed to send payment link', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSendingPaymentLink(false);
    }
  };

  const handleVerifyPayment = async (lead: Lead) => {
    if (!user) return;

    setVerifyingLeadId(lead.leadId);
    try {
      const response = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.leadId,
          verified_by: user.name,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to verify payment');
      }

      setLeads((prev) =>
        prev.map((item) =>
          item.leadId === lead.leadId
            ? {
                ...item,
                payment_status: PAYMENT_STATUS.VERIFIED,
                payment: item.payment
                  ? {
                      ...item.payment,
                      paymentStatus: PAYMENT_STATUS.VERIFIED,
                      verifiedBy: user.name,
                    }
                  : null,
              }
            : item
        )
      );

      toast.success('Payment verified!');
      await refreshLeads(true);
    } catch (error) {
      toast.error('Failed to verify payment', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setVerifyingLeadId(null);
    }
  };

  const renderProposalAction = (lead: Lead) => {
    if (lead.proposalAccepted) {
      return (
        <span className="inline-flex items-center rounded-full border border-green-500/40 bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-600">
          ✅ Client Accepted
        </span>
      );
    }

    if (lead.status === 'New Lead') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            openProposalModal(lead);
          }}
        >
          <Send className="mr-1 h-3 w-3" />
          Send Proposal
        </Button>
      );
    }

    if (lead.status === 'Proposal Sent') {
      return (
        <Button variant="outline" size="sm" disabled className="text-muted-foreground">
          Proposal Sent
        </Button>
      );
    }

    return null;
  };

  const renderPaymentAction = (lead: Lead) => {
    if (isPaymentLinkSent(lead)) {
      return (
        <Button variant="outline" size="sm" disabled className="text-muted-foreground">
          Payment Link Sent ✓
        </Button>
      );
    }

    if (canSendPaymentLink(lead)) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setPaymentLead(lead);
            setPaymentLinkOpen(true);
          }}
        >
          <Wallet className="mr-1 h-3 w-3" />
          Send Payment Link
        </Button>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            <Button variant="outline" size="sm" disabled className="text-muted-foreground">
              <Wallet className="mr-1 h-3 w-3" />
              Payment
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Waiting for client to accept proposal</TooltipContent>
      </Tooltip>
    );
  };

  const renderVerifyButton = (lead: Lead) => {
    if (!isPendingPaymentVerification(lead) || isPaymentVerified(lead)) return null;

    const isVerifying = verifyingLeadId === lead.leadId;

    return (
      <Button
        variant="outline"
        size="sm"
        className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 h-7 text-xs"
        disabled={isVerifying}
        onClick={(e) => {
          e.stopPropagation();
          handleVerifyPayment(lead);
        }}
      >
        {isVerifying ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : null}
        Verify Payment
      </Button>
    );
  };

  const renderStatusCell = (lead: Lead) => (
    <div className="flex flex-col gap-1.5">
      <LeadStatusBadge status={lead.status} />
      <div className="flex flex-wrap items-center gap-1.5">
        <PaymentStatusIndicator lead={lead} />
        {renderVerifyButton(lead)}
      </div>
    </div>
  );

  const renderActions = (lead: Lead) => (
    <div className="flex flex-col gap-1.5 items-start">
      {renderProposalAction(lead)}
      {renderPaymentAction(lead)}
    </div>
  );

  const columns: Column<Lead>[] = [
    {
      key: 'serialNo',
      header: 'S.No',
      sortable: true,
      sortValue: (lead) => lead.serialNo,
      cell: (lead) => (
        <span className="text-muted-foreground tabular-nums">{lead.serialNo}</span>
      ),
      className: 'w-16',
    },
    {
      key: 'client',
      header: 'Client',
      sortable: true,
      sortValue: (lead) => lead.name,
      cell: (lead) => (
        <div>
          <p className="font-medium">{lead.name}</p>
          <p className="text-xs text-muted-foreground">{lead.phoneNumber}</p>
        </div>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      sortable: true,
      sortValue: (lead) => lead.assignedTo,
      cell: (lead) => <span className="text-sm">{lead.assignedTo || '—'}</span>,
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (lead) => renderStatusCell(lead),
    },
    {
      key: 'action',
      header: 'Actions',
      cell: (lead) => renderActions(lead),
      className: 'min-w-[160px]',
    },
  ];

  const totalLeads = salesLeads.length;
  const proposalsSent = salesLeads.filter(
    (lead) => lead.status === 'Proposal Sent' || lead.proposalSent.toLowerCase() === 'true'
  ).length;
  const totalPipeline = salesLeads.reduce((sum, lead) => sum + parseCost(lead.cost), 0);
  const acceptedValue = salesLeads
    .filter((lead) => lead.proposalAccepted)
    .reduce((sum, lead) => sum + parseCost(lead.cost), 0);

  const pipelineStatuses = [
    'New Lead',
    'Proposal Sent',
    'Proposal Accepted',
    'Shoot Scheduled',
    'Editing',
    'Draft Sent',
    'Delivered',
  ];

  return (
    <TooltipProvider delayDuration={200}>
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
        <StatCard title="Collected" value={formatINR(acceptedValue)} icon={Wallet} />
      </div>

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1 rounded-lg border border-border p-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilterTab(tab.value)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    filterTab === tab.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshLeads()}
              disabled={refreshing}
            >
              <RefreshCw className={cn('mr-1.5 h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          <DataTable
            data={filteredLeads}
            columns={columns}
            searchKeys={['searchText']}
            searchPlaceholder="Search by client name or phone..."
          />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {pipelineStatuses.map((status) => {
              const items = salesLeads.filter((lead) => lead.status === status);
              return (
                <Card key={status}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{status}</CardTitle>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {items.length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No items</p>
                    ) : (
                      items.map((lead) => (
                        <div
                          key={lead.id}
                          className="rounded-md border border-border p-2.5 cursor-pointer hover:bg-secondary/50 transition-colors"
                          onClick={() => openProposalModal(lead)}
                        >
                          <p className="text-sm font-medium truncate">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.servicePitched || 'No service pitched'}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs tabular-nums">
                              {lead.cost ? formatINR(parseCost(lead.cost)) : '—'}
                            </span>
                            <LeadStatusBadge status={lead.status} />
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
                data={salesLeads.filter((lead) => parseCost(lead.cost) > 0)}
                columns={[
                  {
                    key: 'client',
                    header: 'Client',
                    cell: (lead) => <span className="font-medium">{lead.name}</span>,
                  },
                  {
                    key: 'cost',
                    header: 'Quoted Cost',
                    cell: (lead) => (
                      <span className="tabular-nums">{formatINR(parseCost(lead.cost))}</span>
                    ),
                    hideOnMobile: true,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    cell: (lead) => renderStatusCell(lead),
                  },
                  {
                    key: 'accepted',
                    header: 'Proposal',
                    cell: (lead) =>
                      lead.proposalAccepted ? (
                        <span className="text-xs font-medium text-green-600">✅ Accepted</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      ),
                  },
                ]}
                searchKeys={['searchText']}
                searchPlaceholder="Search..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Proposal</DialogTitle>
            <DialogDescription>
              Send a proposal to {selected?.name ?? 'the client'}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <form onSubmit={handleSendProposal} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name</Label>
                <Input id="client-name" value={selected.name} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email">Client Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  required
                  value={proposalForm.clientEmail}
                  onChange={(e) =>
                    setProposalForm((prev) => ({ ...prev, clientEmail: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-pitched">Service Pitched</Label>
                <Input
                  id="service-pitched"
                  required
                  value={proposalForm.servicePitched}
                  onChange={(e) =>
                    setProposalForm((prev) => ({ ...prev, servicePitched: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost in ₹</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={proposalForm.cost}
                  onChange={(e) =>
                    setProposalForm((prev) => ({ ...prev, cost: e.target.value }))
                  }
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setProposalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingProposal}>
                  <Send className="mr-1.5 h-4 w-4" />
                  Send Proposal
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={paymentLinkOpen} onOpenChange={setPaymentLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Payment Link</DialogTitle>
            <DialogDescription>
              Send payment instructions to {paymentLead?.clientEmail || 'the client'}?
            </DialogDescription>
          </DialogHeader>
          {paymentLead && (
            <div className="rounded-md border border-border p-3 space-y-1 text-sm">
              <p className="font-medium">{paymentLead.name}</p>
              <p className="text-muted-foreground">{paymentLead.clientEmail}</p>
              <p className="text-muted-foreground tabular-nums">
                Amount: {paymentLead.cost ? formatINR(parseCost(paymentLead.cost)) : '—'}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPaymentLinkOpen(false);
                setPaymentLead(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSendPaymentLink} disabled={sendingPaymentLink}>
              <Wallet className="mr-1.5 h-4 w-4" />
              Send Payment Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={leadOpen} onOpenChange={handleLeadOpenChange}>
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
              <Select value={newLeadService} onValueChange={setNewLeadService}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email</Label>
              <Input id="clientEmail" name="clientEmail" type="email" placeholder="client@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost in ₹</Label>
              <Input id="cost" name="cost" type="number" min="0" step="0.01" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignTo">Assign To</Label>
              <Input
                id="assignTo"
                name="assignTo"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reachoutDone">Reachout Done</Label>
              <Select value={reachoutDone} onValueChange={(v) => setReachoutDone(v as 'yes' | 'no')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setLeadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingLead}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create Lead
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
    </TooltipProvider>
  );
}
