import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { fetchBackendUsersFromSheet, appendBackendUserToSheet, updateBackendUserInSheet } from '@/lib/google/sheets';
import type { BackendUser } from '@/lib/backend-users';

export const dynamic = 'force-dynamic';

export async function GET() {
  const currentUser = getAuthenticatedUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await fetchBackendUsersFromSheet();
  // Sanitize the users array to exclude passwords
  const sanitizedUsers = users.map(({ password, ...rest }) => rest);
  return NextResponse.json({ success: true, users: sanitizedUsers });
}

export async function POST(request: Request) {
  try {
    const currentUser = getAuthenticatedUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only manager and admin can add new employees
    if (!['manager', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const designation = String(body.designation ?? '').trim();
    const role = String(body.role ?? 'sales').trim() as any;
    const username = String(body.username ?? '').trim().toLowerCase();
    const redirectTo = String(body.redirectTo ?? '/sales').trim();
    const password = String(body.password ?? '').trim();

    if (!name || !email || !username || !password) {
      return NextResponse.json({ error: 'Name, email, username, and password are required' }, { status: 400 });
    }

    const users = await fetchBackendUsersFromSheet();

    // Check uniqueness
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 400 });
    }
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: 'Username is already in use' }, { status: 400 });
    }

    const newUser = await appendBackendUserToSheet({
      name,
      email,
      phone,
      designation,
      role,
      username,
      redirectTo,
      password,
    });

    const { password: _, ...sanitized } = newUser;
    return NextResponse.json({ success: true, user: sanitized }, { status: 201 });
  } catch (error) {
    console.error('Failed to create user in Google Sheets:', error);
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = getAuthenticatedUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only manager and admin can edit employees
    if (!['manager', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const id = String(body.id ?? '').trim();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const designation = String(body.designation ?? '').trim();
    const role = String(body.role ?? '').trim() as any;
    const username = String(body.username ?? '').trim().toLowerCase();
    const redirectTo = String(body.redirectTo ?? '').trim();
    const password = String(body.password ?? '').trim();

    if (!id || !name || !email || !username) {
      return NextResponse.json({ error: 'ID, name, email, and username are required' }, { status: 400 });
    }

    const users = await fetchBackendUsersFromSheet();

    // Check uniqueness
    if (users.some((u) => u.id !== id && u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 400 });
    }
    if (users.some((u) => u.id !== id && u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: 'Username is already in use' }, { status: 400 });
    }

    const updates: Partial<BackendUser> = {
      name,
      email,
      phone,
      designation,
      role: role || undefined,
      username,
      redirectTo: redirectTo || undefined,
    };
    if (password) {
      updates.password = password;
    }

    const success = await updateBackendUserInSheet(id, updates);
    if (!success) {
      return NextResponse.json({ error: 'User not found or update failed' }, { status: 404 });
    }

    // Fetch the updated user
    const updatedUsers = await fetchBackendUsersFromSheet();
    const updatedUser = updatedUsers.find((u) => u.id === id);
    if (!updatedUser) {
      return NextResponse.json({ error: 'Error retrieving updated user' }, { status: 500 });
    }

    const { password: _, ...sanitized } = updatedUser;

    // If the manager is updating their own profile, sync their active session cookie
    if (currentUser.id === id) {
      cookies().set('howgarts_session', JSON.stringify(sanitized), {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: false,
      });
    }

    return NextResponse.json({ success: true, user: sanitized });
  } catch (error) {
    console.error('Failed to update user in Google Sheets:', error);
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
