import { Link, useLocation } from 'react-router-dom';
import { User } from '../types';
import { authApi } from '../services/api';

interface Props {
  user: User | null;
  onLogout: () => void;
}

export default function Navigation({ user, onLogout }: Props) {
  const location = useLocation();
  const handleLogout = () => {
    authApi.logout();
    onLogout();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navigation">
      <div className="nav-header">
        <div className="nav-brand">
          <Link to="/" className="brand-link">Time Tracking</Link>
        </div>
        {user && (
          <div className="nav-user-actions">
            <span className="username">{user.username}</span>
            <span className="role">({user.role})</span>
            <button onClick={handleLogout} className="logout-button">
              Déconnexion
            </button>
          </div>
        )}
      </div>

      {user && (
        <div className="nav-links-container">
          <div className="nav-links">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              Feuille de temps
            </Link>
            <Link to="/report" className={`nav-link ${isActive('/report') ? 'active' : ''}`}>
              Rapport mensuel
            </Link>
            {(user.role === 'manager' || user.role === 'admin') && (
              <Link to="/projects" className={`nav-link ${isActive('/projects') ? 'active' : ''}`}>
                Projets
              </Link>
            )}
            {user.role === 'admin' && (
              <Link to="/admin/users" className={`nav-link ${isActive('/admin/users') ? 'active' : ''}`}>
                Gestion des utilisateurs
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
