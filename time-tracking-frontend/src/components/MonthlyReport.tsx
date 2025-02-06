// import { useState, useEffect } from 'react';
// import { TimeEntry, User } from '../types';
// import { timeEntriesApi } from '../services/api';
// import '../styles/table.css';

// interface Props {
//   user: User;
//   isManager?: boolean;
//   selectedUserId?: string;
// }

// interface MonthlyData {
//   [project: string]: {
//     totalHours: number;
//     entries: TimeEntry[];
//   };
// }

// export default function MonthlyReport({ user, isManager, selectedUserId }: Props) {
//   const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
//   const [entries, setEntries] = useState<TimeEntry[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     fetchMonthlyData();
//   }, [month, selectedUserId]);

//   const fetchMonthlyData = async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       const userId = selectedUserId || user.id;
//       const response = await timeEntriesApi.getMonthlyReport(userId, month);
//       setEntries(response.data);
//     } catch (err) {
//       setError('Failed to load monthly report data');
//     } finally {
//       setLoading(false);
//     }
//   };

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
//     // TODO: Implement PDF export using a library like jsPDF
//     console.log('Export to PDF');
//   };

//   if (loading) return <div className="loading">Loading report...</div>;

//   return (
//     <div className="monthly-report">
//       <div className="report-header">
//         <h2>Rapport Mensuel</h2>
//         <div className="report-controls">
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

//       {entries.length === 0 && (
//         <div className="no-entries">
//           Aucune entrée pour ce mois
//         </div>
//       )}
//     </div>
//   );
// }

import { useState, useEffect, useCallback } from "react";
import { TimeEntry, User } from "../types";
import { timeEntriesApi } from "../services/api";
import "../styles/table.css";

interface Props {
  user: User;
  selectedUserId?: string;
}

interface MonthlyData {
  [project: string]: {
    totalHours: number;
    entries: TimeEntry[];
  };
}

export default function MonthlyReport({ user, selectedUserId }: Props) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useCallback pour éviter la recréation de fetchMonthlyData
  const fetchMonthlyData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = selectedUserId || user.id;
      const response = await timeEntriesApi.getMonthlyReport(userId, month);
      setEntries(response.data);
    } catch (error) {
      console.error(error);
      setError("Failed to load monthly report data");
    } finally {
      setLoading(false);
    }
  }, [month, selectedUserId, user.id]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  const aggregateData = (): MonthlyData => {
    return entries.reduce((acc: MonthlyData, entry) => {
      if (!acc[entry.project]) {
        acc[entry.project] = { totalHours: 0, entries: [] };
      }
      acc[entry.project].totalHours += entry.hours;
      acc[entry.project].entries.push(entry);
      return acc;
    }, {});
  };

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const monthlyData = aggregateData();

  const handleExportPDF = async () => {
    // TODO: Implement PDF export using a library like jsPDF
    console.log("Export to PDF");
  };

  if (loading) return <div className="loading">Loading report...</div>;

  return (
    <div className="monthly-report">
      <div className="report-header">
        <h2>Rapport Mensuel</h2>
        <div className="report-controls">
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
                  <td>{entry.hours}</td>
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

