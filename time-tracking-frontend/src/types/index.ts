export interface TimeEntry {
  id?: string;
  date: string;
  project: string;
  hours: number;
  userId?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'USER';
  managerId?: string;
}

export interface FormError {
  field: string;
  message: string;
}
