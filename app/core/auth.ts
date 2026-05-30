import { getDB, saveDB } from './store';

export interface UserProfile {
  id?: string;
  name: string;
  phone: string;
  role: 'Technician' | 'Dispatch' | 'Supervisor' | 'Project Manager' | 'Operations Manager' | 'CEO';
  status: 'Pending Approval' | 'Approved' | 'Suspended';
  salary_grade?: 'Grade A' | 'Grade B' | null;
  daily_rate?: number;
  created_at?: string;
}

export const getCurrentUser = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  const userStr = sessionStorage.getItem('ecoops_auth');
  return userStr ? JSON.parse(userStr) : null;
};

export const setCurrentUser = (user: UserProfile | null) => {
  if (typeof window !== 'undefined') {
    if (user) {
      sessionStorage.setItem('ecoops_auth', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('ecoops_auth');
    }
    window.dispatchEvent(new Event('ecoops-auth-change'));
  }
};
