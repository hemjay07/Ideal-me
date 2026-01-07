import { useState, useEffect, useCallback } from 'react';
import { Project } from '@idealme/core';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const allProjects = await window.electronAPI.projects.getActive();
      setProjects(allProjects);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const updated = await window.electronAPI.projects.update(id, updates);
      if (updated) {
        setProjects(prev => prev.map(p => p.id === id ? updated : p));
      }
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      throw err;
    }
  };

  return {
    projects,
    loading,
    error,
    fetchProjects,
    updateProject
  };
}
