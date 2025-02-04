import { useForm } from "react-hook-form";
import { TimeEntry, FormError } from "../types";
import { timeEntriesApi } from "../services/api";
import { useState } from "react";
import "./../styles/form.css";

interface Props {
  onAddEntry: (data: TimeEntry) => void;
  projects: { id: string; name: string }[];
}

export default function TimeEntryForm({ onAddEntry, projects }: Props) {
  const [error, setError] = useState<FormError | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TimeEntry>();

  const onSubmit = async (data: TimeEntry) => {
    try {
      setError(null);
      const response = await timeEntriesApi.create(data);
      onAddEntry(response.data);
      reset();
    } catch (err) {
      setError({ field: 'submit', message: 'Failed to save time entry. Please try again.' });
    }
  };

  return (
    <form className="form-container" onSubmit={handleSubmit(onSubmit)}>
      <div className="form-group">
        <label>Date :</label>
        <input 
          type="date" 
          {...register("date", { 
            required: "Date is required" 
          })} 
        />
        {errors.date && <span className="error">{errors.date.message}</span>}
      </div>

      <div className="form-group">
        <label>Projet :</label>
        <select 
          {...register("project", { 
            required: "Project is required" 
          })}
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {errors.project && <span className="error">{errors.project.message}</span>}
      </div>

      <div className="form-group">
        <label>Heures :</label>
        <input 
          type="number" 
          {...register("hours", { 
            required: "Hours are required",
            min: { value: 0.5, message: "Minimum 0.5 hours" },
            max: { value: 24, message: "Maximum 24 hours" }
          })} 
          step="0.5"
        />
        {errors.hours && <span className="error">{errors.hours.message}</span>}
      </div>

      {error && <div className="error-message">{error.message}</div>}
      
      <button type="submit">Ajouter</button>
    </form>
  );
}
