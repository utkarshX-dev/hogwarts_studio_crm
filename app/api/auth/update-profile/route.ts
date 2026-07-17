import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { updateBackendUser, BACKEND_USERS } from '@/lib/backend-users';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authenticatedUser = getAuthenticatedUser();
    if (!authenticatedUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const email = String(body.email ?? '').trim();
    const username = String(body.username ?? '').trim().toLowerCase();
    const password = String(body.password ?? '').trim();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email cannot be empty' }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json({ success: false, error: 'Username cannot be empty' }, { status: 400 });
    }

    // Check if email or username is already taken by another user
    const emailExists = BACKEND_USERS.some(
      (u) => u.id !== authenticatedUser.id && u.email.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) {
      return NextResponse.json({ success: false, error: 'Email address is already in use' }, { status: 400 });
    }

    const usernameExists = BACKEND_USERS.some(
      (u) => u.id !== authenticatedUser.id && u.username.toLowerCase() === username.toLowerCase()
    );
    if (usernameExists) {
      return NextResponse.json({ success: false, error: 'Username is already in use' }, { status: 400 });
    }

    const success = updateBackendUser(authenticatedUser.id, {
      email,
      username,
      password: password || undefined,
    });

    if (!success) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const updatedUser = BACKEND_USERS.find((u) => u.id === authenticatedUser.id);
    if (!updatedUser) {
      return NextResponse.json({ success: false, error: 'Error retrieving updated user' }, { status: 500 });
    }

    const { password: _, ...sanitizedUser } = updatedUser;

    cookies().set('howgarts_session', JSON.stringify(sanitizedUser), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
    });

    return NextResponse.json({ success: true, user: sanitizedUser });
  } catch (error) {
    console.error('Update profile API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
