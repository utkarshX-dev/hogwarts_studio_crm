'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Film, Loader2 } from 'lucide-react';

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'manager', label: 'Manager', desc: 'Full operational control' },
  { value: 'sales', label: 'Sales Rep', desc: 'Leads, proposals, clients' },
  { value: 'editor', label: 'Editor', desc: 'Editing queue & drafts' },
  { value: 'shoot', label: 'Shoot Team', desc: 'Shoot schedules & tasks' },
];

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('manager');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(username, role);
    if (ok) router.replace(role === 'editor' ? '/editor' : role === 'sales' ? '/sales' : role === 'shoot' ? '/shoot' : '/manager');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary border border-border">
            <Film className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Howgarts Media</h1>
            <p className="text-xs text-muted-foreground">Production CRM</p>
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Choose your role and enter your username</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
                        role === r.value
                          ? 'border-foreground/30 bg-secondary'
                          : 'border-border bg-transparent hover:bg-secondary/50'
                      }`}
                    >
                      <div className="text-sm font-medium">{r.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="manager / sales / editor / shoot"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" defaultValue="password" placeholder="password" />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Demo credentials — username: <span className="text-foreground font-medium">{role}</span>, password: <span className="text-foreground font-medium">password</span>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
