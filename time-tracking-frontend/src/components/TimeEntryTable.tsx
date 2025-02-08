import { useState, useEffect } from "react";
import { TimeEntry, Project } from "../types";
import { projectsApi, timeEntriesApi } from "../services/api";
import "./../styles/table.css";

interface Props {
  userId: number;
}

interface TimeEntryMap {
  [key: string]: {
    temps: number | "";
    entryId?: number;
    saving?: boolean;
    error?: string;
    inputValue?: string;
  };
}

export default function TimeEntryTable({ userId }: Props): JSX.Element {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentWeek, setCurrentWeek] = useState<Date[]>([]);

  const formatHours = (value: number | ""): string => {
    if (value === "") return "";
    return Number(value).toFixed(2);
  };

  useEffect(() => {
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      console.error("Invalid selected date");
      setCurrentWeek([]);
      return;
    }

    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);

    if (isNaN(startOfWeek.getTime())) {
      console.error("Invalid start of week date");
      setCurrentWeek([]);
      return;
    }

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });

    setCurrentWeek(weekDates);
  }, [selectedDate]);

  useEffect(() => {
    const fetchTimeEntries = async () => {
      if (!currentWeek.length || currentWeek.length < 7) {
        return;
      }

      const [firstDay, lastDay] = [currentWeek[0], currentWeek[6]];
      if (!firstDay || !lastDay || isNaN(firstDay.getTime()) || isNaN(lastDay.getTime())) {
        return;
      }

      try {
        const firstDayMonth = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}`;
        const lastDayMonth = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}`;

        const promises = [timeEntriesApi.getMonthlyReport(userId, firstDayMonth)];
        if (firstDayMonth !== lastDayMonth) {
          promises.push(timeEntriesApi.getMonthlyReport(userId, lastDayMonth));
        }

        const responses = await Promise.all(promises);
        const entriesMap: TimeEntryMap = {};

        responses.forEach(response => {
          response.data.forEach((entry: TimeEntry) => {
            if (entry.temps > 0) {
              const key = `${entry.projet}-${entry.date}`;
              entriesMap[key] = {
                temps: entry.temps,
                entryId: entry.id,
                saving: false,
                inputValue: formatHours(entry.temps)
              };
            }
          });
        });

        setTimeEntries(entriesMap);
      } catch (error) {
        console.error("Error fetching time entries:", error);
      }
    };

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const projectsRes = await projectsApi.getAll();
        setProjects(projectsRes.data);
        if (currentWeek.length === 7) {
          await fetchTimeEntries();
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, currentWeek]);

  const handleHoursChange = async (
    projectId: number,
    date: Date,
    newValue: string
  ): Promise<void> => {
    if (!date || isNaN(date.getTime())) {
      console.error("Invalid date in handleHoursChange");
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    const key = `${projectId}-${dateStr}`;
    const existingEntry = timeEntries[key];

    // Update input value immediately for responsive typing
    setTimeEntries(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        inputValue: newValue,
        temps: newValue === "" ? "" : parseFloat(newValue) || 0,
        error: undefined
      }
    }));

    // If the input is empty or incomplete (like "0."), don't validate or save yet
    if (newValue === "" || newValue === "0" || newValue === "0." || newValue.endsWith(".")) {
      return;
    }

    const hours = parseFloat(newValue);

    if (existingEntry?.temps === hours) return;

    if (![0, 0.5, 1].includes(hours)) {
      setTimeEntries(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          temps: "",
          error: "Valeur invalide"
        }
      }));
      return;
    }

    try {
      // Delete entry if hours is 0 or empty
      if (hours === 0 || newValue === "") {
        if (existingEntry?.entryId) {
          await timeEntriesApi.delete(existingEntry.entryId);
          setTimeEntries(prev => {
            const { [key]: _, ...rest } = prev;
            return rest;
          });
        } else {
          setTimeEntries(prev => {
            const { [key]: _, ...rest } = prev;
            return rest;
          });
        }
        return;
      }

      // Only proceed with update/create if hours is greater than 0
      if (hours > 0) {
        setTimeEntries(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            temps: hours,
            saving: true,
            error: undefined
          }
        }));

        if (existingEntry?.entryId) {
          await timeEntriesApi.update(existingEntry.entryId, {
            temps: hours,
            user: userId,
            date: dateStr,
            projet: projectId
          });
          setTimeEntries(prev => ({
            ...prev,
            [key]: {
              temps: hours,
              entryId: existingEntry.entryId,
              saving: false,
              inputValue: formatHours(hours)
            }
          }));
        } else {
          const response = await timeEntriesApi.create({
            date: dateStr,
            projet: projectId,
            temps: hours,
            description: '',
            user: userId
          });

          setTimeEntries(prev => ({
            ...prev,
            [key]: {
              temps: hours,
              entryId: response.data.id,
              saving: false,
              inputValue: formatHours(hours)
            }
          }));
        }
      }
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement :", error);

      let errorMessage = "Temps total de travail dépassé";
      if (error.response?.data?.non_field_errors) {
        errorMessage = error.response.data.non_field_errors[0];
      }

      setTimeEntries(prev => ({
        ...prev,
        [key]: {
          temps: existingEntry?.temps ?? "",
          entryId: existingEntry?.entryId,
          error: errorMessage,
          inputValue: existingEntry?.inputValue ?? ""
        }
      }));
    }
  };

  const handleInputBlur = (key: string) => {
    const entry = timeEntries[key];
    if (entry) {
      // If the value is 0 or empty on blur, remove the entry
      if (!entry.temps || entry.temps === 0) {
        if (entry.entryId) {
          timeEntriesApi.delete(entry.entryId).then(() => {
            setTimeEntries(prev => {
              const { [key]: _, ...rest } = prev;
              return rest;
            });
          });
        } else {
          setTimeEntries(prev => {
            const { [key]: _, ...rest } = prev;
            return rest;
          });
        }
      } else if (typeof entry.temps === "number" && !isNaN(entry.temps)) {
        // Format non-zero values
        setTimeEntries(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            inputValue: formatHours(entry.temps)
          }
        }));
      }
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!currentWeek.length) {
    return <div>Erreur: Impossible de charger le calendrier</div>;
  }

  return (
    <div className="timesheet-container">
      <div className="timesheet-controls">
        <div className="week-navigation">
          <button onClick={() => setSelectedDate(prev => new Date(prev.setDate(prev.getDate() - 7)))}>
            ← Semaine précédente
          </button>
          <span className="week-label">
            Semaine du {currentWeek[0]?.toLocaleDateString('fr-FR')}
          </span>
          <button
            onClick={() => setSelectedDate(prev => new Date(prev.setDate(prev.getDate() + 7)))}
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
                const dateStr = date.toISOString().split('T')[0];
                const key = `${project.id}-${dateStr}`;
                const entry = timeEntries[key];
                return (
                  <td key={dateStr} className="hours-cell">
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.5"
                      placeholder="0, 0.5, 1"
                      value={entry?.inputValue ?? ""}
                      onChange={(e) => handleHoursChange(project.id, date, e.target.value)}
                      onBlur={() => handleInputBlur(key)}
                      className="hours-input"
                    />
                    {entry?.error && <div className="error-message">{entry.error}</div>}
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
