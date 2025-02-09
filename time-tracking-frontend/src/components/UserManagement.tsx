import { useState, useEffect } from 'react';
import { User, ApiError } from '../types';
import { authApi } from '../services/api';
import '../styles/form.css';
import '../styles/table.css';

interface UserForm {
  username: string;
  password: string;
  email?: string;
  role: 'admin' | 'manager' | 'user';
  manager?: number;
  is_superuser?: boolean;
  is_staff?: boolean;
}

interface Props {
  currentUser: User;
}

export default function UserManagement({ currentUser }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [potentialManagers, setPotentialManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserForm>({
    username: '',
    password: '',
    role: 'user'
  });

  useEffect(() => {
    fetchUsers();
  }, [currentUser.id]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authApi.getAllUsers();
      const allUsers = response.data;
      
      // Si c'est un manager, on ne montre que ses utilisateurs
      const filteredUsers = currentUser.role === 'manager' 
        ? allUsers.filter(user => user.manager === currentUser.id || user.id === currentUser.id)
        : allUsers;
      
      setUsers(filteredUsers);
      setPotentialManagers(allUsers.filter(user => user.role === 'manager' || user.role === 'admin'));
    } catch (error) {
      console.error(error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      // Prepare base data
      const baseData = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        is_superuser: formData.role === 'admin',
        is_staff: formData.role === 'manager' || formData.role === 'admin',
        manager: currentUser.role === 'manager' && formData.role === 'user' ? currentUser.id : formData.manager
      };

      // Add password only if it's not empty or if creating new user
      const userData = !editingUser || formData.password
        ? { ...baseData, password: formData.password }
        : baseData;

      if (editingUser) {
        await authApi.updateUser(editingUser.id, userData);
        await fetchUsers(); // Refresh both users and potential managers
        setEditingUser(null);
      } else {
        await authApi.createUser(userData);
        await fetchUsers(); // Refresh both users and potential managers
      }
      setFormData({
        username: '',
        password: '',
        role: 'user'
      });
    } catch (error: unknown) {
      console.error(error);
      const apiError = error as ApiError;
      if (apiError.response?.data) {
        const data = apiError.response.data;
        if (typeof data === 'object' && data !== null) {
          const errorMessage = Object.entries(data)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          setError(errorMessage);
        } else if (data) {
          setError(data.toString());
        } else {
          setError('Failed to save user');
        }
      } else if (apiError.message) {
        setError(apiError.message);
      } else {
        setError('Failed to save user');
      }
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Ne pas afficher le mot de passe existant
      role: user.role,
      manager: user.manager,
      is_superuser: user.is_superuser,
      is_staff: user.is_staff
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      await authApi.deleteUser(id);
      await fetchUsers(); // Refresh both users and potential managers lists
    } catch (error: unknown) {
      console.error(error);
      const apiError = error as ApiError;
      if (apiError.response?.data) {
        const data = apiError.response.data;
        if (typeof data === 'string') {
          setError(data);
        } else if (typeof data === 'object' && data !== null) {
          const errorMessage = Object.entries(data)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          setError(errorMessage);
        } else {
          setError('Failed to delete user');
        }
      } else if (apiError.message) {
        setError(apiError.message);
      } else {
        setError('Failed to delete user');
      }
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'user'
    });
  };

  const handleRoleChange = (role: 'admin' | 'manager' | 'user') => {
    setFormData({
      ...formData,
      role,
      // Clear manager if changing to admin or manager
      manager: role === 'admin' || role === 'manager' ? undefined : formData.manager
    });
  };

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="user-management">
      <div className="content-section">
        <h2>{editingUser ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}</h2>
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label>Nom d'utilisateur :</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              placeholder="Nom d'utilisateur"
            />
          </div>

          <div className="form-group">
            <label>Email :</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email"
            />
          </div>

          <div className="form-group">
            <label>Mot de passe :</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
              placeholder={editingUser ? 'Laisser vide pour ne pas modifier' : 'Mot de passe'}
            />
          </div>

          <div className="form-group">
            <label>Rôle :</label>
            <select
              value={formData.role}
              onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'manager' | 'user')}
              required
            >
              <option value="user">Utilisateur</option>
              {currentUser.is_superuser && (
                <>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrateur</option>
                </>
              )}
            </select>
          </div>

          {formData.role === 'user' && (
            <div className="form-group">
              <label>Manager :</label>
              {currentUser.role === 'manager' ? (
                <input
                  type="text"
                  value={currentUser.username}
                  disabled
                  className="disabled-input"
                />
              ) : (
                <select
                  value={formData.manager || ''}
                  onChange={(e) => setFormData({ ...formData, manager: Number(e.target.value) })}
                  required
                >
                  <option value="">Sélectionner un manager</option>
                  {potentialManagers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.username} ({manager.role})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="form-buttons">
            <button type="submit" className="submit-button">
              {editingUser ? 'Mettre à jour' : 'Créer'}
            </button>
            {editingUser && (
              <button type="button" onClick={handleCancel} className="cancel-button">
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="content-section">
        <h2>Liste des utilisateurs</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nom d'utilisateur</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Manager</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    {user.manager &&
                      potentialManagers.find(m => m.id === user.manager)?.username}
                  </td>
                  <td className="action-buttons">
                    <button
                      onClick={() => handleEdit(user)}
                      className="edit-button"
                    >
                      Modifier
                    </button>
                    {user.id !== currentUser.id && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="delete-button"
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="no-entries">
              Aucun utilisateur créé
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
