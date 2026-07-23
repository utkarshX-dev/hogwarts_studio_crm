import type { UserRole } from './auth';

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  role: UserRole;
  initials: string;
  username: string;
  redirectTo: string;
  password?: string;
}

export const BACKEND_USERS: BackendUser[] = [
  {
    id: 'u1',
    name: 'Isha Malhotra',
    email: 'isha@hogwartsstudios.com',
    phone: '9667474789',
    designation: 'Branch Head',
    role: 'manager',
    initials: 'IM',
    username: 'isha',
    redirectTo: '/manager',
    password: process.env.ISHA_PASSWORD || 'isha123',
  },
  {
    id: 'u2',
    name: 'Krishna Tiwari',
    email: 'krishna.tiwari@hogwartsstudios.com',
    phone: '9717817121',
    designation: 'Sales & Marketing Executive',
    role: 'sales',
    initials: 'KT',
    username: 'krishna',
    redirectTo: '/sales',
    password: process.env.KRISHNA_PASSWORD || 'krishna123',
  },
  {
    id: 'u3',
    name: 'Shubham Singh Rana',
    email: 'mamgai75@gmail.com',
    phone: '9870875693',
    designation: 'Executive - Creative Team',
    role: 'editor',
    initials: 'SSR',
    username: 'shubham',
    redirectTo: '/editor',
    password: process.env.SHUBHAM_PASSWORD || 'shubham123',
  },
  {
    id: 'u4',
    name: 'Deepak Sharma',
    email: 'mamgai75@gmail.com',
    phone: '7404409453',
    designation: 'Manager - Creative Team',
    role: 'editor',
    initials: 'DS',
    username: 'deepak',
    redirectTo: '/editor',
    password: process.env.DEEPAK_PASSWORD || 'deepak123',
  },
  {
    id: 'u5',
    name: 'Mayank Saxena',
    email: 'mayank@hogwartsstudios.com',
    phone: '9149325621',
    designation: 'Manager - Production Team',
    role: 'shoot',
    initials: 'MS',
    username: 'mayank',
    redirectTo: '/shoot',
    password: process.env.MAYANK_PASSWORD || 'mayank123',
  },
  {
    id: 'u6',
    name: 'Krishan Kunal Bagoria',
    email: 'kkb@hogwartsstudios.com',
    phone: '8368065462',
    designation: 'Founder / CEO',
    role: 'manager',
    initials: 'KKB',
    username: 'kkb',
    redirectTo: '/manager',
    password: process.env.KKB_PASSWORD || 'kkb123',
  },
];

export function updateBackendUser(id: string, data: { email?: string; username?: string; password?: string }) {
  const user = BACKEND_USERS.find((u) => u.id === id);
  if (!user) return false;
  if (data.email) user.email = data.email.trim();
  if (data.username) user.username = data.username.trim().toLowerCase();
  if (data.password) user.password = data.password.trim();
  return true;
}
