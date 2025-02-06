export interface TimeEntry {
  id?: number;
  date: string;
  project: number;
  hours: number;
  user?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'manager' | 'user';  // Mis à jour pour correspondre au backend
  manager?: number;
  is_superuser: boolean;
  is_staff: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FormError {
  field: string;
  message: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  role: User['role'];
  username: string;
  is_superuser: boolean;
  is_staff: boolean;
}

export interface RefreshResponse {
  access: string;
}
