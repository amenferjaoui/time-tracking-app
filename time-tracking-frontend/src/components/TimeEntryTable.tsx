import { useState, useEffect } from "react";
import { User } from "../types";
import { timeEntriesApi } from "../services/api";
import "./../styles/table.css";
import TimeSheetTable from "./TimeSheetTable";

interface Props {
  user: User;
}

export default function TimeEntryTable({ user }: Props) {

  const [, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number>(user.id);
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);

  const isManager = user.is_staff;

  // Récupérer la liste des utilisateurs assignés (si c'est un manager)
  useEffect(() => {
    if (isManager) {
      const fetchAssignedUsers = async () => {
        try {
          const response = await timeEntriesApi.getAssignedUsers(user.id);
          setAssignedUsers(response.data);
        } catch (error) {
          console.error(error);
          setError("Échec du chargement des utilisateurs assignés.");
        }
      };
      fetchAssignedUsers();
    }
  }, [isManager, user.id]);
  

  return (
    <div className="timesheet-container">
        {isManager ? (
        <>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(Number(e.target.value))}
            className="user-selector"
          >
            {[user, ...assignedUsers.filter(u => u.id !== user.id)].map((u) => (
              <option key={u.id} value={u.id}>
                {u.id === user.id ? "Mes temps" : u.username}
              </option>
            ))}
          </select>
          <TimeSheetTable user={selectedUserId === user.id ? user : assignedUsers.find(u => u.id === selectedUserId)!} />
        </>
      ) : (
        <TimeSheetTable user={user} />
      )}
    </div>
  );
}
