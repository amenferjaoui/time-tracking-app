// import { useState, useEffect } from 'react';
// import { User } from '../types';
// import { authApi } from '../services/api';
// import '../styles/form.css';
// import '../styles/table.css';

// interface UserForm {
//   username: string;
//   password: string;
//   role: 'USER' | 'MANAGER' | 'ADMIN';
//   managerId?: string;
// }

// interface Props {
//   currentUser: User;
// }

// export default function UserManagement({ currentUser }: Props) {
//   const [users, setUsers] = useState<User[]>([]);
//   const [managers, setManagers] = useState<User[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [editingUser, setEditingUser] = useState<User | null>(null);
//   const [formData, setFormData] = useState<UserForm>({
//     username: '',
//     password: '',
//     role: 'USER'
//   });

//   useEffect(() => {
//     fetchUsers();
//   }, []);

//   const fetchUsers = async () => {
//     try {
//       setLoading(true);
//       const response = await authApi.getAllUsers();
//       const users = response.data;
//       setUsers(users);
//       setManagers(users.filter(user => user.role === 'MANAGER'));
//     } catch (err) {
//       setError('Failed to load users');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       setError(null);
//       if (editingUser) {
//         const response = await authApi.updateUser(editingUser.id, formData);
//         setUsers(users.map(u => 
//           u.id === editingUser.id ? response.data : u
//         ));
//         setEditingUser(null);
//       } else {
//         const response = await authApi.createUser(formData);
//         setUsers([...users, response.data]);
//       }
//       setFormData({
//         username: '',
//         password: '',
//         role: 'USER'
//       });
//     } catch (err) {
//       setError('Failed to save user');
//     }
//   };

//   const handleEdit = (user: User) => {
//     setEditingUser(user);
//     setFormData({
//       username: user.username,
//       password: '', // Don't show existing password
//       role: user.role,
//       managerId: user.managerId
//     });
//   };

//   const handleDelete = async (id: string) => {
//     if (!window.confirm('Are you sure you want to delete this user?')) return;

//     try {
//       await authApi.deleteUser(id);
//       setUsers(users.filter(u => u.id !== id));
//     } catch (err) {
//       setError('Failed to delete user');
//     }
//   };

//   const handleCancel = () => {
//     setEditingUser(null);
//     setFormData({
//       username: '',
//       password: '',
//       role: 'USER'
//     });
//   };

//   if (loading) return <div className="loading">Loading users...</div>;

//   return (
//     <div className="user-management">
//       <div className="content-section">
//         <h2>{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
//         <form onSubmit={handleSubmit} className="form-container">
//           <div className="form-group">
//             <label>Nom d'utilisateur :</label>
//             <input
//               type="text"
//               value={formData.username}
//               onChange={(e) => setFormData({ ...formData, username: e.target.value })}
//               required
//               placeholder="Nom d'utilisateur"
//             />
//           </div>

//           <div className="form-group">
//             <label>Mot de passe :</label>
//             <input
//               type="password"
//               value={formData.password}
//               onChange={(e) => setFormData({ ...formData, password: e.target.value })}
//               required={!editingUser}
//               placeholder={editingUser ? 'Laisser vide pour ne pas modifier' : 'Mot de passe'}
//             />
//           </div>

//           <div className="form-group">
//             <label>Rôle :</label>
//             <select
//               value={formData.role}
//               onChange={(e) => setFormData({ 
//                 ...formData, 
//                 role: e.target.value as 'USER' | 'MANAGER' | 'ADMIN'
//               })}
//               required
//             >
//               <option value="USER">Utilisateur</option>
//               {currentUser.role === 'ADMIN' && (
//                 <>
//                   <option value="MANAGER">Manager</option>
//                   <option value="ADMIN">Administrateur</option>
//                 </>
//               )}
//             </select>
//           </div>

//           {formData.role === 'USER' && (
//             <div className="form-group">
//               <label>Manager :</label>
//               <select
//                 value={formData.managerId || ''}
//                 onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
//                 required
//               >
//                 <option value="">Sélectionner un manager</option>
//                 {managers.map(manager => (
//                   <option key={manager.id} value={manager.id}>
//                     {manager.username}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           )}

//           {error && <div className="error-message">{error}</div>}

//           <div className="form-buttons">
//             <button type="submit" className="submit-button">
//               {editingUser ? 'Mettre à jour' : 'Créer'}
//             </button>
//             {editingUser && (
//               <button type="button" onClick={handleCancel} className="cancel-button">
//                 Annuler
//               </button>
//             )}
//           </div>
//         </form>
//       </div>

//       <div className="content-section">
//         <h2>Liste des utilisateurs</h2>
//         <div className="table-container">
//           <table>
//             <thead>
//               <tr>
//                 <th>Nom d'utilisateur</th>
//                 <th>Rôle</th>
//                 <th>Manager</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {users.map((user) => (
//                 <tr key={user.id}>
//                   <td>{user.username}</td>
//                   <td>{user.role}</td>
//                   <td>
//                     {user.managerId && 
//                       managers.find(m => m.id === user.managerId)?.username}
//                   </td>
//                   <td className="action-buttons">
//                     <button
//                       onClick={() => handleEdit(user)}
//                       className="edit-button"
//                     >
//                       Modifier
//                     </button>
//                     {user.id !== currentUser.id && (
//                       <button
//                         onClick={() => handleDelete(user.id)}
//                         className="delete-button"
//                       >
//                         Supprimer
//                       </button>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           {users.length === 0 && (
//             <div className="no-entries">
//               Aucun utilisateur créé
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


import { useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';
import '../styles/form.css';
import '../styles/table.css';

interface UserForm {
  username: string;
  password: string;
  role: 'USER' | 'MANAGER' | 'ADMIN';
  managerId?: string;
}

interface Props {
  currentUser: User;
}

export default function UserManagement({ currentUser }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserForm>({
    username: '',
    password: '',
    role: 'USER'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authApi.getAllUsers();
      const users = response.data;
      setUsers(users);
      setManagers(users.filter(user => user.role === 'MANAGER'));
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
      if (editingUser) {
        const response = await authApi.updateUser(editingUser.id, formData);
        setUsers(users.map(u =>
          u.id === editingUser.id ? response.data : u
        ));
        setEditingUser(null);
      } else {
        const response = await authApi.createUser(formData);
        setUsers([...users, response.data]);
      }
      setFormData({
        username: '',
        password: '',
        role: 'USER'
      });
    } catch (error) {
      console.error(error);
      setError('Failed to save user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Ne pas afficher le mot de passe existant
      role: user.role,
      managerId: user.managerId
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await authApi.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (error) {
      console.error(error);
      setError('Failed to delete user');
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'USER'
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
              onChange={(e) => setFormData({
                ...formData,
                role: e.target.value as 'USER' | 'MANAGER' | 'ADMIN'
              })}
              required
            >
              <option value="USER">Utilisateur</option>
              {currentUser.role === 'ADMIN' && (
                <>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Administrateur</option>
                </>
              )}
            </select>
          </div>

          {formData.role === 'USER' && (
            <div className="form-group">
              <label>Manager :</label>
              <select
                value={formData.managerId || ''}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                required
              >
                <option value="">Sélectionner un manager</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.username}
                  </option>
                ))}
              </select>
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
                <th>Rôle</th>
                <th>Manager</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.role}</td>
                  <td>
                    {user.managerId &&
                      managers.find(m => m.id === user.managerId)?.username}
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
