import { useState, useEffect } from "react";
import { TimeEntry, Project, User } from "../types";
import { projectsApi, timeEntriesApi, authApi } from "../services/api";
import "./../styles/table.css";

interface Props {
  userId?: number;  // Optional since we'll get it from user selection for managers
}

interface TimeEntryMap {
  [key: string]: {
    temps: number;
    entryId?: number;
    saving?: boolean;
    error?: string;
  };
}

export default function TimeEntryTable({ userId: propUserId }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(propUserId);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Fetch current user and their managed users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const currentUserRes = await authApi.getCurrentUser();
        setCurrentUser(currentUserRes.data);
        
        if (currentUserRes.data.is_staff || currentUserRes.data.is_superuser) {
          const usersRes = await authApi.getAllUsers();
          const filteredUsers = currentUserRes.data.is_superuser 
            ? usersRes.data 
            : usersRes.data.filter((u: User) => u.manager === currentUserRes.data.id || u.id === currentUserRes.data.id);
          setUsers(filteredUsers);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  // Set initial selected user
  useEffect(() => {
    if (propUserId) {
      setSelectedUserId(propUserId);
    } else if (currentUser) {
      setSelectedUserId(currentUser.id);
    }
  }, [propUserId, currentUser]);

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
    if (!selectedUserId) {
      console.error("No user selected");
      return;
    }

    try {
      // Get all time entries
      const allEntriesRes = await timeEntriesApi.getAll();
      const entriesMap: TimeEntryMap = {};
      
      // Filter entries for the selected user
      allEntriesRes.data
        .filter((entry: TimeEntry) => entry.user === selectedUserId)
        .forEach((entry: TimeEntry) => {
          const key = `${entry.projet}-${entry.date}`;
          entriesMap[key] = { temps: entry.temps, entryId: entry.id };
        });
      
      setTimeEntries(entriesMap);
    } catch (error) {
      console.error("Error fetching time entries:", error);
    }
  };

  // Fetch projects when component mounts or selected user changes
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        console.log(selectedUserId);
        const projectsRes = selectedUserId && selectedUserId !== currentUser?.id
          ? await projectsApi.getProjectsForUsers(selectedUserId)
          : await projectsApi.getAll();
        setProjects(projectsRes.data);
        console.log("Projects fetched:", projectsRes.data);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    fetchProjects();
  }, [selectedUserId]);

  // Fetch time entries whenever currentWeek or selectedUser changes
  useEffect(() => {
    const fetchData = async () => {
      if (!currentWeek || currentWeek.length < 7 || !selectedUserId) {
        return;
      }

      setIsLoading(true);
      try {
        // Fetch time entries for the selected user
        await fetchTimeEntries();
      } catch (error) {
        console.error("Error fetching time entries:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentWeek, selectedUserId]);

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

    const calculateDayTotal = (dateStr: string, excludeProjectId?: number, excludeHours?: number) => {
      return Object.entries(timeEntries).reduce((total, [key, entry]) => {
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
      const existingEntry = timeEntries[key];
      
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
          [key]: { 
            ...prev[key], 
            temps: existingEntry?.temps || 0,
            error: "Seules les valeurs 0, 0.5 et 1 sont autorisées"
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
          [key]: { 
            ...prev[key], 
            temps: existingEntry?.temps || 0,
            error: `Le temps total (${dayTotal + hours}) ne peut pas dépasser 1 journée. Vous avez déjà saisi ${dayTotal} jour(s) pour cette date.`
          }
        }));
        return;
      }

      try {
        if (hours === 0 && existingEntry?.entryId) {
          // Set saving state before API call
          setTimeEntries(prev => ({
            ...prev,
            [key]: { 
              ...prev[key], 
              saving: true, 
              error: undefined 
            }
          }));
          await timeEntriesApi.delete(existingEntry.entryId);
          setTimeEntries(prev => {
            const updatedEntries = { ...prev };
            delete updatedEntries[key];
            return updatedEntries;
          });
        } else if (existingEntry?.entryId) {
          // Set saving state before API call
          setTimeEntries(prev => ({
            ...prev,
            [key]: { 
              ...prev[key], 
              saving: true, 
              error: undefined 
            }
          }));
          await timeEntriesApi.update(existingEntry.entryId, { temps: hours });
          setTimeEntries(prev => ({
            ...prev,
            [key]: { temps: hours, entryId: existingEntry.entryId, saving: false }
          }));
        } else if (hours > 0) {
          // Set saving state before API call
          setTimeEntries(prev => ({
            ...prev,
            [key]: { 
              ...prev[key], 
              saving: true, 
              error: undefined 
            }
          }));
          const response = await timeEntriesApi.create({ 
            date: dateStr, 
            projet: projectId, 
            temps: hours, 
            description: "",
            user: selectedUserId 
          });
          setTimeEntries(prev => ({
            ...prev,
            [key]: { temps: hours, entryId: response.data.id, saving: false }
          }));
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.non_field_errors?.[0] || 
                           error.response?.data?.detail ||
                           "Échec de l'enregistrement";
        setTimeEntries(prev => ({
          ...prev,
          [key]: { 
            ...prev[key], 
            temps: existingEntry?.temps || 0,
            saving: false, 
            error: errorMessage 
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
      {currentUser?.is_staff && users.length > 0 && (
        <div className="user-selector">
          <label>Utilisateur : </label>
          <select 
            value={selectedUserId} 
            onChange={(e) => setSelectedUserId(Number(e.target.value))}
          >
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>
        </div>
      )}
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
