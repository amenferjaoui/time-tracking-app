// import { useState, useEffect } from "react";
// import { TimeEntry as _, Project } from "../types";
// import { projectsApi, timeEntriesApi } from "../services/api";
// import "./../styles/table.css";

// interface Props {
//   userId: string;
// }

// interface TimeEntryMap {
//   [key: string]: { // key format: "projectId-YYYY-MM-DD"
//     hours: number;
//     entryId?: string;
//   };
// }

// export default function TimeEntryTable({ userId }: Props) {
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [timeEntries, setTimeEntries] = useState<TimeEntryMap>({});
//   const [isLoading, setIsLoading] = useState(true);
//   const [selectedDate, setSelectedDate] = useState(() => new Date());
//   const [currentWeek, setCurrentWeek] = useState<Date[]>([]);

//   // Calculate week dates based on selected date
//   useEffect(() => {
//     const startOfWeek = new Date(selectedDate);
//     startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1); // Monday

//     const weekDates = Array.from({ length: 7 }, (_, i) => {
//       const date = new Date(startOfWeek);
//       date.setDate(startOfWeek.getDate() + i);
//       return date;
//     });

//     setCurrentWeek(weekDates);
//   }, [selectedDate]);

//   // Fetch data for the current month
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const [projectsRes, entriesRes] = await Promise.all([
//           projectsApi.getAll(),
//           timeEntriesApi.getMonthlyReport(
//             userId,
//             `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`
//           )
//         ]);

//         setProjects(projectsRes.data);

//         // Convert entries array to map for easier lookup
//         const entriesMap: TimeEntryMap = {};
//         entriesRes.data.forEach(entry => {
//           const key = `${entry.project}-${entry.date}`;
//           entriesMap[key] = {
//             hours: entry.hours,
//             entryId: entry.id
//           };
//         });
//         setTimeEntries(entriesMap);
//       } catch (error) {
//         console.error('Error fetching data:', error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchData();
//   }, [selectedDate, userId]);

//   const handleHoursChange = async (
//     projectId: string,
//     date: Date,
//     newValue: string
//   ) => {
//     const hours = newValue === '' ? 0 : parseFloat(newValue);
//     if (isNaN(hours) || hours < 0 || hours > 24) return;

//     const dateStr = date.toISOString().split('T')[0];
//     const key = `${projectId}-${dateStr}`;
//     const existingEntry = timeEntries[key];

//     try {
//       if (hours === 0 && existingEntry?.entryId) {
//         await timeEntriesApi.delete(existingEntry.entryId);
//         const newEntries = { ...timeEntries };
//         delete newEntries[key];
//         setTimeEntries(newEntries);
//       } else if (existingEntry?.entryId) {
//         const updated = await timeEntriesApi.update(existingEntry.entryId, {
//           hours
//         });
//         setTimeEntries(prev => ({
//           ...prev,
//           [key]: { hours, entryId: updated.data.id }
//         }));
//       } else if (hours > 0) {
//         const created = await timeEntriesApi.create({
//           date: dateStr,
//           project: projectId,
//           hours,
//           userId
//         });
//         setTimeEntries(prev => ({
//           ...prev,
//           [key]: { hours, entryId: created.data.id }
//         }));
//       }
//     } catch (error) {
//       console.error('Error updating time entry:', error);
//     }
//   };

//   const getHours = (projectId: string, date: Date) => {
//     const dateStr = date.toISOString().split('T')[0];
//     const key = `${projectId}-${dateStr}`;
//     return timeEntries[key]?.hours || '';
//   };

//   const handlePreviousWeek = () => {
//     const newDate = new Date(selectedDate);
//     newDate.setDate(selectedDate.getDate() - 7);
//     setSelectedDate(newDate);
//   };

//   const handleNextWeek = () => {
//     const newDate = new Date(selectedDate);
//     newDate.setDate(selectedDate.getDate() + 7);
//     setSelectedDate(newDate);
//   };

//   const handleMonthYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     const [year, month] = event.target.value.split('-');
//     const newDate = new Date(selectedDate);
//     newDate.setFullYear(parseInt(year));
//     newDate.setMonth(parseInt(month) - 1);
//     setSelectedDate(newDate);
//   };

//   // Generate month/year options for the last 2 years
//   const getMonthYearOptions = () => {
//     const options = [];
//     const currentDate = new Date();
//     const currentYear = currentDate.getFullYear();

//     for (let year = currentYear - 1; year <= currentYear + 1; year++) {
//       for (let month = 1; month <= 12; month++) {
//         const date = new Date(year, month - 1);
//         if (date <= currentDate) {
//           options.push({
//             value: `${year}-${String(month).padStart(2, '0')}`,
//             label: date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
//           });
//         }
//       }
//     }
//     return options.reverse();
//   };

//   if (isLoading) {
//     return <div>Chargement...</div>;
//   }

//   return (
//     <div className="timesheet-container">
//       <div className="timesheet-controls">
//         <select
//           value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
//           onChange={handleMonthYearChange}
//           className="month-select"
//         >
//           {getMonthYearOptions().map(option => (
//             <option key={option.value} value={option.value}>
//               {option.label}
//             </option>
//           ))}
//         </select>
//         <div className="week-navigation">
//           <button onClick={handlePreviousWeek} className="nav-button">
//             ← Semaine précédente
//           </button>
//           <span className="week-label">
//             Semaine du {currentWeek[0]?.toLocaleDateString('fr-FR')}
//           </span>
//           <button
//             onClick={handleNextWeek}
//             className="nav-button"
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
//               <td className="project-name">{project.name}</td>
//               {currentWeek.map(date => (
//                 <td key={date.toISOString()} className="hours-cell">
//                   <input
//                     type="number"
//                     min="0"
//                     max="24"
//                     step="0.5"
//                     value={getHours(project.id, date)}
//                     onChange={(e) => handleHoursChange(project.id, date, e.target.value)}
//                     className="hours-input"
//                   />
//                 </td>
//               ))}
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
  userId: string;
}

interface TimeEntryMap {
  [key: string]: { // key format: "projectId-YYYY-MM-DD"
    hours: number;
    entryId?: string;
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
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1); // Monday

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });

    setCurrentWeek(weekDates);
  }, [selectedDate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, entriesRes] = await Promise.all([
          projectsApi.getAll(),
          timeEntriesApi.getMonthlyReport(
            userId,
            `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`
          )
        ]);

        setProjects(projectsRes.data);

        const entriesMap: TimeEntryMap = {};
        entriesRes.data.forEach((entry: TimeEntry) => {
          const key = `${entry.project}-${entry.date}`;
          entriesMap[key] = {
            hours: entry.hours,
            entryId: entry.id
          };
        });
        setTimeEntries(entriesMap);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, userId]);

  const handleHoursChange = async (
    projectId: string,
    date: Date,
    newValue: string
  ) => {
    const hours = newValue === '' ? 0 : parseFloat(newValue);
    if (isNaN(hours) || hours < 0 || hours > 24) return;

    const dateStr = date.toISOString().split('T')[0];
    const key = `${projectId}-${dateStr}`;
    const existingEntry = timeEntries[key];

    try {
      if (hours === 0 && existingEntry?.entryId) {
        await timeEntriesApi.delete(existingEntry.entryId);
        const newEntries = { ...timeEntries };
        delete newEntries[key];
        setTimeEntries(newEntries);
      } else if (existingEntry?.entryId) {
        const updated = await timeEntriesApi.update(existingEntry.entryId, {
          hours
        });
        setTimeEntries(prev => ({
          ...prev,
          [key]: { hours, entryId: updated.data.id }
        }));
      } else if (hours > 0) {
        const created = await timeEntriesApi.create({
          date: dateStr,
          project: projectId,
          hours,
          userId
        });
        setTimeEntries(prev => ({
          ...prev,
          [key]: { hours, entryId: created.data.id }
        }));
      }
    } catch (error) {
      console.error("Error updating time entry:", error);
    }
  };

  const getHours = (projectId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const key = `${projectId}-${dateStr}`;
    return timeEntries[key]?.hours || '';
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handleMonthYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const [year, month] = event.target.value.split('-');
    const newDate = new Date(selectedDate);
    newDate.setFullYear(parseInt(year));
    newDate.setMonth(parseInt(month) - 1);
    setSelectedDate(newDate);
  };

  const getMonthYearOptions = () => {
    const options = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      for (let month = 1; month <= 12; month++) {
        const date = new Date(year, month - 1);
        if (date <= currentDate) {
          options.push({
            value: `${year}-${String(month).padStart(2, '0')}`,
            label: date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
          });
        }
      }
    }
    return options.reverse();
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="timesheet-container">
      <div className="timesheet-controls">
        <select
          value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
          onChange={handleMonthYearChange}
          className="month-select"
        >
          {getMonthYearOptions().map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="week-navigation">
          <button onClick={handlePreviousWeek} className="nav-button">
            ← Semaine précédente
          </button>
          <span className="week-label">
            Semaine du {currentWeek[0]?.toLocaleDateString('fr-FR')}
          </span>
          <button
            onClick={handleNextWeek}
            className="nav-button"
            disabled={currentWeek[6] >= new Date()}
          >
            Semaine suivante →
          </button>
        </div>
      </div>

      <table className="timesheet-table">
        <thead>
          <tr>
            <th className="project-column">Projet</th>
            {currentWeek.map(date => (
              <th key={date.toISOString()} className="day-column">
                {date.toLocaleDateString('fr-FR', { weekday: 'short' })}<br />
                {date.getDate()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <tr key={project.id}>
              <td className="project-name">{project.name}</td>
              {currentWeek.map(date => (
                <td key={date.toISOString()} className="hours-cell">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={getHours(project.id, date)}
                    onChange={(e) => handleHoursChange(project.id, date, e.target.value)}
                    className="hours-input"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
