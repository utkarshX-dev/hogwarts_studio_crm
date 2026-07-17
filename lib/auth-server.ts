import { cookies } from 'next/headers';
import { BACKEND_USERS, type BackendUser } from './backend-users';

export function getAuthenticatedUser(): BackendUser | null {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('howgarts_session');
    if (!sessionCookie?.value) return null;

    const parsed = JSON.parse(sessionCookie.value);
    if (!parsed || !parsed.email) return null;

    const user = BACKEND_USERS.find(
      (u) => u.email.toLowerCase() === parsed.email.toLowerCase()
    );
    if (!user) return null;

    // Return user details without password
    const { password, ...sanitized } = user;
    return sanitized as BackendUser;
  } catch (error) {
    console.error('Error getting server authenticated user:', error);
    return null;
  }
}
