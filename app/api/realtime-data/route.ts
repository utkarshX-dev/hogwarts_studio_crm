import { NextResponse } from 'next/server';
import {
  fetchClientsFromSheet,
  fetchPaymentsFromSheet,
  fetchEditingFromSheet,
} from '@/lib/google/sheets';
import type { Lead, Payment, EditingProject } from '@/lib/sheets/types';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SERVICE_COLORS: Record<string, string> = {
  'Podcast': '#58A6FF',
  'Brand Film': '#3FB950',
  'Reel': '#D29922',
  'Product Video': '#E57C2B',
  'Event Coverage': '#F85149',
  'Social Media': '#8B949E',
  'Rentals': '#A371F7',
  'Other': '#76E3EA',
};

function normalizeService(service: string | undefined): string {
  if (!service) return 'Other';
  const s = service.toLowerCase();
  if (s.includes('podcast')) return 'Podcast';
  if (s.includes('reel')) return 'Reel';
  if (s.includes('brand')) return 'Brand Film';
  if (s.includes('product')) return 'Product Video';
  if (s.includes('event') || s.includes('coverage')) return 'Event Coverage';
  if (s.includes('social') || s.includes('media')) return 'Social Media';
  if (s.includes('rent') || s.includes('teleprompter') || s.includes('camera')) return 'Rentals';
  return 'Other';
}

export async function GET() {
  try {
    const [leads, payments, editingProjects] = await Promise.all([
      fetchClientsFromSheet(),
      fetchPaymentsFromSheet(),
      fetchEditingFromSheet(),
    ]);

    const validPayments = payments.filter((p) => p.paymentId && p.paymentId.trim() !== '');

    // 1. Group payments by leadId for type inference
    const paymentsByLead: Record<string, Payment[]> = {};
    for (const p of validPayments) {
      if (!p.leadId) continue;
      if (!paymentsByLead[p.leadId]) {
        paymentsByLead[p.leadId] = [];
      }
      paymentsByLead[p.leadId].push(p);
    }

    const parsePaymentDate = (p: Payment) => {
      const d = p.paymentLinkSentAt ? new Date(p.paymentLinkSentAt) : new Date(0);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    for (const leadId in paymentsByLead) {
      paymentsByLead[leadId].sort((a, b) => parsePaymentDate(a) - parsePaymentDate(b));
    }

    // 2. Map payments to invoices
    const invoices = validPayments.map((p) => {
      const amountVal = parseFloat(p.amount) || 0;
      const statusLower = (p.paymentStatus || '').trim().toLowerCase();

      let status: 'paid' | 'unpaid' | 'partial' | 'overdue' = 'unpaid';
      const isVerified = ['payment verified', 'payment confirmed', 'confirmed'].includes(statusLower);
      const isPendingVer = ['pending verification', 'screenshot uploaded - pending verification'].includes(statusLower);

      if (isVerified) {
        status = 'paid';
      } else if (isPendingVer) {
        status = 'partial';
      } else {
        status = 'unpaid';
      }

      const linkSentDate = p.paymentLinkSentAt ? new Date(p.paymentLinkSentAt) : null;
      let dueDateStr = '';
      if (linkSentDate && !isNaN(linkSentDate.getTime())) {
        const dueDateObj = new Date(linkSentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        dueDateStr = dueDateObj.toISOString();

        if (status !== 'paid' && Date.now() > dueDateObj.getTime()) {
          status = 'overdue';
        }
      } else {
        dueDateStr = new Date().toISOString();
      }

      const leadPayments = paymentsByLead[p.leadId] || [];
      const index = leadPayments.findIndex((x) => x.paymentId === p.paymentId);
      let type: 'advance' | 'final' | 'installment' = 'advance';
      if (leadPayments.length > 1) {
        if (index === 0) {
          type = 'advance';
        } else if (index === leadPayments.length - 1) {
          type = 'final';
        } else {
          type = 'installment';
        }
      }

      return {
        id: p.paymentId,
        projectId: p.leadId,
        clientName: p.clientName || 'Unknown Client',
        amount: amountVal,
        status,
        dueDate: dueDateStr,
        paidDate: isVerified ? (p.verifiedAt || p.paymentLinkSentAt) : undefined,
        type,
      };
    });

    // 3. Analytics Aggregations
    const currentYear = new Date().getFullYear();
    const getMonthName = (dateStr: string | undefined) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      if (d.getFullYear() === currentYear) {
        return MONTH_NAMES[d.getMonth()];
      }
      return null;
    };

    const revenueByMonth: Record<string, number> = {};
    const projectsByMonth: Record<string, Set<string>> = {};
    const leadsCountByMonth: Record<string, number> = {};
    const convertedCountByMonth: Record<string, number> = {};

    MONTH_NAMES.forEach((m) => {
      revenueByMonth[m] = 0;
      projectsByMonth[m] = new Set<string>();
      leadsCountByMonth[m] = 0;
      convertedCountByMonth[m] = 0;
    });

    // Populate revenue
    for (const p of validPayments) {
      const statusLower = (p.paymentStatus || '').trim().toLowerCase();
      const isVerified = ['payment verified', 'payment confirmed', 'confirmed'].includes(statusLower);
      if (!isVerified) continue;

      const m = getMonthName(p.verifiedAt || p.paymentLinkSentAt);
      if (m) {
        revenueByMonth[m] += parseFloat(p.amount) || 0;
      }
    }

    // Populate projects and sales trend
    for (const lead of leads) {
      const m = getMonthName(lead.date);
      if (m) {
        leadsCountByMonth[m]++;
        if (lead.proposalAccepted) {
          convertedCountByMonth[m]++;
          projectsByMonth[m].add(lead.leadId);
        }
      }
    }

    const REVENUE_DATA = MONTH_NAMES.map((m) => ({
      month: m,
      revenue: revenueByMonth[m],
      projects: projectsByMonth[m].size,
    }));

    const SALES_TREND = MONTH_NAMES.map((m) => ({
      month: m,
      leads: leadsCountByMonth[m],
      converted: convertedCountByMonth[m],
    }));

    // Service distribution
    const serviceCounts: Record<string, number> = {};
    for (const lead of leads) {
      const norm = normalizeService(lead.servicePitched);
      serviceCounts[norm] = (serviceCounts[norm] || 0) + 1;
    }
    const SERVICE_DISTRIBUTION = Object.keys(serviceCounts).map((name) => ({
      name,
      value: serviceCounts[name],
      color: SERVICE_COLORS[name] || '#8B949E',
    }));

    // Status distribution
    const statusCounts: Record<string, number> = {
      Active: 0,
      'In Progress': 0,
      'On Hold': 0,
      Closed: 0,
    };
    for (const lead of leads) {
      const s = (lead.status || '').trim().toLowerCase();
      if (['proposal accepted', 'shoot scheduled', 'editing', 'draft sent'].includes(s)) {
        statusCounts['Active']++;
      } else if (['new lead', 'proposal sent', 'awaiting payment'].includes(s)) {
        statusCounts['In Progress']++;
      } else if (['delivered', 'closed'].includes(s)) {
        statusCounts['Closed']++;
      } else {
        statusCounts['On Hold']++;
      }
    }
    const STATUS_DISTRIBUTION = [
      { name: 'Active', value: statusCounts['Active'], color: '#3FB950' },
      { name: 'In Progress', value: statusCounts['In Progress'], color: '#58A6FF' },
      { name: 'On Hold', value: statusCounts['On Hold'], color: '#D29922' },
      { name: 'Closed', value: statusCounts['Closed'], color: '#6E7681' },
    ];

    // Editors performance
    const editorsMap: Record<string, {
      id: string;
      name: string;
      initials: string;
      email: string;
      status: 'available' | 'busy' | 'offline';
      activeProjects: number;
      completedProjects: number;
      specialization: Set<string>;
    }> = {};

    for (const proj of editingProjects) {
      const name = (proj.editorName || '').trim();
      if (!name) continue;

      if (!editorsMap[name]) {
        const words = name.split(/\s+/);
        const initials = words.map((w) => w[0]?.toUpperCase()).join('').slice(0, 2);
        const id = 'ed_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');

        editorsMap[name] = {
          id,
          name,
          initials,
          email: proj.editorEmail || '',
          status: 'available',
          activeProjects: 0,
          completedProjects: 0,
          specialization: new Set<string>(),
        };
      }

      const isDelivered = (proj.status || '').trim().toLowerCase() === 'delivered' || proj.finalDelivered;
      if (isDelivered) {
        editorsMap[name].completedProjects++;
      } else {
        editorsMap[name].activeProjects++;
      }

      if (proj.serviceType) {
        editorsMap[name].specialization.add(normalizeService(proj.serviceType));
      }
    }

    const EDITORS = Object.values(editorsMap).map((e) => ({
      ...e,
      status: e.activeProjects > 0 ? ('busy' as const) : ('available' as const),
      specialization: Array.from(e.specialization),
    }));

    // Overall metrics
    const totalRevenue = validPayments.reduce((sum, p) => {
      const statusLower = (p.paymentStatus || '').trim().toLowerCase();
      const isVerified = ['payment verified', 'payment confirmed', 'confirmed'].includes(statusLower);
      return sum + (isVerified ? (parseFloat(p.amount) || 0) : 0);
    }, 0);

    const totalProjects = leads.filter((l) => l.proposalAccepted).length;
    const avgProject = totalProjects > 0 ? totalRevenue / totalProjects : 0;
    const totalLeads = leads.length;
    const totalConverted = leads.filter((l) => l.proposalAccepted).length;
    const conversionRate = totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0;

    return NextResponse.json({
      success: true,
      invoices,
      analytics: {
        totalRevenue,
        totalProjects,
        avgProject,
        conversionRate,
        REVENUE_DATA,
        SERVICE_DISTRIBUTION,
        STATUS_DISTRIBUTION,
        SALES_TREND,
        EDITORS,
      },
    });
  } catch (error) {
    console.error('Failed to aggregate real-time sheets data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
