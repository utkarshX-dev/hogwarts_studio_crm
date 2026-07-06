'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  FileText,
  HardDrive,
  MessageSquare,
  Scissors,
  Send,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatter';
import { useAuth } from '@/lib/auth-context';
import type { EditingProject } from '@/lib/sheets/types';
import { postWebhook } from '@/lib/editing';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DELIVERABLE_FIELDS = [
  { key: 'podcastDraft', label: 'Podcast Draft', pill: '🎙 Podcast Drafts' },
  { key: 'podcastEdit', label: 'Podcast Edit', pill: '🎙 Podcast Edits' },
  { key: 'reelDraft', label: 'Reel Draft', pill: '🎬 Reel Drafts' },
  { key: 'reel', label: 'Reel Edit', pill: '🎬 Reel Edits' },
  { key: 'longFormatVideo', label: 'Long Format Video', pill: '📹 Long Format' },
  { key: 'teaserDemo', label: 'Teaser Demo', pill: '🎯 Teaser Demos' },
  { key: 'teaser', label: 'Teaser', pill: '🎯 Teasers' },
  { key: 'thumbnail', label: 'Thumbnail', pill: '🖼 Thumbnails' },
] as const;

type DeliverableKey = (typeof DELIVERABLE_FIELDS)[number]['key'];

function quantity(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function projectDeliverables(edit: EditingProject) {
  return DELIVERABLE_FIELDS.map((field) => ({
    ...field,
    count: quantity(String(edit[field.key] ?? '0')),
  })).filter((item) => item.count > 0);
}

function isSameEditor(edit: EditingProject, name = '', email = '') {
  const editorName = edit.editorName.trim().toLowerCase();
  const editorEmail = edit.editorEmail.trim().toLowerCase();
  return editorName === name.trim().toLowerCase() || editorEmail === email.trim().toLowerCase();
}

function hoursUntil(value: string) {
  if (!value) return null;
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return null;
  return (deadline.getTime() - Date.now()) / 36e5;
}

function DeadlineBadge({ deadlineAt }: { deadlineAt: string }) {
  const hours = hoursUntil(deadlineAt);
  if (hours === null) {
    return <Badge variant="outline">Deadline {deadlineAt || '-'}</Badge>;
  }

  const urgent = hours <= 6;
  const label =
    hours <= 0 ? 'Deadline passed' : `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m left`;

  return (
    <Badge
      className={cn(
        'w-fit',
        urgent
          ? 'animate-pulse border-red-500/40 bg-red-500/15 text-red-600'
          : 'border-blue-500/40 bg-blue-500/15 text-blue-600'
      )}
    >
      {label}
    </Badge>
  );
}

function DeliverableTracking({
  edit,
  done,
  onToggle,
}: {
  edit: EditingProject;
  done: Partial<Record<DeliverableKey, boolean>>;
  onToggle: (key: DeliverableKey, checked: boolean) => void;
}) {
  const deliverables = projectDeliverables(edit);

  if (deliverables.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap gap-1.5">
        {deliverables.map((item) => (
          <Badge key={item.key} variant="outline" className="text-xs">
            {item.pill} {item.count}
          </Badge>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Progress</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {deliverables.map((item) => {
            const checked = Boolean(done[item.key]);
            return (
              <label
                key={item.key}
                htmlFor={`done-${edit.editId}-${item.key}`}
                className={cn(
                  'flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm',
                  checked && 'bg-green-500/10 text-green-600 border-green-500/30'
                )}
              >
                <Checkbox
                  id={`done-${edit.editId}-${item.key}`}
                  checked={checked}
                  onCheckedChange={(value) => onToggle(item.key, Boolean(value))}
                />
                {item.label} ({item.count}) {checked ? 'Done' : ''}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RevisionText(edit: EditingProject) {
  return `Revision ${edit.revisionCount}/${edit.maxFreeRevisions}`;
}

export default function EditorPage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState<EditingProject[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [draftLinks, setDraftLinks] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [feedbackForms, setFeedbackForms] = useState<Record<string, boolean>>({});
  const [submittingDraftId, setSubmittingDraftId] = useState<string | null>(null);
  const [arrangingCallId, setArrangingCallId] = useState<string | null>(null);
  const [submittingFeedbackId, setSubmittingFeedbackId] = useState<string | null>(null);
  const [deliverableDone, setDeliverableDone] = useState<Record<string, Partial<Record<DeliverableKey, boolean>>>>({});

  const refreshEditing = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const response = await fetch('/api/editing', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to refresh editing rows');
      }
      setEditing(data.editing ?? []);
    } catch (error) {
      if (!silent) {
        toast.error('Failed to refresh editing rows', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshEditing(true);
    const interval = setInterval(() => refreshEditing(true), 30000);
    return () => clearInterval(interval);
  }, [refreshEditing]);

  const editorEdits = useMemo(
    () => {
      if (user?.role === 'manager' || user?.role === 'admin') return editing;
      return editing.filter((edit) => isSameEditor(edit, user?.name, user?.email));
    },
    [editing, user?.email, user?.name, user?.role]
  );

  const assigned = editorEdits.filter((edit) =>
    ['Editing', 'Extra Revision Approved'].includes(edit.status)
  );
  const drafts = editorEdits.filter((edit) => edit.status === 'Draft Sent');
  const revisions = editorEdits.filter((edit) => edit.status === 'Revision Requested');
  const delivered = editorEdits.filter((edit) => edit.status === 'Delivered' && edit.finalDelivered);

  const markDraftReady = async (edit: EditingProject) => {
    const draftLink = draftLinks[edit.editId] ?? '';
    if (!draftLink) return;

    setSubmittingDraftId(edit.editId);
    try {
      await postWebhook('/draft-ready', {
        edit_id: edit.editId,
        draft_link: draftLink,
        revision_count: edit.revisionCount,
      });
      toast.success(edit.status === 'Revision Requested' ? 'Revision marked done!' : 'Draft marked ready!');
      setDraftLinks((prev) => ({ ...prev, [edit.editId]: '' }));
      await refreshEditing(true);
    } catch (error) {
      toast.error('Failed to mark draft ready', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSubmittingDraftId(null);
    }
  };

  const arrangeCall = async (edit: EditingProject) => {
    setArrangingCallId(edit.editId);
    try {
      await postWebhook('/arrange-call', {
        edit_id: edit.editId,
        editor_name: edit.editorName,
      });
      toast.success('Sales rep has been notified to arrange a call.');
      setFeedbackForms((prev) => ({ ...prev, [edit.editId]: true }));
    } catch (error) {
      toast.error('Failed to request call', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setArrangingCallId(null);
    }
  };

  const submitFeedback = async (edit: EditingProject) => {
    setSubmittingFeedbackId(edit.editId);
    try {
      await postWebhook('/submit-revision-feedback', {
        edit_id: edit.editId,
        feedback: feedback[edit.editId] ?? '',
        client_email: edit.emailId,
        submitted_by: 'editor',
      });
      toast.success("Feedback submitted on client's behalf.");
      setFeedback((prev) => ({ ...prev, [edit.editId]: '' }));
      setFeedbackForms((prev) => ({ ...prev, [edit.editId]: false }));
      await refreshEditing(true);
    } catch (error) {
      toast.error('Failed to submit feedback', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSubmittingFeedbackId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Editor"
        description="Post-production queue, drafts, and revisions"
        actions={
          <Button variant="outline" size="sm" onClick={() => refreshEditing()} disabled={refreshing}>
            Refresh
          </Button>
        }
      />

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
            {assigned.map((edit) => (
              <Card key={edit.editId}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{edit.clientName}</p>
                      <p className="text-sm text-muted-foreground">{edit.serviceType || 'Edit'}</p>
                    </div>
                    <Badge variant="outline">{edit.status}</Badge>
                  </div>
                  <DeadlineBadge deadlineAt={edit.deadlineAt} />
                  <Button variant="outline" size="sm" asChild disabled={!edit.dataLink}>
                    <a href={edit.dataLink} target="_blank" rel="noreferrer">
                      <HardDrive className="mr-1.5 h-3.5 w-3.5" />
                      View Footage
                    </a>
                  </Button>
                  <DeliverableTracking
                    edit={edit}
                    done={deliverableDone[edit.editId] ?? {}}
                    onToggle={(key, checked) =>
                      setDeliverableDone((prev) => ({
                        ...prev,
                        [edit.editId]: {
                          ...(prev[edit.editId] ?? {}),
                          [key]: checked,
                        },
                      }))
                    }
                  />
                  <div className="space-y-2 border-t border-border pt-3">
                    <Label htmlFor={`draft-${edit.editId}`}>Draft Link</Label>
                    <Input
                      id={`draft-${edit.editId}`}
                      value={draftLinks[edit.editId] ?? ''}
                      onChange={(event) =>
                        setDraftLinks((prev) => ({ ...prev, [edit.editId]: event.target.value }))
                      }
                      placeholder="https://drive.google.com/..."
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => markDraftReady(edit)}
                      disabled={!draftLinks[edit.editId] || submittingDraftId === edit.editId}
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Mark Draft Ready
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {assigned.length === 0 && (
              <Card className="md:col-span-2">
                <CardContent className="py-12 text-center">
                  <Scissors className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No assigned edits for this editor.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="drafts" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {drafts.map((edit) => (
              <Card key={edit.editId}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{edit.clientName}</p>
                    <Badge variant="outline">{RevisionText(edit)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sent {edit.assignedAt ? formatRelativeTime(edit.assignedAt) : 'to client'}
                  </p>
                  <Button variant="outline" size="sm" asChild disabled={!edit.currentDraftLink}>
                    <a href={edit.currentDraftLink} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      View Draft
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
            {drafts.length === 0 && (
              <Card><CardContent className="py-12 text-center"><p className="text-sm text-muted-foreground">No drafts awaiting client review.</p></CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="revisions" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {revisions.map((edit) => (
              <Card key={edit.editId}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{edit.clientName}</p>
                      <p className="text-sm text-muted-foreground">{edit.serviceType || 'Edit'}</p>
                    </div>
                    <Badge className="border-red-500/40 bg-red-500/15 text-red-600">
                      {RevisionText(edit)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Feedback source is expected from the Revisions sheet or n8n-enriched edit record.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor={`revision-draft-${edit.editId}`}>Updated Draft Link</Label>
                    <Input
                      id={`revision-draft-${edit.editId}`}
                      value={draftLinks[edit.editId] ?? ''}
                      onChange={(event) =>
                        setDraftLinks((prev) => ({ ...prev, [edit.editId]: event.target.value }))
                      }
                      placeholder="https://drive.google.com/updated..."
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => markDraftReady(edit)}
                      disabled={!draftLinks[edit.editId] || submittingDraftId === edit.editId}
                    >
                      Mark Revision Done
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => arrangeCall(edit)} disabled={arrangingCallId === edit.editId}>
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                      Arrange Call
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFeedbackForms((prev) => ({ ...prev, [edit.editId]: !prev[edit.editId] }))}
                    >
                      Fill Feedback
                    </Button>
                  </div>
                  {feedbackForms[edit.editId] && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <Label htmlFor={`feedback-${edit.editId}`}>Client Feedback</Label>
                      <Textarea
                        id={`feedback-${edit.editId}`}
                        rows={3}
                        value={feedback[edit.editId] ?? ''}
                        onChange={(event) =>
                          setFeedback((prev) => ({ ...prev, [edit.editId]: event.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        onClick={() => submitFeedback(edit)}
                        disabled={!feedback[edit.editId] || submittingFeedbackId === edit.editId}
                      >
                        Submit Feedback
                      </Button>
                    </div>
                  )}
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
            {delivered.map((edit) => (
              <Card key={edit.editId}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{edit.clientName}</p>
                    <Badge className="border-green-500/40 bg-green-500/15 text-green-600">Delivered</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{edit.serviceType || 'Completed project'}</p>
                  {edit.currentDraftLink && (
                    <a href={edit.currentDraftLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[#58A6FF] hover:underline">
                      <CheckCircle className="h-3 w-3" />
                      Final delivery
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
            {delivered.length === 0 && (
              <Card><CardContent className="py-12 text-center"><p className="text-sm text-muted-foreground">No delivered edits yet.</p></CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
