import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { BACKEND_USERS } from '@/lib/backend-users';

export const dynamic = 'force-dynamic';

export async function GET() {
  const currentUser = getAuthenticatedUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Sanitize the users array to exclude passwords
  const sanitizedUsers = BACKEND_USERS.map(({ password, ...rest }) => rest);
  return NextResponse.json({ success: true, users: sanitizedUsers });
}
