'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader title="Settings" description="Organization profile and account preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-secondary border border-border text-lg font-medium">{user?.initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" defaultValue={user?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue={user?.email} />
            </div>
            <Button size="sm" onClick={() => toast.success('Profile Updated', { description: 'Changes saved successfully' })}>
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Organization</CardTitle>
            <CardDescription>Company metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org">Organization Name</Label>
              <Input id="org" defaultValue="Howgarts Media" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input id="domain" defaultValue="howgartsmedia.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" defaultValue="INR (₹)" disabled />
            </div>
            <Button size="sm" variant="outline" onClick={() => toast.success('Organization Updated', { description: 'Settings saved' })}>
              Save
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">n8n Webhooks</CardTitle>
            <CardDescription>Automation endpoint configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook">n8n Base URL</Label>
              <Input id="webhook" placeholder="https://n8n.example.com/webhook" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apikey">API Key</Label>
              <Input id="apikey" type="password" placeholder="••••••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="razorpay">Razorpay Key ID</Label>
              <Input id="razorpay" placeholder="rzp_live_..." />
            </div>
            <Button size="sm" variant="outline" onClick={() => toast.success('Webhooks Configured', { description: 'n8n integration updated' })}>
              Test Connection
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Workflow Events</CardTitle>
          <CardDescription>Supported n8n automation triggers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              'lead.created', 'lead.updated', 'proposal.sent', 'payment.link.sent', 'payment.received',
              'shoot.assigned', 'shoot.completed', 'editor.assigned', 'draft.submitted', 'draft.approved',
              'revision.requested', 'project.delivered', 'project.closed', 'invoice.created', 'invoice.sent',
            ].map((event) => (
              <div key={event} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3FB950]" />
                <code className="text-xs font-mono">{event}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
