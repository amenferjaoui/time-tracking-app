import { useState, useEffect } from "react";
import { User, TimeEntry, Project } from "../types";
import { projectsApi, timeEntriesApi } from "../services/api";
import "./../styles/table.css";

interface Props {
  user: User;
}

interface TimeEntryMap {
  [key: string]: {
    temps: number;
    entryId?: number;
    saving?: boolean;
    error?: string;
  };
}

export default function TimeSheetTable({ user }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<{ [userId: string]: TimeEntryMap }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);

  const userId = user.id;
  console.log('userId: ',userId)

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
      setTimeEntries(prev => ({
        ...prev,
        [userId]: entriesMap
      }));
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
    console.log(hours);
    const dateStr = date.toISOString().split("T")[0];
    console.log(dateStr);
    const key = `${projectId}-${dateStr}`;
    console.log(key);
    const existingEntry = timeEntries[userId]?.[key];
    console.log(timeEntries);
    if (existingEntry?.temps === hours) return;

    if (![0, 0.5, 1].includes(hours)) {
      setTimeEntries(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          [key]: { ...prev[userId]?.[key], temps: hours, error: "Seules les valeurs 0, 0.5 et 1 sont autorisées" }
        }
      }));
      return;
    }

    setTimeEntries(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [key]: { temps: hours, entryId: existingEntry?.entryId, saving: true, error: undefined }
      }
    }));

    try {
      if (hours === 0 && existingEntry?.entryId) {
        await timeEntriesApi.delete(existingEntry.entryId);
        setTimeEntries(prev => {
          const updatedEntries = { ...prev };
          delete updatedEntries[userId]?.[key];
          return updatedEntries;
        });
      } else if (existingEntry?.entryId) {
        await timeEntriesApi.update(existingEntry.entryId, {
            temps: hours,
            date: dateStr,
            projet: projectId
        }); 
        setTimeEntries(prev => ({
          ...prev,
          [userId]: {
            ...prev[userId],
            [key]: { temps: hours, entryId: existingEntry.entryId, saving: false }
          }
        }));
      } else if (hours > 0) {
        const response = await timeEntriesApi.create({ date: dateStr, projet: projectId, temps: hours, description: "" });
        setTimeEntries(prev => ({
          ...prev,
          [userId]: {
            ...prev[userId],
            [key]: { temps: hours, entryId: response.data.id, saving: false }
          }
        }));
      }
    } catch (error) {
      console.error("Error updating time entry:", error);
      setTimeEntries(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          [key]: { ...prev[userId]?.[key], saving: false, error: "Échec de l'enregistrement" }
        }
      }));
    }
  };

  if (isLoading) {
    return <div className="loading-indicator">Chargement...</div>;
  }

  return (
    <div className="timesheet-container">
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
                const entry = timeEntries[userId]?.[key];
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