import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../lib/api';
import { useAuth } from './AuthContext';

const ProjectContext = createContext(null);

export function useGlobalProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useGlobalProject must be used within ProjectProvider');
  return ctx;
}

export function ProjectProvider({ children }) {
  const { isLoggedIn, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    () => localStorage.getItem('tf_project_id') || localStorage.getItem('jxp_project_id') || null
  );
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    if (!isLoggedIn) {
      setProjects([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const list = await API.projects.list();
      setProjects(list || []);
      
      // If the selected project is no longer in the list, clear it
      if (selectedProjectId && list && !list.find(p => p._id === selectedProjectId)) {
        setSelectedProjectId(null);
        localStorage.removeItem('tf_project_id');
        localStorage.removeItem('jxp_project_id');
      }
    } catch (e) {
      console.error('Failed to load global projects:', e);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, selectedProjectId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const selectProject = useCallback((id) => {
    if (id) {
      localStorage.setItem('tf_project_id', id);
      localStorage.removeItem('jxp_project_id');
    } else {
      localStorage.removeItem('tf_project_id');
      localStorage.removeItem('jxp_project_id');
    }
    setSelectedProjectId(id);
  }, []);

  const selectedProject = projects.find(p => p._id === selectedProjectId) || null;

  return (
    <ProjectContext.Provider value={{
      projects,
      selectedProjectId,
      selectedProject,
      selectProject,
      refreshProjects: loadProjects,
      loadingProjects: loading
    }}>
      {children}
    </ProjectContext.Provider>
  );
}
