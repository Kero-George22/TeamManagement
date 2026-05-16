import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const selectedProjectIdRef = useRef(selectedProjectId);

  // Keep ref in sync
  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

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
      const currentSelected = selectedProjectIdRef.current;
      if (currentSelected && list && !list.find(p => p._id === currentSelected)) {
        setSelectedProjectId(null);
        localStorage.removeItem('tf_project_id');
        localStorage.removeItem('jxp_project_id');
      }
    } catch (e) {
      console.error('Failed to load global projects:', e);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

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

  const selectedProject = useMemo(
    () => projects.find(p => p._id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const value = useMemo(() => ({
    projects,
    selectedProjectId,
    selectedProject,
    selectProject,
    refreshProjects: loadProjects,
    loadingProjects: loading
  }), [projects, selectedProjectId, selectedProject, selectProject, loadProjects, loading]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
