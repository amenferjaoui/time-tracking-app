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
      <div className="nav-brand">
        <Link to="/" className="brand-link">Time Tracking</Link>
      </div>
      
      {user && (
        <div className="nav-content">
          <div className="nav-user">
            <span className="username">{user.username}</span>
            <span className="role">({user.role})</span>
          </div>
          
          <div className="nav-links">
            {/* Common links for all users */}
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              Feuille de temps
            </Link>
            <Link 
              to="/report" 
              className={`nav-link ${isActive('/report') ? 'active' : ''}`}
            >
              Rapport mensuel
            </Link>

            {/* Manager specific links */}
            {(user.role === 'MANAGER' || user.role === 'ADMIN') && (
              <>
                <Link 
                  to="/projects" 
                  className={`nav-link ${isActive('/projects') ? 'active' : ''}`}
                >
                  Projets
                </Link>
                <Link 
                  to="/team" 
                  className={`nav-link ${isActive('/team') ? 'active' : ''}`}
                >
                  Équipe
                </Link>
              </>
            )}

            {/* Admin specific links */}
            {user.role === 'ADMIN' && (
              <Link 
                to="/admin" 
                className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
              >
                Administration
              </Link>
            )}

            <button onClick={handleLogout} className="logout-button">
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
