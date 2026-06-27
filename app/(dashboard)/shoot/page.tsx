'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, MapPin, Users, HardDrive, CheckCircle, Clock, Upload, FileText, Calendar } from 'lucide-react';
import { PROJECTS } from '@/lib/mock-data';
import { formatINR, formatDate, titleCase } from '@/lib/formatter';
import { useWorkflow } from '@/hooks/use-workflow';
import { useAuth } from '@/lib/auth-context';
import type { Project } from '@/lib/types';
import { toast } from 'sonner';

export default function ShootPage() {
  const { user } = useAuth();
  const { triggerWorkflow, triggering } = useWorkflow();
  const [detail, setDetail] = useState<Project | null>(null);
  const [open, setOpen] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const [notes, setNotes] = useState('');

  const shootProjects = PROJECTS.filter((p) => p.shoot || p.shootDate || ['shoot_scheduled', 'footage_received'].includes(p.status));
  const today = PROJECTS.filter((p) => p.shoot && new Date(p.shoot.date).toDateString() === new Date().toDateString());
  const upcoming = PROJECTS.filter((p) => p.shoot && p.shoot.status === 'scheduled' && new Date(p.shoot.date) > new Date());
  const completed = PROJECTS.filter((p) => p.shoot?.status === 'completed' || p.status === 'footage_received');

  const openDetail = (p: Project) => { setDetail(p); setOpen(true); };

  const completeShoot = async (p: Project) => {
    await triggerWorkflow('shoot.completed', {
      projectId: p.id,
      clientId: p.client.id,
      data: { driveLink, notes },
      triggeredBy: user?.name ?? 'shoot_team',
    });
    toast.success('Shoot Completed', { description: `${p.client.company} footage uploaded` });
    setOpen(false);
    setDriveLink('');
    setNotes('');
  };

  const shootDates = shootProjects
    .filter((p) => p.shoot)
    .map((p) => new Date(p.shoot!.date));

  return (
    <div>
      <PageHeader title="Shoot" description="Production scheduling and shoot management" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Today's Shoots" value={today.length} icon={Camera} />
        <StatCard title="Upcoming" value={upcoming.length} icon={Clock} />
        <StatCard title="Completed" value={completed.length} icon={CheckCircle} />
        <StatCard title="Total Scheduled" value={shootProjects.length} icon={Calendar} />
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          {today.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Camera className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No shoots scheduled for today.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {today.map((p) => (
                <Card key={p.id} className="cursor-pointer hover:border-foreground/20" onClick={() => openDetail(p)}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={p.status} />
                      <PriorityBadge priority={p.priority} />
                    </div>
                    <div>
                      <p className="font-medium">{p.client.company}</p>
                      <p className="text-sm text-muted-foreground">{titleCase(p.service)}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {p.shoot?.location}</div>
                      <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-3.5 w-3.5" /> {p.shoot?.crew.join(', ')}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardContent className="p-2 flex justify-center">
                <CalendarPicker
                  mode="single"
                  modifiers={{ scheduled: shootDates }}
                  modifiersStyles={{ scheduled: { background: 'rgba(88,166,255,0.15)', border: '1px solid rgba(88,166,255,0.3)', borderRadius: '6px' } }}
                />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Scheduled Shoots</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {shootProjects.filter((p) => p.shoot).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-secondary/50" onClick={() => openDetail(p)}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary border border-border">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.client.company}</p>
                      <p className="text-xs text-muted-foreground">{p.shoot?.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{formatDate(p.shoot?.date)}</p>
                      <p className="text-xs text-muted-foreground">{p.shoot?.crew.length} crew</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map((p) => (
              <Card key={p.id} className="cursor-pointer hover:border-foreground/20" onClick={() => openDetail(p)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatDate(p.shoot?.date)}</span>
                    <PriorityBadge priority={p.priority} />
                  </div>
                  <p className="font-medium">{p.client.company}</p>
                  <p className="text-xs text-muted-foreground">{p.shoot?.location}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border">
                    <Users className="h-3 w-3" /> {p.shoot?.crew.join(', ')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completed.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{p.client.company}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.driveLink && (
                    <a href={p.driveLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-[#58A6FF] hover:underline">
                      <HardDrive className="h-3 w-3" /> View footage on Drive
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Shoot Detail / Upload Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.client.company}</DialogTitle>
                <DialogDescription>Shoot details and footage upload</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-md border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Date</span>
                    <span className="text-sm">{formatDate(detail.shoot?.date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Location</span>
                    <span className="text-sm">{detail.shoot?.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Service</span>
                    <span className="text-sm">{titleCase(detail.service)}</span>
                  </div>
                </div>

                {detail.shoot && (
                  <div>
                    <p className="text-xs font-medium mb-2">Crew</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.shoot.crew.map((c) => (
                        <span key={c} className="rounded-md border border-border bg-secondary px-2 py-1 text-xs">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {detail.shoot && (
                  <div>
                    <p className="text-xs font-medium mb-2">Equipment</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.shoot.equipment.map((e) => (
                        <span key={e} className="rounded-md border border-border bg-secondary px-2 py-1 text-xs">{e}</span>
                      ))}
                    </div>
                  </div>
                )}

                {detail.requirements && (
                  <div>
                    <p className="text-xs font-medium mb-1.5">Requirements</p>
                    <p className="text-sm text-muted-foreground">{detail.requirements}</p>
                  </div>
                )}

                {detail.status === 'shoot_scheduled' && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <p className="text-sm font-medium">Upload Footage</p>
                    <div className="space-y-2">
                      <Label htmlFor="drive">Google Drive Link</Label>
                      <Input id="drive" value={driveLink} onChange={(e) => setDriveLink(e.target.value)} placeholder="https://drive.google.com/..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Shoot Notes</Label>
                      <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes for the editor..." rows={3} />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                {detail.status === 'shoot_scheduled' && (
                  <Button onClick={() => completeShoot(detail)} disabled={!driveLink || triggering['shoot.completed']}>
                    <Upload className="mr-1.5 h-4 w-4" />
                    Complete & Upload
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
