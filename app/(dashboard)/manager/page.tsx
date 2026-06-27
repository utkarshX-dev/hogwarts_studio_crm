'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { AssignShootDialog } from '@/components/dialogs/AssignShootDialog';
import { AssignEditorDialog } from '@/components/dialogs/AssignEditorDialog';
import {
  Briefcase, Camera, Scissors, CheckCircle, ArrowRight, Calendar, User, FileText, X,
} from 'lucide-react';
import { PROJECTS, EDITORS } from '@/lib/mock-data';
import { KANBAN_COLUMNS, STATUS_META } from '@/lib/status-config';
import { formatINR, formatDate, titleCase } from '@/lib/formatter';
import { useWorkflow } from '@/hooks/use-workflow';
import { useAuth } from '@/lib/auth-context';
import type { Project, ProjectStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ManagerPage() {
  const { user } = useAuth();
  const { triggerWorkflow, triggering } = useWorkflow();
  const [shootProject, setShootProject] = useState<Project | null>(null);
  const [editorProject, setEditorProject] = useState<Project | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [shootOpen, setShootOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const openShoot = (p: Project) => { setShootProject(p); setShootOpen(true); };
  const openEditor = (p: Project) => { setEditorProject(p); setEditorOpen(true); };
  const openDetail = (p: Project) => { setDetailProject(p); setDetailOpen(true); };

  const advanceStatus = async (p: Project) => {
    const order = KANBAN_COLUMNS;
    const idx = order.indexOf(p.status);
    const next = order[idx + 1];
    if (!next) return;
    const event = next === 'editor_assigned' ? 'editor.assigned' : next === 'shoot_scheduled' ? 'shoot.assigned' : 'lead.updated';
    await triggerWorkflow(event, {
      projectId: p.id,
      clientId: p.client.id,
      data: { from: p.status, to: next },
      triggeredBy: user?.name ?? 'manager',
    });
    toast.success('Status Updated', { description: `${p.client.company} → ${STATUS_META[next].label}` });
  };

  const approveDraft = async (p: Project) => {
    await triggerWorkflow('draft.approved', {
      projectId: p.id,
      clientId: p.client.id,
      data: { draftLink: p.draftLink },
      triggeredBy: user?.name ?? 'manager',
    });
    toast.success('Draft Approved', { description: `${p.client.company} draft approved` });
  };

  const activeProjects = PROJECTS.filter((p) => !['closed', 'delivered'].includes(p.status)).length;
  const pendingApprovals = PROJECTS.filter((p) => p.status === 'draft_sent').length;
  const availableEditors = EDITORS.filter((e) => e.status === 'available').length;
  const scheduledShoots = PROJECTS.filter((p) => p.shoot?.status === 'scheduled').length;

  return (
    <div>
      <PageHeader title="Manager" description="Kanban board, assignments, and approvals" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Active Projects" value={activeProjects} icon={Briefcase} />
        <StatCard title="Pending Approvals" value={pendingApprovals} icon={CheckCircle} />
        <StatCard title="Scheduled Shoots" value={scheduledShoots} icon={Camera} />
        <StatCard title="Available Editors" value={availableEditors} icon={Scissors} />
      </div>

      <div className="mb-4">
        <h2 className="text-base font-semibold mb-3">Pipeline Board</h2>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {KANBAN_COLUMNS.map((status) => {
              const items = PROJECTS.filter((p) => p.status === status);
              const meta = STATUS_META[status];
              return (
                <div key={status} className="w-[260px] shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                      <span className="text-sm font-medium">{meta.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((p) => (
                      <Card
                        key={p.id}
                        className="cursor-pointer hover:border-foreground/20 transition-colors"
                        onClick={() => openDetail(p)}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.client.company}</p>
                              <p className="text-xs text-muted-foreground">{titleCase(p.service)}</p>
                            </div>
                            <PriorityBadge priority={p.priority} />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="tabular-nums text-muted-foreground">{formatINR(p.budget)}</span>
                            {p.editor && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Scissors className="h-3 w-3" />
                                {p.editor.initials}
                              </span>
                            )}
                          </div>
                          {p.shootDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(p.shootDate)}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                            {status === 'payment_done' && (
                              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); openShoot(p); }}>
                                <Camera className="mr-1 h-3 w-3" /> Schedule
                              </Button>
                            )}
                            {status === 'footage_received' && (
                              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); openEditor(p); }}>
                                <Scissors className="mr-1 h-3 w-3" /> Assign Editor
                              </Button>
                            )}
                            {status === 'draft_sent' && (
                              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); approveDraft(p); }} disabled={triggering['draft.approved']}>
                                <CheckCircle className="mr-1 h-3 w-3" /> Approve
                              </Button>
                            )}
                            {status !== 'draft_sent' && status !== 'footage_received' && status !== 'payment_done' && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); advanceStatus(p); }}>
                                Advance <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {items.length === 0 && (
                      <div className="rounded-md border border-dashed border-border py-6 text-center">
                        <span className="text-xs text-muted-foreground">Empty</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AssignShootDialog project={shootProject} open={shootOpen} onOpenChange={setShootOpen} />
      <AssignEditorDialog project={editorProject} open={editorOpen} onOpenChange={setEditorOpen} />

      {/* Project Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailProject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detailProject.client.company}
                  <StatusBadge status={detailProject.status} />
                </DialogTitle>
                <DialogDescription>
                  #{detailProject.serialNo} · {titleCase(detailProject.service)} · {detailProject.client.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Budget</p>
                    <p className="text-sm font-medium tabular-nums">{formatINR(detailProject.budget)}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Collected</p>
                    <p className="text-sm font-medium tabular-nums">{formatINR(detailProject.paidAmount)}</p>
                  </div>
                </div>

                {detailProject.requirements && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Requirements</p>
                    <p className="text-sm">{detailProject.requirements}</p>
                  </div>
                )}

                {detailProject.shoot && (
                  <div className="rounded-md border border-border p-3 space-y-2">
                    <p className="text-xs font-medium flex items-center gap-1.5"><Camera className="h-3.5 w-3.5" /> Shoot Details</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Date:</span> {formatDate(detailProject.shoot.date)}</div>
                      <div><span className="text-muted-foreground">Location:</span> {detailProject.shoot.location}</div>
                      <div><span className="text-muted-foreground">Crew:</span> {detailProject.shoot.crew.join(', ')}</div>
                      <div><span className="text-muted-foreground">Status:</span> {titleCase(detailProject.shoot.status)}</div>
                    </div>
                  </div>
                )}

                {detailProject.editor && (
                  <div className="rounded-md border border-border p-3 flex items-center gap-3">
                    <Avatar><AvatarFallback className="bg-secondary border border-border text-xs">{detailProject.editor.initials}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-sm font-medium">{detailProject.editor.name}</p>
                      <p className="text-xs text-muted-foreground">Assigned Editor</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium mb-2">Timeline</p>
                  <div className="space-y-2.5">
                    {detailProject.timeline.map((t) => (
                      <div key={t.id} className="flex gap-3 text-sm">
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-foreground/40 mt-1.5" />
                          {t !== detailProject.timeline[detailProject.timeline.length - 1] && (
                            <div className="w-px flex-1 bg-border mt-1" />
                          )}
                        </div>
                        <div className="pb-1">
                          <p className="font-medium">{t.event}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{t.actor} · {formatDate(t.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                {detailProject.status === 'payment_done' && (
                  <Button onClick={() => { openShoot(detailProject); setDetailOpen(false); }}>
                    <Camera className="mr-1.5 h-4 w-4" /> Schedule Shoot
                  </Button>
                )}
                {detailProject.status === 'footage_received' && (
                  <Button onClick={() => { openEditor(detailProject); setDetailOpen(false); }}>
                    <Scissors className="mr-1.5 h-4 w-4" /> Assign Editor
                  </Button>
                )}
                {detailProject.status === 'draft_sent' && (
                  <Button onClick={() => approveDraft(detailProject)} disabled={triggering['draft.approved']}>
                    <CheckCircle className="mr-1.5 h-4 w-4" /> Approve Draft
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
