// import { useState, useEffect } from 'react';
// import { Project } from '../types';
// import { projectsApi } from '../services/api';
// import '../styles/form.css';
// import '../styles/table.css';

// interface ProjectForm {
//   name: string;
//   description: string;
// }

// export default function ProjectManagement() {
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [editingProject, setEditingProject] = useState<Project | null>(null);
//   const [formData, setFormData] = useState<ProjectForm>({
//     name: '',
//     description: ''
//   });

//   useEffect(() => {
//     fetchProjects();
//   }, []);

//   const fetchProjects = async () => {
//     try {
//       setLoading(true);
//       const response = await projectsApi.getAll();
//       setProjects(response.data);
//     } catch (err) {
//       setError('Failed to load projects');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       setError(null);
//       if (editingProject) {
//         const response = await projectsApi.update(editingProject.id, formData);
//         setProjects(projects.map(p => 
//           p.id === editingProject.id ? response.data : p
//         ));
//         setEditingProject(null);
//       } else {
//         const response = await projectsApi.create(formData);
//         setProjects([...projects, response.data]);
//       }
//       setFormData({ name: '', description: '' });
//     } catch (err) {
//       setError('Failed to save project');
//     }
//   };

//   const handleEdit = (project: Project) => {
//     setEditingProject(project);
//     setFormData({
//       name: project.name,
//       description: project.description || ''
//     });
//   };

//   const handleDelete = async (id: string) => {
//     if (!window.confirm('Are you sure you want to delete this project?')) return;

//     try {
//       await projectsApi.delete(id);
//       setProjects(projects.filter(p => p.id !== id));
//     } catch (err) {
//       setError('Failed to delete project');
//     }
//   };

//   const handleCancel = () => {
//     setEditingProject(null);
//     setFormData({ name: '', description: '' });
//   };

//   if (loading) return <div className="loading">Loading projects...</div>;

//   return (
//     <div className="project-management">
//       <div className="content-section">
//         <h2>{editingProject ? 'Modifier le projet' : 'Nouveau projet'}</h2>
//         <form onSubmit={handleSubmit} className="form-container">
//           <div className="form-group">
//             <label>Nom du projet :</label>
//             <input
//               type="text"
//               value={formData.name}
//               onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

//           {error && <div className="error-message">{error}</div>}

//           <div className="form-buttons">
//             <button type="submit" className="submit-button">
//               {editingProject ? 'Mettre à jour' : 'Créer'}
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
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {projects.map((project) => (
//                 <tr key={project.id}>
//                   <td>{project.name}</td>
//                   <td>{project.description}</td>
//                   <td className="action-buttons">
//                     <button
//                       onClick={() => handleEdit(project)}
//                       className="edit-button"
//                     >
//                       Modifier
//                     </button>
//                     <button
//                       onClick={() => handleDelete(project.id)}
//                       className="delete-button"
//                     >
//                       Supprimer
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           {projects.length === 0 && (
//             <div className="no-entries">
//               Aucun projet créé
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { Project } from "../types";
import { projectsApi } from "../services/api";
import "../styles/form.css";
import "../styles/table.css";

interface ProjectForm {
  name: string;
  description: string;
}

export default function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectForm>({
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsApi.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error(error);
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (editingProject) {
        const response = await projectsApi.update(editingProject.id, formData);
        setProjects((prevProjects) =>
          prevProjects.map((p) => (p.id === editingProject.id ? response.data : p))
        );
        setEditingProject(null);
      } else {
        const response = await projectsApi.create(formData);
        setProjects((prevProjects) => [...prevProjects, response.data]);
      }
      setFormData({ name: "", description: "" });
    } catch (error) {
      console.error(error);
      setError("Failed to save project");
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;

    try {
      await projectsApi.delete(id);
      setProjects((prevProjects) => prevProjects.filter((p) => p.id !== id));
    } catch (error) {
      console.error(error);
      setError("Failed to delete project");
    }
  };

  const handleCancel = () => {
    setEditingProject(null);
    setFormData({ name: "", description: "" });
  };

  if (loading) return <div className="loading">Loading projects...</div>;

  return (
    <div className="project-management">
      <div className="content-section">
        <h2>{editingProject ? "Modifier le projet" : "Nouveau projet"}</h2>
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label>Nom du projet :</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.description}</td>
                  <td className="action-buttons">
                    <button onClick={() => handleEdit(project)} className="edit-button">
                      Modifier
                    </button>
                    <button onClick={() => handleDelete(project.id)} className="delete-button">
                      Supprimer
                    </button>
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

