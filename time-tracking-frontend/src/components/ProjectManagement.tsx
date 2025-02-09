import { useState, useEffect } from "react";
import { Project, User } from "../types";
import { projectsApi, authApi } from "../services/api";
import "../styles/form.css";
import "../styles/table.css";

interface ProjectForm {
  nom: string;
  description: string;
  manager: number;
}

export default function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState({ projects: true, users: true });
  const [error, setError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectForm>({
    nom: "",
    description: "",
    manager: 0,
  });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string } | null>(null);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [regularUsers, setRegularUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<{ [key: string]: number[] }>({});
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      await fetchUserRole();
      await fetchProjects();
      await fetchStaffUsers();
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchRegularUsers();
    }
  }, [userRole, currentUser?.id]);

  const fetchProjects = async () => {
    try {
      setLoading(prev => ({ ...prev, projects: true }));
      const response = await projectsApi.getAll();
    
      console.log('Projects response:', response.data);

      // S'assurer que chaque projet a un tableau users valide
      const projectsWithUsers = response.data.map(project => {
        console.log('Project users:', project.id, project.users);
        return {
          ...project,
          users: Array.isArray(project.users) ? project.users : []
        };
      });

      setProjects(projectsWithUsers);

      // Rafraîchir les utilisateurs après avoir chargé les projets
      if (userRole) {
        await fetchRegularUsers();
      }
    } catch (error) {
      console.error(error);
      setError("Impossible de charger les projets.");
    } finally {
      setLoading(prev => ({ ...prev, projects: false }));
    }
  };

  const fetchUserRole = async () => {
    try {
      const response = await authApi.getCurrentUser();
      setUserRole(response.data.role);
      setCurrentUser({ id: response.data.id, username: response.data.username });

      if (response.data.role === "manager") {
        setFormData((prev) => ({ ...prev, manager: response.data.id }));
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du rôle utilisateur.");
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const response = await authApi.getAllUsers();

      const allUsers: User[] = response.data;

      const filteredStaff = allUsers.filter(user => user.is_staff || user.is_superuser);

      setStaffUsers(filteredStaff);

      console.log('Current projects:', projects);
      projects.forEach(project => {
        console.log(`Project ${project.nom} manager ID:`, project.manager);
        const manager = response.data.find(user => user.id === project.manager);
        console.log(`Found manager:`, manager);
      });
    } catch (error) {
      console.error("Erreur lors du chargement des managers.");
    }
  };

  const fetchRegularUsers = async () => {
    try {
      setLoading(prev => ({ ...prev, users: true }));
      const response = await authApi.getAllUsers();
      const allUsers = response.data;

      // Filter users based on role permissions only
      const filteredUsers: User[] = allUsers.filter((user: User) => {
        if (userRole === 'admin') {
          return !user.is_superuser;
        } else if (userRole === 'manager' && currentUser) {
          return !user.is_superuser && user.manager === currentUser.id;
        }
        return false;
      });

      setRegularUsers(filteredUsers);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs.");
      setError("Impossible de charger les utilisateurs.");
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  const handleUserAssignment = async (projectId: number, selectedUserIds: number[]) => {
    try {
      setAssignError(null);
      await projectsApi.assignUsers(projectId, selectedUserIds);

      // Clear selections
      setSelectedUsers(prev => ({
        ...prev,
        [projectId.toString()]: [],
        [`remove-${projectId}`]: []
      }));

      const selectedUsers = regularUsers.filter(user => selectedUserIds.includes(user.id));

      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === projectId
            ? { ...p, users: selectedUsers }
            : p
        )
      );

    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.error || "Erreur lors de l'assignation des utilisateurs.";
      setAssignError(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      const newProjectData = {
        ...formData,
        manager: formData.manager || (currentUser?.id ?? 0),
      };

      if (editingProject) {
        const response = await projectsApi.update(editingProject.id, newProjectData);
        setProjects((prevProjects) =>
          prevProjects.map((p) => (p.id === editingProject.id ? response.data : p))
        );
        setEditingProject(null);
      } else {
        const response = await projectsApi.create(newProjectData);
        setProjects((prevProjects) => [...prevProjects, response.data]);
      }

      setFormData({ nom: "", description: "", manager: 0 });
    } catch (error) {
      console.error(error);
      setError("Échec de l'enregistrement du projet.");
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      nom: project.nom,
      description: project.description || "",
      manager: project.manager,
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce projet ?")) return;

    try {
      await projectsApi.delete(id);
      setProjects((prevProjects) => prevProjects.filter((p) => p.id !== id));
    } catch (error) {
      console.error(error);
      setError("Impossible de supprimer le projet.");
    }
  };

  const handleCancel = () => {
    setEditingProject(null);
    setFormData({ nom: "", description: "", manager: 0 });
  };

  if (loading.projects || loading.users) return <div className="loading">Chargement...</div>;

  return (
    <div className="project-management">
      <div className="content-section">
        <h2>{editingProject ? "Modifier le projet" : "Nouveau projet"}</h2>
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label>Nom du projet :</label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              required
              placeholder="Nom du projet"
            />
          </div>

          <div className="form-group">
            <label>Description :</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description du projet"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Manager :</label>
            {userRole === "admin" ? (
              <select
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: Number(e.target.value) })}
                required
              >
                <option value="0" disabled>Sélectionnez un manager</option>
                {staffUsers.filter(user => user.is_staff || user.is_superuser)
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
              </select>
            ) : (
              <p>{currentUser?.username} (vous)</p>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-buttons">
            <button type="submit" className="submit-button">
              {editingProject ? "Mettre à jour" : "Créer"}
            </button>
            {editingProject && (
              <button type="button" onClick={handleCancel} className="cancel-button">
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="content-section">
        <h2>Liste des projets</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Description</th>
                <th>Manager</th>
                <th>Utilisateurs assignés</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.nom}</td>
                  <td>{project.description}</td>
                  <td>
                    {project.manager === currentUser?.id
                      ? "Vous"
                      : staffUsers.find((user) => user.id === project.manager)?.username || "Manager inconnu"}
                  </td>
                  <td>
                    {(userRole === 'admin' || (userRole === 'manager' && project.manager === currentUser?.id)) ? (
                      <div className="user-assignment">
                        <div className="user-assignment-section">
                          <div className="available-users">
                            <h4>Utilisateurs disponibles</h4>
                            <select
                              multiple
                              size={5}
                              value={selectedUsers[project.id.toString()]?.map(String) || []}
                              onChange={(e) => {
                                const selectedOptions = Array.from(e.target.selectedOptions, option => Number(option.value));
                                setSelectedUsers(prev => ({
                                  ...prev,
                                  [project.id.toString()]: selectedOptions
                                }));
                              }}
                              className="user-select"
                            >
                              {regularUsers
                                .filter(user => !project.users?.some(u => u.id === user.id))
                                .map(user => (
                                  <option key={user.id} value={user.id}>
                                    {user.username}
                                  </option>
                                ))
                              }
                            </select>
                            <button
                              onClick={() => {
                                const existingUserIds = project.users?.map(u => u.id) || [];
                                const newUserIds = [
                                  ...existingUserIds,
                                  ...(selectedUsers[project.id.toString()] || [])
                                ];
                                handleUserAssignment(project.id, newUserIds);
                              }}
                              className="assign-button"
                              disabled={!selectedUsers[project.id.toString()]?.length}
                            >
                              ➜ Assigner
                            </button>
                          </div>

                          <div className="assigned-users">
                            <h4>Utilisateurs assignés</h4>
                            <select
                              multiple
                              size={5}
                              value={selectedUsers[`remove-${project.id}`]?.map(String) || []}
                              onChange={(e) => {
                                const selectedOptions = Array.from(e.target.selectedOptions, option => Number(option.value));
                                setSelectedUsers(prev => ({
                                  ...prev,
                                  [`remove-${project.id}`]: selectedOptions
                                }));
                              }}
                              className="user-select"
                            >
                              {project.users?.map(user => (
                                <option key={user.id} value={user.id}>
                                  {user.username}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const selectedToRemove = new Set(selectedUsers[`remove-${project.id}`] || []);
                                const newAssignedUserIds = (project.users || [])
                                  .filter(user => !selectedToRemove.has(user.id))
                                  .map(user => user.id);
                                handleUserAssignment(project.id, newAssignedUserIds);
                              }}
                              className="remove-button"
                              disabled={!selectedUsers[`remove-${project.id}`]?.length}
                            >
                              ✕ Retirer
                            </button>
                          </div>
                        </div>
                        {assignError && <div className="error-message">{assignError}</div>}
                      </div>
                    ) : (
                      <div>
                        {userRole === "user" && project.users?.some(u => u.id === (currentUser?.id || 0))
                          ? "Vous êtes assigné"
                          : userRole === "user"
                            ? "Non assigné"
                            : project.users && project.users.length > 0
                              ? project.users?.map(u => u.username).join(', ')
                              : "Aucun utilisateur assigné"}
                      </div>
                    )}
                  </td>
                  <td className="action-buttons">
                    {(userRole === 'admin' || (userRole === 'manager' && project.manager === currentUser?.id)) && (
                      <>
                        <button onClick={() => handleEdit(project)} className="edit-button">
                          Modifier
                        </button>
                        <button onClick={() => handleDelete(project.id)} className="delete-button">
                          Supprimer
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {projects.length === 0 && <div className="no-entries">Aucun projet créé</div>}
        </div>
      </div>
    </div>
  );
}
