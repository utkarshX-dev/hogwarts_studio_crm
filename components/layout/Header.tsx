'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Search, Bell, LogOut, User as UserIcon, Settings, Menu, Command } from 'lucide-react';
import { getNavForRole } from '@/lib/navigation';
import { ACTIVITY } from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/formatter';
import type { Lead } from '@/lib/sheets/types';
import { isPendingPaymentVerification } from '@/lib/sheets/payment-utils';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [pendingLeads, setPendingLeads] = useState<Lead[]>([]);
  const navItems = user ? getNavForRole(user.role) : [];

  const refreshPendingVerifications = useCallback(async () => {
    if (!user) {
      setPendingVerifications(0);
      setPendingLeads([]);
      return;
    }

    try {
      const response = await fetch('/api/clients', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) return;

      const leads: Lead[] = data.leads ?? [];
      const pending = leads.filter(
        (lead) =>
          isPendingPaymentVerification(lead) &&
          (lead.assignedTo === user.name || user.role === 'manager')
      );

      setPendingVerifications(pending.length);
      setPendingLeads(pending);
    } catch {
      // silently ignore header notification fetch errors
    }
  }, [user]);

  useEffect(() => {
    refreshPendingVerifications();
    const interval = setInterval(refreshPendingVerifications, 30000);
    const onLeadsUpdated = () => refreshPendingVerifications();
    window.addEventListener('leads-updated', onLeadsUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('leads-updated', onLeadsUpdated);
    };
  }, [refreshPendingVerifications]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <button
          onClick={() => setOpen(true)}
          className="hidden md:flex items-center gap-2 h-9 w-64 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground hover:border-foreground/20 transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>Search...</span>
          <kbd className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground border border-border rounded px-1 py-0.5">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {pendingVerifications > 0 && (
                <span
                  className={cn(
                    'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground'
                  )}
                >
                  {pendingVerifications > 9 ? '9+' : pendingVerifications}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>
              {pendingVerifications > 0
                ? `${pendingVerifications} payment${pendingVerifications === 1 ? '' : 's'} awaiting verification`
                : 'Notifications'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {pendingVerifications > 0 ? (
              pendingLeads.map((lead) => (
                <DropdownMenuItem
                  key={lead.leadId}
                  onClick={() => router.push('/sales')}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <span className="font-medium">{lead.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Screenshot uploaded — pending verification
                  </span>
                </DropdownMenuItem>
              ))
            ) : (
              ACTIVITY.slice(0, 5).map((a) => (
                <div key={a.id} className="px-2 py-2 text-sm">
                  <p className="text-foreground leading-tight">{a.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {a.actor} · {formatRelativeTime(a.timestamp)}
                  </p>
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-secondary transition-colors">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary border border-border text-xs font-medium">
                {user?.initials}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { logout(); router.push('/login'); }} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages and actions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  onSelect={() => { router.push(item.href); setOpen(false); }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
