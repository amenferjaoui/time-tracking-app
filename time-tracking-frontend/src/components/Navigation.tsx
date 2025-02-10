import { Link, useLocation } from "react-router-dom";
import { User } from "../types";
import { authApi } from "../services/api";
import { FiLogOut, FiUser } from "react-icons/fi";
import logo from "../assets/logo.png";

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
      {user && (
        <div className="nav-content">
          <div className="nav-header">
            <div className="nav-brand">
              <img src={logo} alt="Logo" className="nav-logo" />
              <Link to="/" className="brand-link">MyT&R</Link>
            </div>
            <div className="nav-user-actions">
              <div className="user-info">
                <FiUser size={24} />
                <div className="user-details">
                  <span className="username">{user.username}</span>
                  <span className="role">({user.role})</span>
                </div>
              </div>
            </div>
          </div>

          <div className="nav-links-container">
            <div className="nav-links">
              <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
                Feuille de temps
              </Link>
              <Link to="/report" className={`nav-link ${isActive("/report") ? "active" : ""}`}>
                Rapport mensuel
              </Link>
              {(user.role === "manager" || user.role === "admin") && (
                <Link to="/projects" className={`nav-link ${isActive("/projects") ? "active" : ""}`}>
                  Projets
                </Link>
              )}
              {(user.role === "admin" || user.role === "manager") && (
                <Link to="/admin/users" className={`nav-link ${isActive("/admin/users") ? "active" : ""}`}>
                  Gestion des utilisateurs
                </Link>
              )}
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <FiLogOut size={20} />
            Déconnexion
          </button>
        </div>
      )}
    </nav>
  );
}
