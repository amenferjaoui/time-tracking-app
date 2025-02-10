export interface TimeEntry {
  id?: number;
  date: string;
  projet: number;
  temps: number;
  user?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: number;
  nom: string;
  description?: string;
  manager: number;
  users?: User[];
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'admin' | 'manager' | 'user';  
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
  id: number;
  is_superuser: boolean;
  is_staff: boolean;
}

export interface RefreshResponse {
  access: string;
}

export interface ApiError {
  response?: {
    status?: number;
    data?: {
      [key: string]: string | string[];
    } | string;
  };
  message?: string;
}
