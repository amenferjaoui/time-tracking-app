import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { User, Project, TimeEntry } from "./types";
import { authApi, projectsApi } from "./services/api";
import Navigation from "./components/Navigation";
import Login from "./components/Login";
import TimeEntryTable from "./components/TimeEntryTable";
import MonthlyReport from "./components/MonthlyReport";
import ProjectManagement from "./components/ProjectManagement";
import UserManagement from "./components/UserManagement";
import "./App.css";
import "./styles/navigation.css";

interface ProtectedRouteProps {
  children: React.ReactNode;
  user: User | null;
  requiredRole?: "admin" | "manager";
  adminOnly?: boolean;
}

function ProtectedRoute({ children, user, requiredRole, adminOnly }: ProtectedRouteProps) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    if (requiredRole === "admin" && user.role !== "admin") {
      return <Navigate to="/" replace />;
    }
    if (requiredRole === "manager" && user.role !== "manager" && user.role !== "admin") {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser: User = JSON.parse(storedUser);
          if (parsedUser?.id) {
            await authApi.getCurrentUser();
            setUser(parsedUser);
            await fetchProjects();
          } else {
            handleLogout();
          }
        } catch {
          handleLogout();
        }
      }
      setLoading(false);
    };

    initializeApp();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.data);
    } catch (err) {
      setError("Failed to load projects. Please refresh the page.");
    }
  };

  const handleLoginSuccess = () => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchProjects();
    }
  };

  const handleLogout = () => {
    setUser(null);
    setProjects([]);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setLoading(false);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <BrowserRouter>
      <div className="app-container">
        {user && <Navigation user={user} onLogout={handleLogout} />}

        <main className="main-content">
          {error && <div className="error-banner">{error}</div>}
          
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLoginSuccess} />}
            />

            <Route
              path="/"
              element={
                user ? (
                  <ProtectedRoute user={user}>
                    <div className="content-section">
                      <h2>Saisie des temps</h2>
                      <TimeEntryTable userId={user.id} />
                    </div>
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/report"
              element={
                user ? (
                  <ProtectedRoute user={user}>
                    <MonthlyReport 
                      user={user} 
                      isManager={user.role === "manager" || user.role === "admin"} 
                    />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/projects"
              element={
                user ? (
                  <ProtectedRoute user={user} requiredRole="manager">
                    <ProjectManagement />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/admin/users"
              element={
                user ? (
                  <ProtectedRoute user={user} requiredRole="manager">
                    <UserManagement currentUser={user} />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
