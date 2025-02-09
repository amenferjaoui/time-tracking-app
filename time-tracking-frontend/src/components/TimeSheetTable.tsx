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
    const [viewingAsManager, setViewingAsManager] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => {
      const today = new Date();
      if (isNaN(today.getTime())) {
        console.error("Invalid initial date");
        return new Date();
      }
      return today;
    });
    const [currentWeek, setCurrentWeek] = useState<Date[]>([]);

    const userId = user.id;
    
    useEffect(() => {
      setViewingAsManager(user.is_staff && user.id !== userId);
    }, [user.is_staff, user.id, userId]);
  
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
        
        setTimeEntries(prev => ({
            ...prev,
            [userId]: entriesMap
        }));    
      } catch (error) {
        console.error("Error fetching time entries:", error);
      }
    };
  
    // Fetch projects whenever user changes
    useEffect(() => {
      const fetchProjects = async () => {
        try {
          let allProjects: Project[] = [];
          
          if (user.role === 'admin') {
            // Admin voit tous les projets
            const response = await projectsApi.getAll();
            allProjects = response.data;
          } else if (user.role === 'manager') {
            // Manager voit les projets qu'il manage + les projets où il est assigné
            const [managedResponse, assignedResponse] = await Promise.all([
              projectsApi.getAll(), // Récupère tous les projets pour filtrer ceux qu'il manage
              projectsApi.getAll(user.id) // Récupère les projets où il est assigné
            ]);
            
            // Combine et déduplique les projets
            const managedProjects = managedResponse.data.filter(p => p.manager === user.id);
            const assignedProjects = assignedResponse.data;
            const projectMap = new Map<number, Project>();
            
            [...managedProjects, ...assignedProjects].forEach(project => {
              projectMap.set(project.id, project);
            });
            
            allProjects = Array.from(projectMap.values());
          } else {
            // Utilisateur normal voit uniquement les projets où il est assigné
            const response = await projectsApi.getAll(userId);
            allProjects = response.data;
          }
          
          setProjects(allProjects);
        } catch (error) {
          console.error("Error fetching projects:", error);
        }
      };
      fetchProjects();
    }, [userId, user.id, user.role]);
  
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
  
      const calculateDayTotal = (dateStr: string, excludeProjectId?: number) => {
        const userEntries = timeEntries[userId] || {};
        return Object.entries(userEntries).reduce((total, [key, entry]) => {
          const [projectId, entryDate] = key.split('-');
          if (entryDate === dateStr && Number(projectId) !== excludeProjectId) {
            return total + entry.temps;
          }
          return total;
        }, 0);
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
        const existingEntry = timeEntries[userId][key];
        
        // If value hasn't changed, do nothing
        if (existingEntry?.temps === hours) {
          return;
        }
  
        // Validate input value first
        if (![0, 0.5, 1].includes(hours)) {
          const restoredValue = existingEntry?.temps ? formatHours(existingEntry.temps) : "";
          setEditingValue(restoredValue);
          setTimeEntries(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [key]: { 
                    ...prev[key], 
                    temps: existingEntry?.temps || 0,
                    error: "Seules les valeurs 0, 0.5 et 1 sont autorisées"
                }
            }
          }));
          return;
        }
  
        // Then validate total time for this day
        const dayTotal = calculateDayTotal(dateStr, projectId);
        if (dayTotal + hours > 1.0) {
          const restoredValue = existingEntry?.temps ? formatHours(existingEntry.temps) : "";
          setEditingValue(restoredValue);
          setTimeEntries(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [key]: { 
                    ...prev[key], 
                    temps: existingEntry?.temps || 0,
                    error: `Le temps total (${dayTotal + hours}) ne peut pas dépasser 1 journée. Vous avez déjà saisi ${dayTotal} jour(s) pour cette date.`
                }
            }
          }));
          return;
        }
  
        try {
          if (hours === 0 && existingEntry?.entryId) {
            // Set saving state before API call
            setTimeEntries(prev => ({
                ...prev,
                [userId]: {
                    ...prev[userId],
                    [key]: { 
                        ...prev[key], 
                        saving: true, 
                        error: undefined 
                    }
                }
            }));
            await timeEntriesApi.delete(existingEntry.entryId);
            setTimeEntries(prev => ({
              ...prev,
              [userId]: {
                ...prev[userId],
                [key]: undefined
              }
            }));
          } else if (existingEntry?.entryId) {
            // Set saving state before API call
            setTimeEntries(prev => ({
                ...prev,
                [userId]: {
                    ...prev[userId],
                    [key]: { 
                        ...prev[key], 
                        saving: true, 
                        error: undefined 
                    }
                }
            }));
            await timeEntriesApi.update(existingEntry.entryId, { temps: hours });
            setTimeEntries(prev => ({
                ...prev,
                [userId]: {
                    ...prev[userId],
                    [key]: { temps: hours, entryId: existingEntry.entryId, saving: false }
                }
            }));
          } else if (hours > 0) {
            // Set saving state before API call
            setTimeEntries(prev => ({
                ...prev,
                [userId]: {
                    ...prev[userId],
                    [key]: { 
                        ...prev[key], 
                        saving: true, 
                        error: undefined 
                    }            
                }
            }));
            const response = await timeEntriesApi.create({ date: dateStr, projet: projectId, temps: hours, description: "" });
            setTimeEntries(prev => ({
                ...prev,
                [userId]: {
                    ...prev[userId],
                    [key]: { temps: hours, entryId: response.data.id, saving: false }
                }
            }));
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.non_field_errors?.[0] || 
                             error.response?.data?.detail ||
                             "Échec de l'enregistrement";
          setTimeEntries(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [key]: { 
                    ...prev[key], 
                    temps: existingEntry?.temps || 0,
                    saving: false, 
                    error: errorMessage 
                }            
            }
          }));
          // Restore the previous value in the input
          const restoredValue = existingEntry?.temps ? formatHours(existingEntry.temps) : "";
          setEditingValue(restoredValue);
        }
    };
  
    if (isLoading) {
      return <div className="loading-indicator">Chargement...</div>;
    }

  return (
    <div className="timesheet-container">
      <div className="timesheet-controls">
        {viewingAsManager && (
          <div className="manager-indicator">
            Consultation des temps de {user.username}
          </div>
        )}
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
                const entry = timeEntries[userId]?.[key];
                return (
                  <td key={dateStr} className={`hours-cell ${entry?.saving ? "saving" : ""} ${entry?.error ? "error" : ""}`}>
                    <div className="input-container">
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
                      />
                      {entry?.saving && <div className="saving-indicator" />}
                      {entry?.error && <div className="error-message">{entry.error}</div>}
                    </div>
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
