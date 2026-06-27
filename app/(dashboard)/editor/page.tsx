'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Scissors, Clock, CheckCircle, AlertCircle, Upload, FileText, HardDrive, MessageSquare, Send,
} from 'lucide-react';
import { PROJECTS, EDITORS } from '@/lib/mock-data';
import { formatINR, formatDate, formatRelativeTime, titleCase } from '@/lib/formatter';
import { useWorkflow } from '@/hooks/use-workflow';
import { useAuth } from '@/lib/auth-context';
import type { Project } from '@/lib/types';
import { toast } from 'sonner';

export default function EditorPage() {
  const { user } = useAuth();
  const { triggerWorkflow, triggering } = useWorkflow();
  const [detail, setDetail] = useState<Project | null>(null);
  const [open, setOpen] = useState(false);
  const [draftLink, setDraftLink] = useState('');
  const [finalLink, setFinalLink] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');

  const editor = EDITORS[0];
  const assigned = PROJECTS.filter((p) => p.editor?.id === editor.id && ['editor_assigned', 'editing'].includes(p.status));
  const drafts = PROJECTS.filter((p) => p.editor?.id === editor.id && p.status === 'draft_sent');
  const revisions = PROJECTS.filter((p) => p.editor?.id === editor.id && p.status === 'in_revision');
  const delivered = PROJECTS.filter((p) => p.editor?.id === editor.id && ['delivered', 'closed', 'approved'].includes(p.status));

  const openDetail = (p: Project) => { setDetail(p); setOpen(true); };

  const submitDraft = async (p: Project) => {
    await triggerWorkflow('draft.submitted', {
      projectId: p.id,
      clientId: p.client.id,
      data: { draftLink },
      triggeredBy: user?.name ?? 'editor',
    });
    toast.success('Draft Submitted', { description: `${p.client.company} draft sent for review` });
    setOpen(false);
    setDraftLink('');
  };

  const submitFinal = async (p: Project) => {
    await triggerWorkflow('project.delivered', {
      projectId: p.id,
      clientId: p.client.id,
      data: { finalLink },
      triggeredBy: user?.name ?? 'editor',
    });
    toast.success('Final Video Delivered', { description: `${p.client.company} final files delivered` });
    setOpen(false);
    setFinalLink('');
  };

  const startEditing = async (p: Project) => {
    await triggerWorkflow('lead.updated', {
      projectId: p.id,
      data: { from: 'editor_assigned', to: 'editing' },
      triggeredBy: user?.name ?? 'editor',
    });
    toast.success('Editing Started', { description: `${p.client.company} now in editing` });
  };

  return (
    <div>
      <PageHeader title="Editor" description="Post-production queue, drafts, and revisions" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Assigned" value={assigned.length} icon={Scissors} />
        <StatCard title="Drafts Sent" value={drafts.length} icon={FileText} />
        <StatCard title="In Revision" value={revisions.length} icon={AlertCircle} />
        <StatCard title="Delivered" value={delivered.length} icon={CheckCircle} />
      </div>

      <Tabs defaultValue="assigned">
        <TabsList>
          <TabsTrigger value="assigned">Assigned</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="revisions">Revisions</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assigned.map((p) => (
              <Card key={p.id} className="cursor-pointer hover:border-foreground/20" onClick={() => openDetail(p)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <PriorityBadge priority={p.priority} />
                    <StatusBadge status={p.status} />
                  </div>
                  <div>
                    <p className="font-medium">{p.client.company}</p>
                    <p className="text-sm text-muted-foreground">{titleCase(p.service)}</p>
                  </div>
                  {p.driveLink && (
                    <a href={p.driveLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-[#58A6FF] hover:underline">
                      <HardDrive className="h-3 w-3" /> Footage on Drive
                    </a>
                  )}
                  {p.requirements && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.requirements}</p>
                  )}
                  <Button size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); startEditing(p); }} disabled={triggering['lead.updated']}>
                    <Scissors className="mr-1.5 h-3.5 w-3.5" />
                    {p.status === 'editing' ? 'In Progress' : 'Start Editing'}
                  </Button>
                </CardContent>
              </Card>
            ))}
            {assigned.length === 0 && (
              <Card className="md:col-span-2">
                <CardContent className="py-12 text-center">
                  <Scissors className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No projects assigned. Waiting for allocation.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="drafts" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {drafts.map((p) => (
              <Card key={p.id} className="cursor-pointer hover:border-foreground/20" onClick={() => openDetail(p)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{p.client.company}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.draftLink && (
                    <a href={p.draftLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-[#58A6FF] hover:underline">
                      <FileText className="h-3 w-3" /> View draft
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">Awaiting client review</p>
                </CardContent>
              </Card>
            ))}
            {drafts.length === 0 && (
              <Card><CardContent className="py-12 text-center"><p className="text-sm text-muted-foreground">No drafts awaiting review.</p></CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="revisions" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {revisions.map((p) => (
              <Card key={p.id} className="cursor-pointer hover:border-foreground/20" onClick={() => openDetail(p)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{p.client.company}</p>
                    <span className="text-xs text-[#F85149]">Revision {p.revisions}/2</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.timeline[0]?.description}</p>
                  <p className="text-[11px] text-muted-foreground">{formatRelativeTime(p.timeline[0]?.timestamp)}</p>
                </CardContent>
              </Card>
            ))}
            {revisions.length === 0 && (
              <Card><CardContent className="py-12 text-center"><p className="text-sm text-muted-foreground">No revisions requested.</p></CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="delivered" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {delivered.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{p.client.company}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.draftLink && (
                    <a href={p.draftLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-[#58A6FF] hover:underline">
                      <CheckCircle className="h-3 w-3" /> Final delivery
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
            {delivered.length === 0 && (
              <Card><CardContent className="py-12 text-center"><p className="text-sm text-muted-foreground">No delivered projects yet.</p></CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Editor Detail Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{detail.client.company} <StatusBadge status={detail.status} /></DialogTitle>
                <DialogDescription>{titleCase(detail.service)} · Revision {detail.revisions}/2</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {detail.requirements && (
                  <div>
                    <p className="text-xs font-medium mb-1.5">Requirements</p>
                    <p className="text-sm text-muted-foreground">{detail.requirements}</p>
                  </div>
                )}
                {detail.driveLink && (
                  <a href={detail.driveLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border border-border p-2.5 text-sm text-[#58A6FF] hover:bg-secondary/50">
                    <HardDrive className="h-4 w-4" /> View raw footage on Drive
                  </a>
                )}
                {detail.draftLink && (
                  <a href={detail.draftLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border border-border p-2.5 text-sm text-[#58A6FF] hover:bg-secondary/50">
                    <FileText className="h-4 w-4" /> View current draft
                  </a>
                )}

                {detail.timeline.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2">Timeline</p>
                    <div className="space-y-2">
                      {detail.timeline.slice(0, 4).map((t) => (
                        <div key={t.id} className="text-sm">
                          <p className="font-medium">{t.event}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                          <p className="text-[11px] text-muted-foreground">{formatRelativeTime(t.timestamp)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {['editing', 'editor_assigned'].includes(detail.status) && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <p className="text-sm font-medium">Submit Draft</p>
                    <div className="space-y-2">
                      <Label htmlFor="draft">Draft Video Link</Label>
                      <Input id="draft" value={draftLink} onChange={(e) => setDraftLink(e.target.value)} placeholder="https://drive.google.com/draft..." />
                    </div>
                  </div>
                )}

                {detail.status === 'in_revision' && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <p className="text-sm font-medium">Resubmit After Revision</p>
                    <div className="space-y-2">
                      <Label htmlFor="revisionNotes">Revision Notes</Label>
                      <Textarea id="revisionNotes" value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} placeholder="What was changed..." rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="draft2">Updated Draft Link</Label>
                      <Input id="draft2" value={draftLink} onChange={(e) => setDraftLink(e.target.value)} placeholder="https://drive.google.com/updated..." />
                    </div>
                  </div>
                )}

                {detail.status === 'approved' && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <p className="text-sm font-medium">Upload Final Delivery</p>
                    <div className="space-y-2">
                      <Label htmlFor="final">Final Video Link</Label>
                      <Input id="final" value={finalLink} onChange={(e) => setFinalLink(e.target.value)} placeholder="https://drive.google.com/final..." />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                {['editing', 'editor_assigned'].includes(detail.status) && (
                  <Button onClick={() => submitDraft(detail)} disabled={!draftLink || triggering['draft.submitted']}>
                    <Send className="mr-1.5 h-4 w-4" /> Submit Draft
                  </Button>
                )}
                {detail.status === 'in_revision' && (
                  <Button onClick={() => submitDraft(detail)} disabled={!draftLink || triggering['draft.submitted']}>
                    <Send className="mr-1.5 h-4 w-4" /> Resubmit Draft
                  </Button>
                )}
                {detail.status === 'approved' && (
                  <Button onClick={() => submitFinal(detail)} disabled={!finalLink || triggering['project.delivered']}>
                    <Upload className="mr-1.5 h-4 w-4" /> Deliver Final
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
