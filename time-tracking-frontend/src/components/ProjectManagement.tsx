// import { useState, useEffect } from "react";
// import { Project } from "../types";
// import { projectsApi, authApi } from "../services/api";
// import "../styles/form.css";
// import "../styles/table.css";

// interface ProjectForm {
//   nom: string;
//   description: string;
//   manager: number; 
// }

// export default function ProjectManagement() {
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [editingProject, setEditingProject] = useState<Project | null>(null);
//   const [formData, setFormData] = useState<ProjectForm>({
//     nom: "",
//     description: "",
//     manager: 0, // Manager sera sélectionné via un dropdown
//   });
//   const [userRole, setUserRole] = useState<string | null>(null);
//   const [staffUsers, setStaffUsers] = useState<{ id: number; username: string }[]>([]);

//   useEffect(() => {
//     fetchProjects();
//     fetchUserRole();
//     fetchStaffUsers();
//   }, []);

//   // Récupérer les projets
//   const fetchProjects = async () => {
//     try {
//       setLoading(true);
//       const response = await projectsApi.getAll();
//       setProjects(response.data);
//     } catch (error) {
//       console.error(error);
//       setError("Impossible de charger les projets.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Récupérer le rôle de l'utilisateur connecté
//   const fetchUserRole = async () => {
//     try {
//       const response = await authApi.getCurrentUser();
//       setUserRole(response.data.role);
//     } catch (error) {
//       console.error("Erreur lors de la récupération du rôle utilisateur.");
//     }
//   };

//   // Récupérer la liste des managers possibles
//   const fetchStaffUsers = async () => {
//     try {
//       const response = await authApi.getAllUsers();
//       const staff = response.data.filter((user: any) => user.is_staff);
//       setStaffUsers(staff);
//     } catch (error) {
//       console.error("Erreur lors du chargement des managers.");
//     }
//   };

//   // Gestion du formulaire (ajout/modification)
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       setError(null);
//       if (editingProject) {
//         // Modification
//         const response = await projectsApi.update(editingProject.id, formData);
//         setProjects((prevProjects) =>
//           prevProjects.map((p) => (p.id === editingProject.id ? response.data : p))
//         );
//         setEditingProject(null);
//       } else {
//         // Création
//         const response = await projectsApi.create(formData);
//         setProjects((prevProjects) => [...prevProjects, response.data]);
//       }
//       setFormData({ nom: "", description: "", manager: 0 });
//     } catch (error) {
//       console.error(error);
//       setError("Échec de l'enregistrement du projet.");
//     }
//   };

//   // Gestion de l'édition
//   const handleEdit = (project: Project) => {
//     setEditingProject(project);
//     setFormData({
//       nom: project.nom,
//       description: project.description || "",
//       manager: project.manager,
//     });
//   };

//   // Suppression
//   const handleDelete = async (id: number) => {
//     if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce projet ?")) return;

//     try {
//       await projectsApi.delete(id);
//       setProjects((prevProjects) => prevProjects.filter((p) => p.id !== id));
//     } catch (error) {
//       console.error(error);
//       setError("Impossible de supprimer le projet.");
//     }
//   };

//   // Annuler l'édition
//   const handleCancel = () => {
//     setEditingProject(null);
//     setFormData({ nom: "", description: "", manager: 0 });
//   };

//   if (loading) return <div className="loading">Chargement des projets...</div>;

//   return (
//     <div className="project-management">
//       <div className="content-section">
//         <h2>{editingProject ? "Modifier le projet" : "Nouveau projet"}</h2>
//         <form onSubmit={handleSubmit} className="form-container">
//           <div className="form-group">
//             <label>Nom du projet :</label>
//             <input
//               type="text"
//               value={formData.nom}
//               onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
//               required
//               placeholder="Nom du projet"
//             />
//           </div>

//           <div className="form-group">
//             <label>Description :</label>
//             <textarea
//               value={formData.description}
//               onChange={(e) => setFormData({ ...formData, description: e.target.value })}
//               placeholder="Description du projet"
//               rows={3}
//             />
//           </div>

//           <div className="form-group">
//             <label>Manager :</label>
//             <select
//               value={formData.manager}
//               onChange={(e) => setFormData({ ...formData, manager: Number(e.target.value) })}
//               required
//             >
//               <option value="0" disabled>Sélectionnez un manager</option>
//               {staffUsers.map((user) => (
//                 <option key={user.id} value={user.id}>
//                   {user.username}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {error && <div className="error-message">{error}</div>}

//           <div className="form-buttons">
//             <button type="submit" className="submit-button">
//               {editingProject ? "Mettre à jour" : "Créer"}
//             </button>
//             {editingProject && (
//               <button type="button" onClick={handleCancel} className="cancel-button">
//                 Annuler
//               </button>
//             )}
//           </div>
//         </form>
//       </div>

//       <div className="content-section">
//         <h2>Liste des projets</h2>
//         <div className="table-container">
//           <table>
//             <thead>
//               <tr>
//                 <th>Nom</th>
//                 <th>Description</th>
//                 <th>Manager</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {projects.map((project) => (
//                 <tr key={project.id}>
//                   <td>{project.nom}</td>
//                   <td>{project.description}</td>
//                   <td>{staffUsers.find((user) => user.id === project.manager)?.username || "N/A"}</td>
//                   <td className="action-buttons">
//                     {userRole !== "user" && (
//                       <>
//                         <button onClick={() => handleEdit(project)} className="edit-button">
//                           Modifier
//                         </button>
//                         <button onClick={() => handleDelete(project.id)} className="delete-button">
//                           Supprimer
//                         </button>
//                       </>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           {projects.length === 0 && <div className="no-entries">Aucun projet créé</div>}
//         </div>
//       </div>
//     </div>
//   );
// }



import { useState, useEffect } from "react";
import { Project } from "../types";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectForm>({
    nom: "",
    description: "",
    manager: 0, // Sera défini en fonction du rôle
  });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string } | null>(null);
  const [staffUsers, setStaffUsers] = useState<{ id: number; username: string }[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchUserRole();
    fetchStaffUsers();
  }, []);

  // Récupérer les projets
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsApi.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error(error);
      setError("Impossible de charger les projets.");
    } finally {
      setLoading(false);
    }
  };

  // Récupérer le rôle et l'ID de l'utilisateur connecté
  const fetchUserRole = async () => {
    try {
      const response = await authApi.getCurrentUser();
      setUserRole(response.data.role);
      setCurrentUser({ id: response.data.id, username: response.data.username });

      // Si l'utilisateur est un manager, définir automatiquement son ID comme manager
      if (response.data.role === "manager") {
        setFormData((prev) => ({ ...prev, manager: response.data.id }));
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du rôle utilisateur.");
    }
  };

  // Récupérer la liste des managers possibles
  const fetchStaffUsers = async () => {
    try {
      const response = await authApi.getAllUsers();
      const staff = response.data.filter((user: any) => user.is_staff);
      setStaffUsers(staff);
    } catch (error) {
      console.error("Erreur lors du chargement des managers.");
    }
  };

  // Gestion du formulaire (ajout/modification)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      const newProjectData = {
        ...formData,
        manager: userRole === "manager" ? currentUser?.id ?? 0 : formData.manager,
      };

      if (editingProject) {
        // Modification
        const response = await projectsApi.update(editingProject.id, newProjectData);
        setProjects((prevProjects) =>
          prevProjects.map((p) => (p.id === editingProject.id ? response.data : p))
        );
        setEditingProject(null);
      } else {
        // Création
        const response = await projectsApi.create(newProjectData);
        setProjects((prevProjects) => [...prevProjects, response.data]);
      }

      setFormData({ nom: "", description: "", manager: 0 });
    } catch (error) {
      console.error(error);
      setError("Échec de l'enregistrement du projet.");
    }
  };

  // Gestion de l'édition
  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      nom: project.nom,
      description: project.description || "",
      manager: project.manager,
    });
  };

  // Suppression
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

  // Annuler l'édition
  const handleCancel = () => {
    setEditingProject(null);
    setFormData({ nom: "", description: "", manager: 0 });
  };

  if (loading) return <div className="loading">Chargement des projets...</div>;

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
                {staffUsers.map((user) => (
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.nom}</td>
                  <td>{project.description}</td>
                  <td>{staffUsers.find((user) => user.id === project.manager)?.username || "N/A"}</td>
                  <td className="action-buttons">
                    {userRole !== "user" && (
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

