import { TimeEntry, Project, User } from '../types';

const mockProjects: Project[] = [
  { id: 1, name: 'Website Redesign', description: 'Company website redesign project', created_by: 1 },
  { id: 2, name: 'Mobile App', description: 'Mobile application development', created_by: 1 },
  { id: 3, name: 'Database Migration', description: 'Legacy database migration', created_by: 1 }
];

const mockUsers: User[] = [
  { id: 1, username: 'admin', role: 'ADMIN' },
  { id: 2, username: 'manager', role: 'MANAGER' },
  { id: 3, username: 'user1', role: 'USER', manager: 2 },
  { id: 4, username: 'user2', role: 'USER', manager: 2 }
];

const mockTimeEntries: TimeEntry[] = [
  { id: 1, date: '2024-02-01', project: 1, hours: 8, user: 3 },
  { id: 2, date: '2024-02-01', project: 2, hours: 6, user: 4 },
  { id: 3, date: '2024-02-02', project: 1, hours: 7, user: 3 },
  { id: 4, date: '2024-02-02', project: 3, hours: 5, user: 4 }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const timeEntriesApi = {
  getAssignedUsers: async (managerId: number) => {
    await delay(500);
    const assignedUsers = mockUsers.filter(user => user.manager === managerId);
    return { data: assignedUsers };
  },
  exportMonthlyReportPDF: async (userId: number, month: string) => {
    await delay(500);
    const entries = mockTimeEntries.filter(entry => {
      const entryMonth = entry.date.substring(0, 7);
      return entry.user === userId && entryMonth === month;
    });
    

    const mockPdfContent = JSON.stringify(entries, null, 2);
    const blob = new Blob([mockPdfContent], { type: 'application/pdf' });
    return { data: blob };
  },
  getAll: async () => {
    await delay(500);
    return { data: mockTimeEntries };
  },
  create: async (entry: Omit<TimeEntry, 'id'>) => {
    await delay(500);
    const newEntry = {
      ...entry,
      id: Math.floor(Math.random() * 10000) + 1
    };
    mockTimeEntries.push(newEntry);
    return { data: newEntry };
  },
  update: async (id: number, entry: Partial<TimeEntry>) => {
    await delay(500);
    const index = mockTimeEntries.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Entry not found');
    mockTimeEntries[index] = { ...mockTimeEntries[index], ...entry };
    return { data: mockTimeEntries[index] };
  },
  delete: async (id: number) => {
    await delay(500);
    const index = mockTimeEntries.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Entry not found');
    mockTimeEntries.splice(index, 1);
    return { data: null };
  },
  getMonthlyReport: async (userId: number, month: string) => {
    await delay(500);
    const entries = mockTimeEntries.filter(entry => {
      const entryMonth = entry.date.substring(0, 7); 
      return entry.user === userId && entryMonth === month;
    });
    return { data: entries };
  },
};

export const projectsApi = {
  getAll: async () => {
    await delay(500);
    return { data: mockProjects };
  },
  create: async (project: Omit<Project, 'id'>) => {
    await delay(500);
    const newProject = {
      ...project,
      id: Math.random().toString(36).substr(2, 9)
    };
    mockProjects.push(newProject);
    return { data: newProject };
  },
  update: async (id: string, project: Partial<Project>) => {
    await delay(500);
    const index = mockProjects.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Project not found');
    mockProjects[index] = { ...mockProjects[index], ...project };
    return { data: mockProjects[index] };
  },
  delete: async (id: string) => {
    await delay(500);
    const index = mockProjects.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Project not found');
    mockProjects.splice(index, 1);
    return { data: null };
  },
};

export const authApi = {
  login: async (username: string, password: string) => {
    await delay(500);
    const user = mockUsers.find(u => u.username === username);
    if (!user || password !== 'password') { 
      throw new Error('Invalid credentials');
    }
    const token = 'mock-jwt-token';
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return { data: { token, user } };
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser: async () => {
    await delay(500);
    const userStr = localStorage.getItem('user');
    if (!userStr) throw new Error('Not authenticated');
    return { data: JSON.parse(userStr) };
  },
  getAllUsers: async () => {
    await delay(500);
    return { data: mockUsers };
  },
  createUser: async (userData: Omit<User, 'id'>) => {
    await delay(500);
    const newUser = {
      ...userData,
      id: Math.random().toString(36).substr(2, 9)
    };
    mockUsers.push(newUser);
    return { data: newUser };
  },
  updateUser: async (id: string, userData: Partial<User>) => {
    await delay(500);
    const index = mockUsers.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    mockUsers[index] = { ...mockUsers[index], ...userData };
    return { data: mockUsers[index] };
  },
  deleteUser: async (id: string) => {
    await delay(500);
    const index = mockUsers.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    mockUsers.splice(index, 1);
    return { data: null };
  },
  updateUserRole: async (id: string, role: string) => {
    await delay(500);
    const index = mockUsers.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    mockUsers[index] = { ...mockUsers[index], role: role as User['role'] };
    return { data: mockUsers[index] };
  },
  updateUserManager: async (id: string, managerId: string) => {
    await delay(500);
    const index = mockUsers.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    mockUsers[index] = { ...mockUsers[index], managerId };
    return { data: mockUsers[index] };
  },
};

export default {
  timeEntriesApi,
  projectsApi,
  authApi
};
