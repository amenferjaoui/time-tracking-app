// V1 Amen 

// import { useState, useEffect } from "react";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { User, TimeEntry, Project } from "./types";
// import { timeEntriesApi, projectsApi, authApi } from "./services/api";
// import Navigation from "./components/Navigation";
// import Login from "./components/Login";
// import TimeEntryTable from "./components/TimeEntryTable";
// import MonthlyReport from "./components/MonthlyReport";
// import ProjectManagement from "./components/ProjectManagement";
// import UserManagement from "./components/UserManagement";
// import "./App.css";
// import "./styles/navigation.css";

// interface ProtectedRouteProps {
//   children: React.ReactNode;
//   user: User | null;
//   requiredRole?: 'ADMIN' | 'MANAGER';
// }

// function ProtectedRoute({ children, user, requiredRole }: ProtectedRouteProps) {
//   if (!user) {
//     return <Navigate to="/login" replace />;
//   }

//   if (requiredRole) {
//     if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
//       return <Navigate to="/" replace />;
//     }
//     if (requiredRole === 'MANAGER' && user.role !== 'MANAGER' && user.role !== 'ADMIN') {
//       return <Navigate to="/" replace />;
//     }
//   }

//   return <>{children}</>;
// }

// export default function App() {
//   const [user, setUser] = useState<User | null>(null);
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [currentMonth, setCurrentMonth] = useState(() => {
//     const now = new Date();
//     return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
//   });

//   useEffect(() => {
//     const initializeApp = async () => {
//       const storedUser = localStorage.getItem('user');
//       if (storedUser) {
//         try {
//           await authApi.getCurrentUser();
//           setUser(JSON.parse(storedUser));
//           await fetchProjects();
//         } catch (err) {
//           handleLogout();
//         }
//       } else {
//         setLoading(false);
//       }
//     };

//     initializeApp();
//   }, []);

//   const fetchProjects = async () => {
//     try {
//       const projectsResponse = await projectsApi.getAll();
//       setProjects(projectsResponse.data);
//     } catch (err) {
//       setError("Failed to load projects. Please refresh the page.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLoginSuccess = () => {
//     const storedUser = localStorage.getItem('user');
//     if (storedUser) {
//       setUser(JSON.parse(storedUser));
//       fetchProjects();
//     }
//   };

//   const handleLogout = () => {
//     setUser(null);
//     setProjects([]);
//     localStorage.removeItem('user');
//     localStorage.removeItem('token');
//   };


//   if (loading) return <div className="loading">Loading...</div>;

//   return (
//     <BrowserRouter>
//       <div className="app-container">
//         {user && <Navigation user={user} onLogout={handleLogout} />}

//         <main className="main-content">
//           {error && <div className="error-banner">{error}</div>}

//           <Routes>
//             <Route path="/login" element={
//               user ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLoginSuccess} />
//             } />

//             <Route path="/" element={
//               <ProtectedRoute user={user}>
//                 <div className="content-section">
//                   <h2>Saisie des temps</h2>
//                   <TimeEntryTable userId={user!.id} />
//                 </div>
//               </ProtectedRoute>
//             } />

//             <Route path="/report" element={
//               <ProtectedRoute user={user}>
//                 <MonthlyReport
//                   user={user!}
//                   isManager={user?.role === 'MANAGER' || user?.role === 'ADMIN'}
//                 />
//               </ProtectedRoute>
//             } />

//             <Route path="/projects" element={
//               <ProtectedRoute user={user} requiredRole="MANAGER">
//                 <ProjectManagement />
//               </ProtectedRoute>
//             } />

//             <Route path="/team" element={
//               <ProtectedRoute user={user} requiredRole="MANAGER">
//                 <UserManagement currentUser={user!} />
//               </ProtectedRoute>
//             } />

//             <Route path="/admin" element={
//               <ProtectedRoute user={user} requiredRole="ADMIN">
//                 <UserManagement currentUser={user!} />
//               </ProtectedRoute>
//             } />

//             <Route path="*" element={<Navigate to="/" replace />} />
//           </Routes>
//         </main>
//       </div>
//     </BrowserRouter>
//   );
// }




// V2 Akram

// import { useState, useEffect } from "react";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { User, Project } from "./types";
// import { projectsApi, authApi } from "./services/api";
// import Navigation from "./components/Navigation";
// import Login from "./components/Login";
// import TimeEntryTable from "./components/TimeEntryTable";
// import MonthlyReport from "./components/MonthlyReport";
// import ProjectManagement from "./components/ProjectManagement";
// import UserManagement from "./components/UserManagement";
// import "./App.css";
// import "./styles/navigation.css";

// interface ProtectedRouteProps {
//   children: React.ReactNode;
//   user: User | null;
//   requiredRole?: "ADMIN" | "MANAGER";
// }

// function ProtectedRoute({ children, user, requiredRole }: ProtectedRouteProps) {
//   if (!user) {
//     return <Navigate to="/login" replace />;
//   }

//   if (requiredRole) {
//     if (requiredRole === "ADMIN" && user.role !== "ADMIN") {
//       return <Navigate to="/" replace />;
//     }
//     if (requiredRole === "MANAGER" && user.role !== "MANAGER" && user.role !== "ADMIN") {
//       return <Navigate to="/" replace />;
//     }
//   }

//   return <>{children}</>;
// }

// export default function App() {
//   const [user, setUser] = useState<User | null>(null);
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [currentMonth, setCurrentMonth] = useState(() => {
//     const now = new Date();
//     return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
//   });

//   useEffect(() => {
//     const initializeApp = async () => {
//       const storedUser = localStorage.getItem("user");
//       if (storedUser) {
//         try {
//           const parsedUser: User = JSON.parse(storedUser);
//           if (parsedUser && parsedUser.id) {
//             await authApi.getCurrentUser();
//             setUser(parsedUser);
//             await fetchProjects();
//           } else {
//             handleLogout();
//           }
//         } catch (err) {
//           handleLogout();
//         }
//       } else {
//         setLoading(false);
//       }
//     };

//     initializeApp();
//   }, []);

//   const fetchProjects = async () => {
//     try {
//       const projectsResponse = await projectsApi.getAll();
//       setProjects(projectsResponse.data);
//     } catch (err) {
//       setError("Failed to load projects. Please refresh the page.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLoginSuccess = () => {
//     const storedUser = localStorage.getItem("user");
//     if (storedUser) {
//       const parsedUser: User = JSON.parse(storedUser);
//       setUser(parsedUser);
//       fetchProjects();
//     }
//   };

//   const handleLogout = () => {
//     setUser(null);
//     setProjects([]);
//     localStorage.removeItem("user");
//     localStorage.removeItem("token");
//   };

//   if (loading) return <div className="loading">Loading...</div>;

//   return (
//     <BrowserRouter>
//       <div className="app-container">
//         {user && <Navigation user={user} onLogout={handleLogout} />}

//         <main className="main-content">
//           {error && <div className="error-banner">{error}</div>}

//           <Routes>
//             <Route
//               path="/login"
//               element={user ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLoginSuccess} />}
//             />

//             <Route
//               path="/"
//               element={
//                 user ? (
//                   <ProtectedRoute user={user}>
//                     <div className="content-section">
//                       <h2>Saisie des temps</h2>
//                       <TimeEntryTable userId={user.id} />
//                     </div>
//                   </ProtectedRoute>
//                 ) : (
//                   <Navigate to="/login" replace />
//                 )
//               }
//             />

//             <Route
//               path="/report"
//               element={
//                 user ? (
//                   <ProtectedRoute user={user}>
//                     <MonthlyReport
//                       user={user}
//                       isManager={user.role === "MANAGER" || user.role === "ADMIN"}
//                     />
//                   </ProtectedRoute>
//                 ) : (
//                   <Navigate to="/login" replace />
//                 )
//               }
//             />

//             <Route
//               path="/projects"
//               element={
//                 user ? (
//                   <ProtectedRoute user={user} requiredRole="MANAGER">
//                     <ProjectManagement />
//                   </ProtectedRoute>
//                 ) : (
//                   <Navigate to="/login" replace />
//                 )
//               }
//             />

//             <Route
//               path="/team"
//               element={
//                 user ? (
//                   <ProtectedRoute user={user} requiredRole="MANAGER">
//                     <UserManagement currentUser={user} />
//                   </ProtectedRoute>
//                 ) : (
//                   <Navigate to="/login" replace />
//                 )
//               }
//             />

//             <Route
//               path="/admin"
//               element={
//                 user ? (
//                   <ProtectedRoute user={user} requiredRole="ADMIN">
//                     <UserManagement currentUser={user} />
//                   </ProtectedRoute>
//                 ) : (
//                   <Navigate to="/login" replace />
//                 )
//               }
//             />

//             <Route path="*" element={<Navigate to="/" replace />} />
//           </Routes>
//         </main>
//       </div>
//     </BrowserRouter>
//   );
// }


// V3 Akram

import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { User } from "./types";
import { authApi } from "./services/api";
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
  requiredRole?: "ADMIN" | "MANAGER";
}

function ProtectedRoute({ children, user, requiredRole }: ProtectedRouteProps) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    if (requiredRole === "ADMIN" && user.role !== "ADMIN") {
      return <Navigate to="/" replace />;
    }
    if (requiredRole === "MANAGER" && user.role !== "MANAGER" && user.role !== "ADMIN") {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser: User = JSON.parse(storedUser);
          if (parsedUser?.id) {
            await authApi.getCurrentUser();
            setUser(parsedUser);
          } else {
            handleLogout();
          }
        } catch {
          handleLogout();
        }
      } else {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleLoginSuccess = () => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
      setUser(parsedUser);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <BrowserRouter>
      <div className="app-container">
        {user && <Navigation user={user} onLogout={handleLogout} />}

        <main className="main-content">
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
                    <MonthlyReport user={user} isManager={user.role === "MANAGER" || user.role === "ADMIN"} />
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
                  <ProtectedRoute user={user} requiredRole="MANAGER">
                    <ProjectManagement />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/team"
              element={
                user ? (
                  <ProtectedRoute user={user} requiredRole="MANAGER">
                    <UserManagement currentUser={user} />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/admin"
              element={
                user ? (
                  <ProtectedRoute user={user} requiredRole="ADMIN">
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
