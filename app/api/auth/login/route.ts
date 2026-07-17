import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_USERS } from '@/lib/backend-users';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = BACKEND_USERS.find((u) => u.email.toLowerCase() === email);

    if (!user || user.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Incorrect email or password' },
        { status: 401 }
      );
    }

    const { password: _, ...sanitizedUser } = user;

    cookies().set('howgarts_session', JSON.stringify(sanitizedUser), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: false, // Allow client to read if needed, but secure by path
    });

    return NextResponse.json({ success: true, user: sanitizedUser });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
