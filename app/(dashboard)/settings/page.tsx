'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setUsername(user.username);
    }
  }, [user]);

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateProfile({
        email,
        username,
        password: password || undefined,
      });
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Account details and profile information" />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Profile Information</CardTitle>
              <CardDescription>Update your general account details and password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
                  <AvatarFallback className="bg-secondary text-foreground text-2xl font-semibold">
                    {user?.initials || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="font-bold text-xl text-foreground">{user?.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{user?.designation || 'Hogwarts Staff'}</p>
                  <div className="inline-block text-xs font-semibold uppercase tracking-wider bg-secondary border border-border text-foreground rounded-full px-3 py-1 mt-1 capitalize shadow-sm">
                    {user?.role === 'manager' ? 'Master Access' : user?.role === 'shoot' ? 'Shoot Team' : user?.role}
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1 bg-secondary/10 p-3 rounded-lg border border-border/40 md:col-span-2">
                  <span className="text-xs text-muted-foreground block uppercase font-semibold tracking-wider">Full Name</span>
                  <span className="font-semibold text-foreground text-base">{user?.name || '—'}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">System Username</Label>
                  <Input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-background/50 border-border/80 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background/50 border-border/80 focus:border-primary"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="password" className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background/50 border-border/80 focus:border-primary"
                  />
                </div>

                <div className="space-y-1 bg-secondary/10 p-3 rounded-lg border border-border/40">
                  <span className="text-xs text-muted-foreground block uppercase font-semibold tracking-wider">Contact Number</span>
                  <span className="font-semibold text-foreground text-base">{user?.phone || '—'}</span>
                </div>

                <div className="space-y-1 bg-secondary/10 p-3 rounded-lg border border-border/40">
                  <span className="text-xs text-muted-foreground block uppercase font-semibold tracking-wider">Designation</span>
                  <span className="font-semibold text-foreground text-base">{user?.designation || '—'}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/80 p-6 flex justify-end">
              <Button type="submit" disabled={submitting} className="min-w-[120px]">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
