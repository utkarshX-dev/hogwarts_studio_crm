'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { AuthContextValue, UserRole, User } from './types';
import { MOCK_USERS, PASSWORD, SESSION_KEY } from './auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = useCallback(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    try {
      const session = window.localStorage.getItem(SESSION_KEY);
      if (session) setUser(JSON.parse(session));
    } catch (e) {
      console.warn('Failed to parse auth session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = useCallback(async (username: string, role: UserRole, password?: string) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    let usersConfig = MOCK_USERS;
    let passwordsConfig: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const savedConfig = window.localStorage.getItem('howgarts_users_config');
      if (savedConfig) {
        try {
          usersConfig = JSON.parse(savedConfig);
        } catch (e) {
          console.error('Failed to parse howgarts_users_config:', e);
        }
      }
      const savedPasswords = window.localStorage.getItem('howgarts_users_passwords');
      if (savedPasswords) {
        try {
          passwordsConfig = JSON.parse(savedPasswords);
        } catch (e) {
          console.error('Failed to parse howgarts_users_passwords:', e);
        }
      }
    }

    const details = usersConfig[role];
    const expectedPassword = passwordsConfig[role] || 'password';

    if (details && (username.trim().toLowerCase() === details.username.toLowerCase() || username.trim().toLowerCase() === details.email.toLowerCase())) {
      const inputPassword = password || '';
      if (inputPassword !== expectedPassword) {
        setIsLoading(false);
        toast.error('Authentication Failed', {
          description: 'Incorrect password',
        });
        return false;
      }

      const authed: User = { ...details, role };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(authed));
      }
      setUser(authed);
      setIsLoading(false);
      toast.success('Access Granted', {
        description: `Logged in as ${authed.name} (${role.toUpperCase()})`,
      });
      return true;
    }

    setIsLoading(false);
    toast.error('Authentication Failed', {
      description: 'Invalid credentials or role',
    });
    return false;
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_KEY);
    }
    setUser(null);
    toast.info('Session Ended', { description: 'Logged out successfully' });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, initAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
