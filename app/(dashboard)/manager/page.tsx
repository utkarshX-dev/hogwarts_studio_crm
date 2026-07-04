'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { AssignShootDialog } from '@/components/dialogs/AssignShootDialog';
import { AssignEditorDialog } from '@/components/dialogs/AssignEditorDialog';
import {
  Briefcase, Camera, Scissors, CheckCircle, ArrowRight, Calendar, ExternalLink,
} from 'lucide-react';
import { PROJECTS, EDITORS } from '@/lib/mock-data';
import { KANBAN_COLUMNS, STATUS_META } from '@/lib/status-config';
import { formatINR, formatDate, titleCase } from '@/lib/formatter';
import { useWorkflow } from '@/hooks/use-workflow';
import { useAuth } from '@/lib/auth-context';
import type { Project, ProjectStatus } from '@/lib/types';
import type { EditingProject, Lead, Shoot } from '@/lib/sheets/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { EDITORS as EDITING_EDITORS, findAssignedSalespersonEmail, findClientEmail, isExtraRevisionNeeded, postWebhook } from '@/lib/editing';

export default function ManagerPage() {
  const { user } = useAuth();
  const { triggerWorkflow, triggering } = useWorkflow();
  const [shootProject, setShootProject] = useState<Project | null>(null);
  const [editorProject, setEditorProject] = useState<Project | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [shootOpen, setShootOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [shoots, setShoots] = useState<Shoot[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [editing, setEditing] = useState<EditingProject[]>([]);
  const [assignShoot, setAssignShoot] = useState<Shoot | null>(null);
  const [assigningEditor, setAssigningEditor] = useState(false);
  const [sendingDraftId, setSendingDraftId] = useState<string | null>(null);
  const [approvingExtraId, setApprovingExtraId] = useState<string | null>(null);
  const [extraCosts, setExtraCosts] = useState<Record<string, string>>({});
  const [assignForm, setAssignForm] = useState({
    serviceType: '',
    editorName: EDITING_EDITORS[0].name,
    editorEmail: EDITING_EDITORS[0].email,
    dataLink: '',
    totalService: '1',
  });

  useEffect(() => {
    let mounted = true;

    async function fetchDashboardData() {
      try {
        const [shootResponse, editingResponse, leadResponse] = await Promise.all([
          fetch('/api/shoots', { cache: 'no-store' }),
          fetch('/api/editing', { cache: 'no-store' }),
          fetch('/api/clients', { cache: 'no-store' }),
        ]);
        const [shootData, editingData, leadData] = await Promise.all([
          shootResponse.json(),
          editingResponse.json(),
          leadResponse.json(),
        ]);
        if (!mounted) return;
        if (shootResponse.ok) setShoots(shootData.shoots ?? []);
        if (editingResponse.ok) setEditing(editingData.editing ?? []);
        if (leadResponse.ok) setLeads(leadData.leads ?? []);
      } catch (error) {
        console.error('Failed to fetch manager dashboard data:', error);
      }
    }

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const openShoot = (p: Project) => { setShootProject(p); setShootOpen(true); };
  const openEditor = (p: Project) => { setEditorProject(p); setEditorOpen(true); };
  const openDetail = (p: Project) => { setDetailProject(p); setDetailOpen(true); };
  const refreshEditing = async () => {
    const response = await fetch('/api/editing', { cache: 'no-store' });
    const data = await response.json();
    if (response.ok) setEditing(data.editing ?? []);
  };

  const openAssignShoot = (shoot: Shoot) => {
    setAssignShoot(shoot);
    setAssignForm({
      serviceType: '',
      editorName: EDITING_EDITORS[0].name,
      editorEmail: EDITING_EDITORS[0].email,
      dataLink: shoot.dataLink,
      totalService: '1',
    });
  };

  const handleAssignEditor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assignShoot) return;

    setAssigningEditor(true);
    try {
      await postWebhook('/assign-editor', {
        shoot_id: assignShoot.shootId,
        lead_id: assignShoot.leadId,
        client_name: assignShoot.clientName,
        email_id: assignShoot.emailId,
        client_email: assignShoot.emailId,
        data_link: assignForm.dataLink,
        service_type: assignForm.serviceType,
        editor_name: assignForm.editorName,
        editor_email: assignForm.editorEmail,
        total_service: assignForm.totalService,
      });
      toast.success('Editor assigned!');
      setAssignShoot(null);
      await refreshEditing();
    } catch (error) {
      toast.error('Failed to assign editor', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setAssigningEditor(false);
    }
  };

  const handleEditorChange = (editorName: string) => {
    const editor = EDITING_EDITORS.find((item) => item.name === editorName) ?? EDITING_EDITORS[0];
    setAssignForm((prev) => ({
      ...prev,
      editorName: editor.name,
      editorEmail: editor.email,
    }));
  };

  const sendDraftToClient = async (edit: EditingProject) => {
    const clientEmail = findClientEmail(edit, leads);
    if (!clientEmail) {
      toast.error('Client email is missing', {
        description: 'Add the client email to the lead or editing row before sending the draft.',
      });
      return;
    }

    setSendingDraftId(edit.editId);
    try {
      await postWebhook('/send-draft-to-client', {
        edit_id: edit.editId,
        client_name: edit.clientName,
        client_email: clientEmail,
        draft_link: edit.currentDraftLink,
        revision_count: edit.revisionCount,
        assigned_salesperson_email: findAssignedSalespersonEmail(edit, leads),
      });
      toast.success('Draft sent to client!');
      setEditing((prev) =>
        prev.map((item) => (item.editId === edit.editId ? { ...item, status: 'Draft Sent' } : item))
      );
      await refreshEditing();
    } catch (error) {
      toast.error('Failed to send draft', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSendingDraftId(null);
    }
  };

  const approveExtraRevision = async (edit: EditingProject) => {
    setApprovingExtraId(edit.editId);
    try {
      await postWebhook('/confirm-extra-revision', {
        edit_id: edit.editId,
        extra_revision_cost: extraCosts[edit.editId] ?? edit.extraRevisionCost,
      });
      toast.success('Extra revision approved, editor notified!');
      setEditing((prev) =>
        prev.map((item) =>
          item.editId === edit.editId
            ? { ...item, status: 'Extra Revision Approved', extraRevisionApproved: true }
            : item
        )
      );
      await refreshEditing();
    } catch (error) {
      toast.error('Failed to approve extra revision', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setApprovingExtraId(null);
    }
  };

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
  const footageReady = useMemo(
    () => {
      const assignedShootIds = new Set(editing.map((edit) => edit.shootId).filter(Boolean));
      return shoots.filter(
        (shoot) =>
          shoot.driveLinkUploaded.trim().toLowerCase() === 'true' &&
          !assignedShootIds.has(shoot.shootId)
      );
    },
    [editing, shoots]
  );
  const inEditing = editing.filter((edit) => edit.status === 'Editing');
  const draftReady = editing.filter((edit) => edit.status === 'Draft Ready');
  const extraRevisionNeeded = editing.filter(isExtraRevisionNeeded);

  return (
    <div>
      <PageHeader title="Manager" description="Kanban board, assignments, and approvals" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Active Projects" value={activeProjects} icon={Briefcase} />
        <StatCard title="Pending Approvals" value={pendingApprovals} icon={CheckCircle} />
        <StatCard title="Scheduled Shoots" value={scheduledShoots} icon={Camera} />
        <StatCard title="Available Editors" value={availableEditors} icon={Scissors} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Footage Ready for Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {footageReady.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No uploaded footage waiting for review.
            </p>
          ) : (
            footageReady.map((shoot) => (
              <div
                key={shoot.id}
                className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{shoot.clientName || 'Untitled shoot'}</p>
                    {shoot.editedByShootTeam.trim().toLowerCase() === 'true' && (
                      <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30">
                        Changes Made
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(shoot.shootDate)} · {shoot.shootMemberName || 'No shoot member'}
                  </p>
                  {shoot.editedByShootTeam.trim().toLowerCase() === 'true' && (
                    <p className="text-xs text-orange-600">
                      Additional cost: {formatINR(Number(shoot.additionalCost || 0))}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild disabled={!shoot.dataLink}>
                    <a href={shoot.dataLink} target="_blank" rel="noreferrer">
                      View Footage <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button size="sm" onClick={() => openAssignShoot(shoot)}>
                    <Scissors className="mr-1.5 h-3.5 w-3.5" />
                    Assign Editor
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">In Editing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {inEditing.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No projects in editing.</p>
          ) : (
            inEditing.map((edit) => (
              <div key={edit.editId} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{edit.clientName}</p>
                  <p className="text-xs text-muted-foreground">{edit.editorName} · {edit.serviceType || 'Edit'}</p>
                </div>
                <Badge variant="outline">Deadline {edit.deadlineAt || '-'}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Verify Editor Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {draftReady.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No drafts ready for manager review.</p>
          ) : (
            draftReady.map((edit) => (
              <div key={edit.editId} className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-medium">{edit.clientName}</p>
                  <p className="text-xs text-muted-foreground">{edit.editorName} · {edit.serviceType || 'Edit'}</p>
                </div>
                <p className="text-xs text-muted-foreground">Deadline: {edit.deadlineAt || '-'}</p>
                <Button variant="outline" size="sm" asChild disabled={!edit.currentDraftLink}>
                  <a href={edit.currentDraftLink} target="_blank" rel="noreferrer">
                    View Draft <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button size="sm" onClick={() => sendDraftToClient(edit)} disabled={sendingDraftId === edit.editId}>
                  Send to Client
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Extra Revision Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {extraRevisionNeeded.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No extra revision approvals pending.</p>
          ) : (
            extraRevisionNeeded.map((edit) => (
              <div key={edit.editId} className="grid gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 lg:grid-cols-[1.2fr_1fr_180px_auto] lg:items-center">
                <div>
                  <p className="text-sm font-medium">{edit.clientName}</p>
                  <p className="text-xs text-muted-foreground">{edit.editorName} · Revision {edit.revisionCount}/{edit.maxFreeRevisions}</p>
                </div>
                <Badge className="w-fit border-amber-500/40 bg-amber-500/15 text-amber-600">Sales confirmation needed</Badge>
                <Input
                  type="number"
                  min="0"
                  placeholder="Extra cost"
                  value={extraCosts[edit.editId] ?? edit.extraRevisionCost}
                  onChange={(event) =>
                    setExtraCosts((prev) => ({ ...prev, [edit.editId]: event.target.value }))
                  }
                />
                <Button size="sm" onClick={() => approveExtraRevision(edit)} disabled={approvingExtraId === edit.editId}>
                  Approve Extra Revision
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

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

      <Dialog open={Boolean(assignShoot)} onOpenChange={(open) => !open && setAssignShoot(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Assign Editor</DialogTitle>
            <DialogDescription>Send footage to editing and notify the selected editor.</DialogDescription>
          </DialogHeader>
          {assignShoot && (
            <form onSubmit={handleAssignEditor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assign-client">Client Name</Label>
                  <Input id="assign-client" value={assignShoot.clientName} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-type">Service Type</Label>
                  <Input
                    id="service-type"
                    required
                    value={assignForm.serviceType}
                    onChange={(event) => setAssignForm((prev) => ({ ...prev, serviceType: event.target.value }))}
                    placeholder="Podcast / Reel / Long Format"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Editor</Label>
                  <Select value={assignForm.editorName} onValueChange={handleEditorChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EDITING_EDITORS.map((editor) => (
                        <SelectItem key={editor.name} value={editor.name}>{editor.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editor-email">Editor Email</Label>
                  <Input
                    id="editor-email"
                    type="email"
                    required
                    value={assignForm.editorEmail}
                    onChange={(event) => setAssignForm((prev) => ({ ...prev, editorEmail: event.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="data-link">Data Link</Label>
                  <Input
                    id="data-link"
                    required
                    value={assignForm.dataLink}
                    onChange={(event) => setAssignForm((prev) => ({ ...prev, dataLink: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total-service">Total Service</Label>
                  <Input
                    id="total-service"
                    type="number"
                    min="1"
                    required
                    value={assignForm.totalService}
                    onChange={(event) => setAssignForm((prev) => ({ ...prev, totalService: event.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAssignShoot(null)}>Cancel</Button>
                <Button type="submit" disabled={assigningEditor}>Assign Editor</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
