// import { useState, useEffect } from "react";
// import { TimeEntry, Project } from "../types";
// import { projectsApi, timeEntriesApi } from "../services/api";
// import "./../styles/table.css";

// interface Props {
//   userId: number;
// }

// interface TimeEntryMap {
//   [key: string]: {
//     temps: number;
//     entryId?: number;
//     saving?: boolean;
//     error?: string;
//   };
// }

// export default function TimeEntryTable({ userId }: Props): JSX.Element {
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [timeEntries, setTimeEntries] = useState<TimeEntryMap>({});
//   const [isLoading, setIsLoading] = useState(true);
//   const [selectedDate, setSelectedDate] = useState(() => new Date());
//   const [currentWeek, setCurrentWeek] = useState<Date[]>([]);

//   // Initialize current week
//   useEffect(() => {
//     if (!selectedDate || isNaN(selectedDate.getTime())) {
//       console.error("Invalid selected date");
//       setCurrentWeek([]);
//       return;
//     }

//     const startOfWeek = new Date(selectedDate);
//     startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1); // Monday

//     if (isNaN(startOfWeek.getTime())) {
//       console.error("Invalid start of week date");
//       setCurrentWeek([]);
//       return;
//     }

//     const weekDates = Array.from({ length: 7 }, (_, i) => {
//       const date = new Date(startOfWeek);
//       date.setDate(startOfWeek.getDate() + i);
//       return date;
//     });

//     setCurrentWeek(weekDates);
//   }, [selectedDate]);

//   // Fetch projects and time entries
//   useEffect(() => {
//     const fetchTimeEntries = async () => {
//       if (!currentWeek.length || currentWeek.length < 7) {
//         return;
//       }

//       const [firstDay, lastDay] = [currentWeek[0], currentWeek[6]];
//       if (!firstDay || !lastDay || isNaN(firstDay.getTime()) || isNaN(lastDay.getTime())) {
//         return;
//       }

//       try {
//         const firstDayMonth = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}`;
//         const lastDayMonth = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}`;

//         const promises = [timeEntriesApi.getMonthlyReport(userId, firstDayMonth)];
//         if (firstDayMonth !== lastDayMonth) {
//           promises.push(timeEntriesApi.getMonthlyReport(userId, lastDayMonth));
//         }

//         const responses = await Promise.all(promises);
//         const entriesMap: TimeEntryMap = {};

//         responses.forEach(response => {
//           response.data.forEach((entry: TimeEntry) => {
//             if (entry.temps > 0) {
//               const key = `${entry.projet}-${entry.date}`;
//               entriesMap[key] = {
//                 temps: entry.temps,
//                 entryId: entry.id,
//                 saving: false
//               };
//             }
//           });
//         });

//         setTimeEntries(entriesMap);
//       } catch (error) {
//         console.error("Error fetching time entries:", error);
//       }
//     };

//     const fetchData = async () => {
//       setIsLoading(true);
//       try {
//         const projectsRes = await projectsApi.getAll();
//         setProjects(projectsRes.data);
//         if (currentWeek.length === 7) {
//           await fetchTimeEntries();
//         }
//       } catch (error) {
//         console.error("Error fetching data:", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchData();
//   }, [userId, currentWeek]);

//   const handleHoursChange = async (
//     projectId: number,
//     date: Date,
//     newValue: string
//   ): Promise<void> => {
//     if (!date || isNaN(date.getTime())) {
//       console.error("Invalid date in handleHoursChange");
//       return;
//     }

//     const hours = newValue === '' ? 0 : parseFloat(newValue);
//     const dateStr = date.toISOString().split('T')[0];
//     const key = `${projectId}-${dateStr}`;
//     const existingEntry = timeEntries[key];

//     if (existingEntry?.temps === hours) return;

//     if (![0, 0.5, 1].includes(hours)) {
//       setTimeEntries(prev => ({
//         ...prev,
//         [key]: {
//           ...prev[key],
//           temps: hours,
//           error: "Valeurs autorisées : 0 (pas de travail), 0.5 (demi-journée), ou 1 (journée complète)"
//         }
//       }));
//       return;
//     }

//     setTimeEntries(prev => ({
//       ...prev,
//       [key]: {
//         temps: hours,
//         entryId: existingEntry?.entryId,
//         saving: true,
//         error: undefined
//       }
//     }));

//     try {
//       if (hours === 0) {
//         if (existingEntry?.entryId) {
//           await timeEntriesApi.delete(existingEntry.entryId);
//         }
//         setTimeEntries(prev => {
//           const { [key]: _, ...rest } = prev;
//           return rest;
//         });
//       } else if (existingEntry?.entryId) {
//         await timeEntriesApi.update(existingEntry.entryId, {
//           temps: hours,
//           user: userId,
//           date: dateStr,
//           projet: projectId
//         });
//         setTimeEntries(prev => ({
//           ...prev,
//           [key]: { temps: hours, entryId: existingEntry.entryId, saving: false }
//         }));
//       } else if (hours > 0) {
//         const response = await timeEntriesApi.create({
//           date: dateStr,
//           projet: projectId,
//           temps: hours,
//           description: '',
//           user: userId
//         });

//         setTimeEntries(prev => ({
//           ...prev,
//           [key]: { temps: hours, entryId: response.data.id, saving: false }
//         }));
//       }
//     } catch (error) {
//       console.error("Error updating time entry:", error);
//       setTimeEntries(prev => ({
//         ...prev,
//         [key]: { ...prev[key], saving: false, error: "Échec de l'enregistrement" }
//       }));
//     }
//   };

//   if (isLoading) {
//     return <div>Chargement...</div>;
//   }

//   if (!currentWeek.length) {
//     return <div>Erreur: Impossible de charger le calendrier</div>;
//   }

//   return (
//     <div className="timesheet-container">
//       <div className="timesheet-controls">
//         <div className="week-navigation">
//           <button onClick={() => setSelectedDate(prev => new Date(prev.setDate(prev.getDate() - 7)))}>
//             ← Semaine précédente
//           </button>
//           <span className="week-label">
//             Semaine du {currentWeek[0]?.toLocaleDateString('fr-FR')}
//           </span>
//           <button
//             onClick={() => setSelectedDate(prev => new Date(prev.setDate(prev.getDate() + 7)))}
//             disabled={currentWeek[6] >= new Date()}
//           >
//             Semaine suivante →
//           </button>
//         </div>
//       </div>

//       <table className="timesheet-table">
//         <thead>
//           <tr>
//             <th className="project-column">Projet</th>
//             {currentWeek.map(date => (
//               <th key={date.toISOString()} className="day-column">
//                 {date.toLocaleDateString('fr-FR', { weekday: 'short' })}<br />
//                 {date.getDate()}
//               </th>
//             ))}
//           </tr>
//         </thead>
//         <tbody>
//           {projects.map(project => (
//             <tr key={project.id}>
//               <td className="project-name">{project.nom}</td>
//               {currentWeek.map(date => {
//                 const dateStr = date.toISOString().split('T')[0];
//                 const key = `${project.id}-${dateStr}`;
//                 const entry = timeEntries[key];
//                 return (
//                   <td key={dateStr} className={`hours-cell ${entry?.saving ? 'saving' : ''} ${entry?.error ? 'error' : ''}`}>
//                     <div className="input-container">
//                       <input
//                         type="number"
//                         min="0"
//                         max="1"
//                         step="0.5"
//                         placeholder="0, 0.5, 1"
//                         value={entry?.temps === undefined ? '' : Number(entry.temps).toFixed(1)}
//                         onChange={(e) => handleHoursChange(project.id, date, e.target.value)}
//                         className="hours-input"
//                       />
//                       {entry?.saving && <div className="saving-indicator" />}
//                       {entry?.error && <div className="error-message">{entry.error}</div>}
//                     </div>
//                   </td>
//                 );
//               })}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }
import { useState, useEffect } from "react";
import { TimeEntry, Project } from "../types";
import { projectsApi, timeEntriesApi } from "../services/api";
import "./../styles/table.css";

interface Props {
  userId: number;
}

interface TimeEntryMap {
  [key: string]: {
    temps: number;
    entryId?: number;
    saving?: boolean;
    error?: string;
  };
}

export default function TimeEntryTable({ userId }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);

  useEffect(() => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
    setCurrentWeek(weekDates);
  }, [selectedDate]);

  const fetchTimeEntries = async () => {
    try {
      const firstDayMonth = `${currentWeek[0].getFullYear()}-${String(currentWeek[0].getMonth() + 1).padStart(2, "0")}`;
      const lastDayMonth = `${currentWeek[6].getFullYear()}-${String(currentWeek[6].getMonth() + 1).padStart(2, "0")}`;
      const promises = [timeEntriesApi.getMonthlyReport(userId, firstDayMonth)];
      if (firstDayMonth !== lastDayMonth) {
        promises.push(timeEntriesApi.getMonthlyReport(userId, lastDayMonth));
      }
      const responses = await Promise.all(promises);
      const entriesMap: TimeEntryMap = {};
      responses.forEach(response => {
        response.data.forEach((entry: TimeEntry) => {
          const key = `${entry.projet}-${entry.date}`;
          entriesMap[key] = { temps: entry.temps, entryId: entry.id };
        });
      });
      setTimeEntries(entriesMap);
    } catch (error) {
      console.error("Error fetching time entries:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const projectsRes = await projectsApi.getAll();
        setProjects(projectsRes.data);
        await fetchTimeEntries();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedDate, userId, currentWeek]);

  const handleHoursChange = async (projectId: number, date: Date, newValue: string) => {
    const hours = newValue === "" ? 0 : parseFloat(newValue);
    const dateStr = date.toISOString().split("T")[0];
    const key = `${projectId}-${dateStr}`;
    const existingEntry = timeEntries[key];
    if (existingEntry?.temps === hours) return;

    if (![0, 0.5, 1].includes(hours)) {
      setTimeEntries(prev => ({
        ...prev,
        [key]: { ...prev[key], temps: hours, error: "Seules les valeurs 0, 0.5 et 1 sont autorisées" }
      }));
      return;
    }

    setTimeEntries(prev => ({
      ...prev,
      [key]: { temps: hours, entryId: existingEntry?.entryId, saving: true, error: undefined }
    }));

    try {
      if (hours === 0 && existingEntry?.entryId) {
        await timeEntriesApi.delete(existingEntry.entryId);
        setTimeEntries(prev => {
          const updatedEntries = { ...prev };
          delete updatedEntries[key];
          return updatedEntries;
        });
      } else if (existingEntry?.entryId) {
        await timeEntriesApi.update(existingEntry.entryId, { temps: hours });
        setTimeEntries(prev => ({
          ...prev,
          [key]: { temps: hours, entryId: existingEntry.entryId, saving: false }
        }));
      } else if (hours > 0) {
        const response = await timeEntriesApi.create({ date: dateStr, projet: projectId, temps: hours, description: "" });
        setTimeEntries(prev => ({
          ...prev,
          [key]: { temps: hours, entryId: response.data.id, saving: false }
        }));
      }
    } catch (error) {
      console.error("Error updating time entry:", error);
      setTimeEntries(prev => ({
        ...prev,
        [key]: { ...prev[key], saving: false, error: "Échec de l'enregistrement" }
      }));
    }
  };

  if (isLoading) {
    return <div className="loading-indicator">Chargement...</div>;
  }

  return (
    <div className="timesheet-container">
      <h2>Saisie des temps</h2>
      <div className="timesheet-controls">
        <button className="week-button" onClick={() => setSelectedDate(prev => new Date(prev.setDate(prev.getDate() - 7)))}>
          ← Semaine précédente
        </button>
        <span className="week-label">Semaine du {currentWeek[0]?.toLocaleDateString("fr-FR")}</span>
        <button className="week-button" onClick={() => setSelectedDate(prev => new Date(prev.setDate(prev.getDate() + 7)))}>
          Semaine suivante →
        </button>
      </div>
      <table className="timesheet-table">
        <thead>
          <tr>
            <th>Projet</th>
            {currentWeek.map(date => (
              <th key={date.toISOString()}>{date.toLocaleDateString("fr-FR", { weekday: "short" })}<br />{date.getDate()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <tr key={project.id}>
              <td>{project.nom}</td>
              {currentWeek.map(date => {
                const dateStr = date.toISOString().split("T")[0];
                const key = `${project.id}-${dateStr}`;
                const entry = timeEntries[key];
                return (
                  <td key={dateStr} className={`hours-cell ${entry?.saving ? "saving" : ""} ${entry?.error ? "error" : ""}`}>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.5"
                      value={entry?.temps ?? ""}
                      onChange={(e) => handleHoursChange(project.id, date, e.target.value)}
                      className="hours-input"
                      title={entry?.error}
                    />
                    {entry?.saving && <div className="saving-indicator" />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
