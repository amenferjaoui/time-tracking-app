// VOld
// import { useState, useEffect, useCallback } from "react";
// import { TimeEntry, User } from "../types";
// import { timeEntriesApi } from "../services/api";
// import "../styles/table.css";

// interface Props {
//   user: User;
//   isManager?: boolean;
//   onUserSelect?: (userId: string) => void;
// }

// interface MonthlyData {
//   [project: string]: {
//     totalHours: number;
//     entries: TimeEntry[];
//   };
// }

// export default function MonthlyReport({ user, isManager, onUserSelect }: Props) {
//   const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
//   const [entries, setEntries] = useState<TimeEntry[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [selectedUserId, setSelectedUserId] = useState<string>(user.id.toString());
//   const [assignedUsers, setAssignedUsers] = useState<User[]>([]);

//   useEffect(() => {
//     if (isManager) {
//       const fetchAssignedUsers = async () => {
//         try {
//           const response = await timeEntriesApi.getAssignedUsers(user.id);
//           setAssignedUsers(response.data);
//         } catch (error) {
//           console.error(error);
//           setError("Failed to load assigned users");
//         }
//       };
//       fetchAssignedUsers();
//     }
//   }, [isManager, user.id]);

//   const fetchMonthlyData = useCallback(async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       const userId = parseInt(selectedUserId);
//       const response = await timeEntriesApi.getMonthlyReport(userId, month);
//       setEntries(response.data);
//     } catch (error) {
//       console.error(error);
//       setError("Failed to load monthly report data");
//     } finally {
//       setLoading(false);
//     }
//   }, [month, selectedUserId, user.id]);

//   useEffect(() => {
//     fetchMonthlyData();
//   }, [fetchMonthlyData]);

//   const aggregateData = (): MonthlyData => {
//     return entries.reduce((acc: MonthlyData, entry) => {
//       if (!acc[entry.project]) {
//         acc[entry.project] = { totalHours: 0, entries: [] };
//       }
//       acc[entry.project].totalHours += entry.hours;
//       acc[entry.project].entries.push(entry);
//       return acc;
//     }, {});
//   };

//   const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
//   const monthlyData = aggregateData();

//   const handleExportPDF = async () => {
//     try {
//       const response = await timeEntriesApi.exportMonthlyReportPDF(parseInt(selectedUserId), month);
//       const blob = new Blob([response.data], { type: 'application/pdf' });
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;
//       link.download = `rapport-${month}-${selectedUserId}.pdf`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       window.URL.revokeObjectURL(url);
//     } catch (error) {
//       console.error(error);
//       setError("Failed to export PDF");
//     }
//   };

//   if (loading) return <div className="loading">Loading report...</div>;

//   return (
//     <div className="monthly-report">
//       <div className="report-header">
//         <h2>Rapport Mensuel</h2>
//         <div className="report-controls">
//           {isManager && (
//             <select
//               value={selectedUserId}
//               onChange={(e) => {
//                 setSelectedUserId(e.target.value);
//                 onUserSelect?.(e.target.value);
//               }}
//               className="user-selector"
//             >
//               <option value={user.id}>Mes temps</option>
//               {assignedUsers.map((assignedUser) => (
//                 <option key={assignedUser.id} value={assignedUser.id}>
//                   {assignedUser.username}
//                 </option>
//               ))}
//             </select>
//           )}
//           <input
//             type="month"
//             value={month}
//             onChange={(e) => setMonth(e.target.value)}
//             className="month-picker"
//           />
//           <button onClick={handleExportPDF} className="export-button">
//             Exporter PDF
//           </button>
//         </div>
//       </div>

//       {error && <div className="error-message">{error}</div>}

//       <div className="report-summary">
//         <div className="summary-item">
//           <span className="label">Total des heures :</span>
//           <span className="value">{totalHours}</span>
//         </div>
//         <div className="summary-item">
//           <span className="label">Nombre de projets :</span>
//           <span className="value">{Object.keys(monthlyData).length}</span>
//         </div>
//       </div>

//       {Object.entries(monthlyData).map(([project, data]) => (
//         <div key={project} className="project-section">
//           <h3>
//             {project} <span className="project-hours">({data.totalHours}h)</span>
//           </h3>
//           <table>
//             <thead>
//               <tr>
//                 <th>Date</th>
//                 <th>Heures</th>
//               </tr>
//             </thead>
//             <tbody>
//               {data.entries.map((entry, index) => (
//                 <tr key={index}>
//                   <td>{new Date(entry.date).toLocaleDateString()}</td>
//                   <td>{entry.hours}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       ))}

//       {entries.length === 0 && <div className="no-entries">Aucune entrée pour ce mois</div>}
//     </div>
//   );
// }




import { useState, useEffect, useCallback } from "react";
import { TimeEntry, User, Project } from "../types";
import { timeEntriesApi, projectsApi } from "../services/api";
import "../styles/table.css";

interface Props {
  user: User;
  isManager?: boolean;
  onUserSelect?: (userId: string) => void;
}

interface MonthlyData {
  [project: string]: {
    totalHours: number;
    entries: TimeEntry[];
  };
}

export default function MonthlyReport({ user, isManager, onUserSelect }: Props) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>(user.id.toString());
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);

  // Récupérer la liste des utilisateurs assignés (si c'est un manager)
  useEffect(() => {
    if (isManager) {
      const fetchAssignedUsers = async () => {
        try {
          const response = await timeEntriesApi.getAssignedUsers(user.id);
          setAssignedUsers(response.data);
        } catch (error) {
          console.error(error);
          setError("Échec du chargement des utilisateurs assignés.");
        }
      };
      fetchAssignedUsers();
    }
  }, [isManager, user.id]);

  // Récupérer la liste des projets
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectsApi.getAll();
        setProjects(response.data);
      } catch (error) {
        console.error(error);
        setError("Échec du chargement des projets.");
      }
    };

    fetchProjects();
  }, []);

  // Récupérer les entrées de temps pour le mois sélectionné (en filtrant les zéros)
  const fetchMonthlyData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = parseInt(selectedUserId);
      const response = await timeEntriesApi.getMonthlyReport(userId, month);

      // Filtrer les entrées de temps pour ne garder que celles avec `temps > 0`
      const filteredEntries = response.data.filter((entry: TimeEntry) => entry.temps > 0);
      setEntries(filteredEntries);
    } catch (error) {
      console.error(error);
      setError("Échec du chargement des données du rapport mensuel.");
    } finally {
      setLoading(false);
    }
  }, [month, selectedUserId, projects]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData, projects]);

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedUserId]);

  // Agréger les entrées de temps par projet
  const aggregateData = (): MonthlyData => {
    return entries.reduce((acc: MonthlyData, entry) => {
      // Vérifier si `entry.projet` est un ID et récupérer le projet correspondant
      const project = projects.find(p => p.id === entry.projet);
      const projectName = project ? project.nom : `Projet ${entry.projet}`;

      if (!acc[projectName]) {
        acc[projectName] = { totalHours: 0, entries: [] };
      }
      acc[projectName].totalHours += entry.temps;
      acc[projectName].entries.push(entry);
      return acc;
    }, {});
  };

  const totalHours = entries.reduce((sum, entry) => sum + entry.temps, 0);
  const monthlyData = aggregateData();

  // Exportation du rapport PDF
  const handleExportPDF = async () => {
    try {
      const response = await timeEntriesApi.exportMonthlyReportPDF(parseInt(selectedUserId), month);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rapport-${month}-${selectedUserId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setError("Échec de l'exportation du rapport PDF.");
    }
  };

  if (loading) return <div className="loading">Chargement du rapport...</div>;

  return (
    <div className="monthly-report">
      <div className="report-header">
        <h2>Rapport Mensuel</h2>
        <div className="report-controls">
          {isManager && (
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                onUserSelect?.(e.target.value);
              }}
              className="user-selector"
            >
              <option value={user.id}>Mes temps</option>
              {assignedUsers.map((assignedUser) => (
                <option key={assignedUser.id} value={assignedUser.id}>
                  {assignedUser.username}
                </option>
              ))}
            </select>
          )}
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="month-picker"
          />
          <button onClick={handleExportPDF} className="export-button">
            Exporter PDF
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="report-summary">
        <div className="summary-item">
          <span className="label">Total des heures :</span>
          <span className="value">{totalHours}</span>
        </div>
        <div className="summary-item">
          <span className="label">Nombre de projets :</span>
          <span className="value">{Object.keys(monthlyData).length}</span>
        </div>
      </div>

      {Object.entries(monthlyData).map(([project, data]) => (
        <div key={project} className="project-section">
          <h3>
            {project} <span className="project-hours">({data.totalHours}h)</span>
          </h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Heures</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry, index) => (
                <tr key={index}>
                  <td>{new Date(entry.date).toLocaleDateString()}</td>
                  <td>{entry.temps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {entries.length === 0 && <div className="no-entries">Aucune entrée pour ce mois</div>}
    </div>
  );
}
