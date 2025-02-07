import { useState, useEffect } from "react";
import { TimeEntry, Project } from "../types";
import { projectsApi, timeEntriesApi } from "../services/api";
import "./../styles/table.css";

interface Props {
  userId: number;
}

interface TimeEntryMap {
  [key: string]: { // key format: "projectId-YYYY-MM-DD"
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
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1); // Monday

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });

    setCurrentWeek(weekDates);
  }, [selectedDate]);

  const fetchTimeEntries = async () => {
    try {
      // Get the month of the first and last day of the week
      const firstDayMonth = `${currentWeek[0].getFullYear()}-${String(currentWeek[0].getMonth() + 1).padStart(2, '0')}`;
      const lastDayMonth = `${currentWeek[6].getFullYear()}-${String(currentWeek[6].getMonth() + 1).padStart(2, '0')}`;

      // Fetch data for both months if the week spans across months
      const promises = [timeEntriesApi.getMonthlyReport(userId, firstDayMonth)];
      if (firstDayMonth !== lastDayMonth) {
        promises.push(timeEntriesApi.getMonthlyReport(userId, lastDayMonth));
      }

      const responses = await Promise.all(promises);

      // Combine entries from both months
      const entriesMap: TimeEntryMap = {};
      responses.forEach(response => {
        response.data.forEach((entry: TimeEntry) => {
          const key = `${entry.projet}-${entry.date}`;
          entriesMap[key] = {
            temps: entry.temps,
            entryId: entry.id
          };
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

  const handleHoursChange = async (
    projectId: number,
    date: Date,
    newValue: string
  ) => {
    const hours = newValue === '' ? 0 : parseFloat(newValue);
    const dateStr = date.toISOString().split('T')[0];
    const key = `${projectId}-${dateStr}`;
    const existingEntry = timeEntries[key];

    // Show error if value is not 0, 0.5, or 1
    if (![0, 0.5, 1].includes(hours)) {
      setTimeEntries(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          temps: hours,
          error: "Seules les valeurs 0, 0.5 et 1 sont autorisées"
        }
      }));
      return;
    }

    // Clear error and set saving state
    setTimeEntries(prev => ({
      ...prev,
      [key]: { 
        ...prev[key], 
        temps: hours,
        saving: true, 
        error: undefined 
      }
    }));

    try {
      if (hours === 0 && existingEntry?.entryId) {
        await timeEntriesApi.delete(existingEntry.entryId);
        await fetchTimeEntries(); // Refresh data after deletion
      } else if (existingEntry?.entryId) {
        await timeEntriesApi.update(existingEntry.entryId, {
          temps: hours
        });
        await fetchTimeEntries(); // Refresh data after update
      } else if (hours > 0) {
        await timeEntriesApi.create({
          date: dateStr,
          projet: projectId,
          temps: hours,
          description: ''  // Required field in the backend
        });
        await fetchTimeEntries(); // Refresh data after creation
      }
    } catch (error) {
      console.error("Error updating time entry:", error);
      setTimeEntries(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          saving: false,
          error: "Failed to save"
        }
      }));
    }
  };

  const getHours = (projectId: number, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const key = `${projectId}-${dateStr}`;
    return timeEntries[key]?.temps || '';
  };

  const getCellStatus = (projectId: number, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const key = `${projectId}-${dateStr}`;
    const entry = timeEntries[key];
    return {
      saving: entry?.saving,
      error: entry?.error
    };
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
              <td className="project-name">{project.nom}</td>
              {currentWeek.map(date => {
                const status = getCellStatus(project.id, date);
                return (
                  <td key={date.toISOString()} className={`hours-cell ${status.saving ? 'saving' : ''} ${status.error ? 'error' : ''}`}>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.5"
                      value={getHours(project.id, date)}
                      onChange={(e) => handleHoursChange(project.id, date, e.target.value)}
                      className="hours-input"
                      title={status.error}
                    />
                    {status.saving && <div className="saving-indicator" />}
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
