'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Wallet, Briefcase, Camera, FileCheck, AlertCircle, ArrowRight, Plus, TrendingUp,
} from 'lucide-react';
import { PROJECTS, ACTIVITY, REVENUE_DATA, EDITORS, INVOICES } from '@/lib/mock-data';
import { formatINR, formatRelativeTime, formatDate, titleCase } from '@/lib/formatter';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const totalRevenue = INVOICES.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const activeProjects = PROJECTS.filter((p) => !['closed', 'delivered'].includes(p.status)).length;
  const todayShoots = PROJECTS.filter((p) => p.shoot).length;
  const pendingReviews = PROJECTS.filter((p) => p.status === 'draft_sent').length;
  const pendingPayments = INVOICES.filter((i) => i.status === 'unpaid' || i.status === 'partial' || i.status === 'overdue').length;
  const busyEditors = EDITORS.filter((e) => e.status === 'busy').length;

  const recentProjects = PROJECTS.slice(0, 5);
  const upcomingShoots = PROJECTS.filter((p) => p.shoot && p.shoot.status === 'scheduled').slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Operational overview of all active productions"
        actions={
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            New Lead
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <StatCard title="Revenue" value={formatINR(totalRevenue)} icon={Wallet} trend={{ value: '12.5%', positive: true }} />
        <StatCard title="Active Projects" value={activeProjects} icon={Briefcase} />
        <StatCard title="Today's Shoots" value={todayShoots} icon={Camera} />
        <StatCard title="Pending Reviews" value={pendingReviews} icon={FileCheck} />
        <StatCard title="Pending Payments" value={pendingPayments} icon={AlertCircle} />
        <StatCard title="Editors Busy" value={`${busyEditors}/${EDITORS.length}`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <Link href="/analytics" className="text-xs text-muted-foreground hover:text-foreground">
              View analytics →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#58A6FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#58A6FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
                  <XAxis dataKey="month" stroke="#6E7681" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6E7681" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 100000}L`} />
                  <Tooltip
                    contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '6px', fontSize: '12px' }}
                    labelStyle={{ color: '#F0F6FC' }}
                    formatter={(v: number) => [formatINR(v), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#58A6FF" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { label: 'New Leads', count: PROJECTS.filter((p) => p.status === 'new_lead').length, color: '#8B949E' },
              { label: 'In Proposal', count: PROJECTS.filter((p) => ['proposal_sent', 'requirements_filled'].includes(p.status)).length, color: '#D29922' },
              { label: 'In Production', count: PROJECTS.filter((p) => ['shoot_scheduled', 'footage_received', 'payment_done'].includes(p.status)).length, color: '#58A6FF' },
              { label: 'In Editing', count: PROJECTS.filter((p) => ['editing', 'editor_assigned', 'draft_sent', 'in_revision'].includes(p.status)).length, color: '#E57C2B' },
              { label: 'Delivered', count: PROJECTS.filter((p) => ['delivered', 'closed'].includes(p.status)).length, color: '#3FB950' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                </div>
                <span className="text-sm font-medium tabular-nums">{s.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Recent Projects</CardTitle>
            <Link href="/manager" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentProjects.map((p) => (
              <Link
                key={p.id}
                href={`/manager`}
                className="flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary border border-border text-xs font-medium shrink-0">
                  {p.serialNo}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.client.company}</p>
                  <p className="text-xs text-muted-foreground truncate">{titleCase(p.service)}</p>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium tabular-nums">{formatINR(p.budget)}</p>
                  <p className="text-xs text-muted-foreground">{p.salesMember}</p>
                </div>
                <StatusBadge status={p.status} />
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ACTIVITY.slice(0, 6).map((a) => (
              <div key={a.id} className="flex gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] bg-secondary border border-border">
                    {a.actor.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-tight">{a.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {a.actor} · {formatRelativeTime(a.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upcoming Shoots</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingShoots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No upcoming shoots scheduled.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {upcomingShoots.map((p) => (
                <div key={p.id} className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatDate(p.shootDate)}</span>
                    <PriorityBadge priority={p.priority} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.client.company}</p>
                    <p className="text-xs text-muted-foreground">{p.shoot?.location}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Camera className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{p.shoot?.crew.length} crew members</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
