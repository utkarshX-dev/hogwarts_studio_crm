'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { SESSION_KEY, MOCK_USERS } from '@/lib/auth';
import type { UserRole } from '@/lib/types';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const PROFILE_ROLES: { value: UserRole; label: string }[] = [
  { value: 'manager', label: 'Manager (Albus Dumbledore)' },
  { value: 'sales', label: 'Sales Rep (Shubham)' },
  { value: 'editor', label: 'Editor' },
  { value: 'shoot', label: 'Shoot Team' },
  { value: 'admin', label: 'Admin User' },
];

export default function SettingsPage() {
  const { user, initAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'manager') {
      router.replace(user.redirectTo || '/dashboard');
    }
  }, [user, router]);

  const [selectedRole, setSelectedRole] = useState<UserRole>('manager');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Return null if not manager, to prevent flashing/rendering unauthorized content
  if (!user || user.role !== 'manager') {
    return null;
  }

  // Load custom configurations on role switch
  useEffect(() => {
    let usersConfig = MOCK_USERS;
    let passwordsConfig: Record<string, string> = {};

    if (typeof window !== 'undefined') {
      const savedConfig = window.localStorage.getItem('howgarts_users_config');
      if (savedConfig) {
        try {
          usersConfig = JSON.parse(savedConfig);
        } catch (e) {
          console.error('Failed to parse config:', e);
        }
      }
      const savedPasswords = window.localStorage.getItem('howgarts_users_passwords');
      if (savedPasswords) {
        try {
          passwordsConfig = JSON.parse(savedPasswords);
        } catch (e) {
          console.error('Failed to parse passwords:', e);
        }
      }
    }

    const details = usersConfig[selectedRole];
    if (details) {
      setEditUsername(details.username);
      setEditEmail(details.email);
    }
    setEditPassword(passwordsConfig[selectedRole] || 'password');
  }, [selectedRole]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!editUsername) {
        toast.error('Invalid Username', { description: 'Username cannot be empty.' });
        setLoading(false);
        return;
      }
      if (!editEmail || !editEmail.includes('@')) {
        toast.error('Invalid Email', { description: 'Please enter a valid email address.' });
        setLoading(false);
        return;
      }
      if (!editPassword || editPassword.length < 4) {
        toast.error('Weak Password', { description: 'Password must be at least 4 characters long.' });
        setLoading(false);
        return;
      }

      let usersConfig = { ...MOCK_USERS };
      let passwordsConfig: Record<string, string> = {};

      if (typeof window !== 'undefined') {
        const savedConfig = window.localStorage.getItem('howgarts_users_config');
        if (savedConfig) {
          try {
            usersConfig = JSON.parse(savedConfig);
          } catch (e) {
            console.error(e);
          }
        }
        const savedPasswords = window.localStorage.getItem('howgarts_users_passwords');
        if (savedPasswords) {
          try {
            passwordsConfig = JSON.parse(savedPasswords);
          } catch (e) {
            console.error(e);
          }
        }

        // Update selected profile's credentials
        usersConfig[selectedRole] = {
          ...usersConfig[selectedRole],
          username: editUsername,
          email: editEmail,
        };
        passwordsConfig[selectedRole] = editPassword;

        window.localStorage.setItem('howgarts_users_config', JSON.stringify(usersConfig));
        window.localStorage.setItem('howgarts_users_passwords', JSON.stringify(passwordsConfig));

        // If the selected profile matches the logged-in user, refresh their session
        if (user && user.role === selectedRole) {
          const updatedSession = {
            ...user,
            username: editUsername,
            email: editEmail,
          };
          window.localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
          initAuth();
        }
      }

      toast.success('Settings Saved', {
        description: `Credentials for ${selectedRole.toUpperCase()} profile updated.`,
      });
    } catch (error) {
      console.error('Failed to update credentials:', error);
      toast.error('Error', { description: 'Failed to update settings.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Account credentials and preferences" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Info Only Section */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Profile Information</CardTitle>
            <CardDescription>Your general account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-secondary border border-border text-lg font-medium">
                  {user?.initials || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-base">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground capitalize bg-secondary border border-border rounded-full px-2.5 py-0.5 w-fit mt-1">
                  {user?.role || 'Guest'}
                </p>
              </div>
            </div>
            <Separator />
            <div className="space-y-3.5 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Full Name</span>
                <span className="font-medium text-foreground">{user?.name || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Username</span>
                <span className="font-medium text-foreground">{user?.username || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">System Access Level</span>
                <span className="font-medium text-foreground capitalize">{user?.role || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Current Email Address</span>
                <span className="font-medium text-foreground">{user?.email || '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Credentials Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Security Settings</CardTitle>
            <CardDescription>Select any profile to update its login credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-select">Select Profile to Edit</Label>
                <Select value={selectedRole} onValueChange={(val: any) => setSelectedRole(val)}>
                  <SelectTrigger id="profile-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROFILE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-2" />

              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password">Password</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" size="sm" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
