'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatINR, formatPercent } from '@/lib/formatter';
import { REVENUE_DATA, SERVICE_DISTRIBUTION, STATUS_DISTRIBUTION, SALES_TREND, EDITORS } from '@/lib/mock-data';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, Target, Award } from 'lucide-react';

const tooltipStyle = { background: '#161B22', border: '1px solid #30363D', borderRadius: '6px', fontSize: '12px' };
const labelStyle = { color: '#F0F6FC' };

export default function AnalyticsPage() {
  const totalRevenue = REVENUE_DATA.reduce((s, r) => s + r.revenue, 0);
  const totalProjects = REVENUE_DATA.reduce((s, r) => s + r.projects, 0);
  const avgProject = totalRevenue / totalProjects;
  const conversionRate = (SALES_TREND.reduce((s, r) => s + r.converted, 0) / SALES_TREND.reduce((s, r) => s + r.leads, 0)) * 100;
  const topEditor = EDITORS.sort((a, b) => b.completedProjects - a.completedProjects)[0];

  return (
    <div>
      <PageHeader title="Analytics" description="Revenue insights, service distribution, and performance metrics" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Total Revenue" value={formatINR(totalRevenue)} icon={TrendingUp} trend={{ value: '14.2%', positive: true }} />
        <StatCard title="Total Projects" value={totalProjects} icon={Target} trend={{ value: '9.1%', positive: true }} />
        <StatCard title="Avg Project Value" value={formatINR(avgProject)} icon={Users} />
        <StatCard title="Conversion Rate" value={formatPercent(conversionRate)} icon={Award} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3FB950" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3FB950" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
                  <XAxis dataKey="month" stroke="#6E7681" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6E7681" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 100000}L`} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={(v: number) => [formatINR(v), 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#3FB950" strokeWidth={2} fill="url(#rev2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Service Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={SERVICE_DISTRIBUTION} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {SERVICE_DISTRIBUTION.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="#161B22" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={(v: number, n: string) => [`${v}%`, n]} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#8B949E' }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Sales Funnel</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SALES_TREND} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
                  <XAxis dataKey="month" stroke="#6E7681" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6E7681" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
                  <Bar dataKey="leads" fill="#8B949E" radius={[3, 3, 0, 0]} name="Leads" />
                  <Bar dataKey="converted" fill="#3FB950" radius={[3, 3, 0, 0]} name="Converted" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Project Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={STATUS_DISTRIBUTION} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                    {STATUS_DISTRIBUTION.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="#161B22" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={(v: number, n: string) => [v, n]} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Editor Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {EDITORS.sort((a, b) => b.completedProjects - a.completedProjects).map((e, i) => (
              <div key={e.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground tabular-nums w-4">{i + 1}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary border border-border text-xs font-medium">{e.initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.completedProjects} completed · {e.activeProjects} active</p>
                </div>
                <div className="w-32 h-2 rounded-full bg-secondary overflow-hidden hidden sm:block">
                  <div className="h-full rounded-full bg-[#3FB950]" style={{ width: `${(e.completedProjects / topEditor.completedProjects) * 100}%` }} />
                </div>
                <span className="text-sm font-medium tabular-nums w-8 text-right">{e.completedProjects}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
