import axios from 'axios';
import { TimeEntry, Project, User, AuthResponse, RefreshResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await axiosInstance.post<RefreshResponse>('/auth/refresh/', {
            refresh: refreshToken,
          });

          localStorage.setItem('access_token', response.data.access);
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return axiosInstance(originalRequest);
        } catch {
          // Refresh token expired, logout user
          authApi.logout();
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

const timeEntriesApi = {
  getAssignedUsers: async (managerId: number) => {
    const response = await axiosInstance.get<User[]>(`/users/?manager=${managerId}`);
    return response;
  },
  exportMonthlyReportPDF: async (userId: number, month: string) => {
    const response = await axiosInstance.get<Blob>(`/saisie-temps/${userId}/report/${month}/`, {
      responseType: 'blob'
    });
    return response;
  },
  getAll: async () => {
    const response = await axiosInstance.get<TimeEntry[]>('/saisie-temps/');
    return response;
  },
  create: async (entry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await axiosInstance.post<TimeEntry>('/saisie-temps/', entry);
    return response;
  },
  update: async (id: number, entry: Partial<TimeEntry>) => {
    const response = await axiosInstance.patch<TimeEntry>(`/saisie-temps/${id}/`, entry);
    return response;
  },
  delete: async (id: number) => {
    const response = await axiosInstance.delete(`/saisie-temps/${id}/`);
    return response;
  },
  getMonthlyReport: async (userId: number, month: string) => {
    const response = await axiosInstance.get<TimeEntry[]>(`/saisie-temps/${userId}/monthly/${month}/`);
    return response;
  },
};

const projectsApi = {
  getAll: async () => {
    const response = await axiosInstance.get<Project[]>('/projets/');
    return response;
  },
  getProjectsForUsers: async (userId: number) => {
    const response = await axiosInstance.get<Project[]>(`/projets/?user=${userId}`);
    return response;
  },
  create: async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await axiosInstance.post<Project>('/projets/', project);
    return response;
  },
  update: async (id: number, project: Partial<Project>) => {
    const response = await axiosInstance.patch<Project>(`/projets/${id}/`, project);
    return response;
  },
  delete: async (id: number) => {
    const response = await axiosInstance.delete(`/projets/${id}/`);
    return response;
  },
  assignUsers: async (projectId: number, userIds: number[]) => {
    const response = await axiosInstance.post<{ message: string }>(`/projets/${projectId}/assign-users/`, {
      user_ids: userIds
    });
    return response;
  }
};

const authApi = {
  login: async (username: string, password: string) => {
    const response = await axiosInstance.post<AuthResponse>('/auth/login/', {
      username,
      password,
    });
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    // Stocker les informations utilisateur
    const userData = {
      id: response.data.id,
      username: response.data.username,
      role: response.data.role,
      is_superuser: response.data.is_superuser,
      is_staff: response.data.is_staff
    };
    localStorage.setItem('user', JSON.stringify(userData));
    return response;
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
  getCurrentUser: async () => {
    const response = await axiosInstance.get<User>('/users/me/');
    return response;
  },
  getAllUsers: async () => {
    const response = await axiosInstance.get<User[]>('/users/');
    return response;
  },
  createUser: async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await axiosInstance.post<User>('/users/', userData);
    return response;
  },
  updateUser: async (id: number, userData: Partial<User>) => {
    const response = await axiosInstance.patch<User>(`/users/${id}/`, userData);
    return response;
  },
  deleteUser: async (id: number) => {
    const response = await axiosInstance.delete(`/users/${id}/`);
    return response;
  },
  updateUserRole: async (id: number, role: User['role']) => {
    const response = await axiosInstance.patch<User>(`/users/${id}/`, { role });
    return response;
  },
  updateUserManager: async (id: number, manager: number) => {
    const response = await axiosInstance.patch<User>(`/users/${id}/`, { manager });
    return response;
  },
};

const api = {
  timeEntriesApi,
  projectsApi,
  authApi
};

export { timeEntriesApi, projectsApi, authApi };
export default api;
