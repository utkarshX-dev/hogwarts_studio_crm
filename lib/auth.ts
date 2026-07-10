export type UserRole = 'manager' | 'sales' | 'editor' | 'admin' | 'shoot';

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  username: string;
  role: UserRole;
  redirectTo: string;
}

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, role: UserRole, password?: string) => Promise<boolean>;
  logout: () => void;
  initAuth: () => void;
}

export const MOCK_USERS: Record<UserRole, Omit<User, 'role'>> = {
  manager: {
    id: 'u001',
    name: 'Albus Dumbledore',
    initials: 'AD',
    email: 'albus@howgartsmedia.com',
    username: 'manager',
    redirectTo: '/manager',
  },
  sales: {
    id: 'u002',
    name: 'Shubham',
    initials: 'S',
    email: 'shubham@howgartsmedia.com',
    username: 'sales',
    redirectTo: '/sales',
  },
  editor: {
    id: 'u003',
    name: 'Editor',
    initials: 'E',
    email: 'editor@hogwartsmedia.com',
    username: 'editor',
    redirectTo: '/editor',
  },
  admin: {
    id: 'u004',
    name: 'Admin User',
    initials: 'AU',
    email: 'admin@howgartsmedia.com',
    username: 'admin',
    redirectTo: '/manager',
  },
  shoot: {
    id: 'u005',
    name: 'Shoot Team',
    initials: 'ST',
    email: 'shoot@howgartsmedia.com',
    username: 'shoot',
    redirectTo: '/shoot',
  },
};

export const PASSWORD = 'password';
export const SESSION_KEY = 'howgarts_session';
