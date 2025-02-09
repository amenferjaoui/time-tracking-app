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
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    if (isNaN(today.getTime())) {
      console.error("Invalid initial date");
      return new Date();
    }
    return today;
  });
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);

  useEffect(() => {
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      console.error("Invalid selected date");
      return;
    }

    try {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
      
      if (isNaN(startOfWeek.getTime())) {
        console.error("Invalid start of week date");
        return;
      }

      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return date;
      });

      if (weekDates.some(date => !date || isNaN(date.getTime()))) {
        console.error("Invalid dates in week array");
        return;
      }

      setCurrentWeek(weekDates);
    } catch (error) {
      console.error("Error calculating week dates:", error);
    }
  }, [selectedDate]);

  const fetchTimeEntries = async () => {
    if (!currentWeek || currentWeek.length < 7) {
      console.error("Invalid week data");
      return;
    }

    const firstDay = currentWeek[0];
    const lastDay = currentWeek[6];

    if (!firstDay || !lastDay || isNaN(firstDay.getTime()) || isNaN(lastDay.getTime())) {
      console.error("Invalid dates in week data");
      return;
    }

    try {
      const firstDayMonth = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, "0")}`;
      const lastDayMonth = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}`;
      
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

  // Fetch projects only once when component mounts
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsRes = await projectsApi.getAll();
        setProjects(projectsRes.data);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    fetchProjects();
  }, []);

  // Fetch time entries whenever currentWeek changes
  useEffect(() => {
    const fetchData = async () => {
      if (!currentWeek || currentWeek.length < 7) {
        return;
      }

      setIsLoading(true);
      try {
        await fetchTimeEntries();
      } catch (error) {
        console.error("Error fetching time entries:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentWeek, userId]);

  const handleWeekChange = (direction: "prev" | "next") => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - prev.getDay() + (direction === "next" ? 8 : -6)); // Aller au lundi suivant ou précédent
      return newDate;
    });
  };

  const [editingValue, setEditingValue] = useState<string>("");
  const [isEditing, setIsEditing] = useState<string>("");

  const formatHours = (value: number | string): string => {
    if (value === "" || value === undefined) return "";
    const number = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
    if (isNaN(number)) return "";
    return number.toFixed(2).replace(".", ",");
  };

  const handleHoursChange = async (projectId: number, date: Date, newValue: string) => {
    // Allow typing numbers, dot and comma
    if (!/^[0-9]*[,.]?[0-9]*$/.test(newValue) && newValue !== "") return;
    
    const dateStr = date.toISOString().split("T")[0];
    const key = `${projectId}-${dateStr}`;
    setEditingValue(newValue);
    setIsEditing(key);

    // If empty or still typing decimal, don't process yet
    if (newValue === "" || newValue === "." || newValue === "," || newValue.endsWith(".") || newValue.endsWith(",")) {
      return;
    }

    const hours = parseFloat(newValue.replace(",", "."));
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
        <button className="week-button" onClick={() => handleWeekChange("prev")}>
          ← Semaine précédente
        </button>
        <span className="week-label">Semaine du {currentWeek[0]?.toLocaleDateString("fr-FR")}</span>
        <button className="week-button" onClick={() => handleWeekChange("next")}>
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
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[,.]?[0-9]*"
                      value={isEditing === key ? editingValue : (entry?.temps ? formatHours(entry.temps) : "")}
                      onChange={(e) => handleHoursChange(project.id, date, e.target.value)}
                      onBlur={() => {
                        setIsEditing("");
                        setEditingValue("");
                      }}
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
