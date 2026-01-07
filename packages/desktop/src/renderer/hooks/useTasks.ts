import { useState, useEffect, useCallback } from 'react';
import { Task, CreateTaskInput } from '@idealme/core';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const allTasks = await window.electronAPI.tasks.getPending();
      setTasks(allTasks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (input: CreateTaskInput) => {
    try {
      const newTask = await window.electronAPI.tasks.create(input);
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      throw err;
    }
  };

  const completeTask = async (id: string) => {
    try {
      const updated = await window.electronAPI.tasks.complete(id);
      if (updated) {
        setTasks(prev => prev.filter(t => t.id !== id));
      }
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const success = await window.electronAPI.tasks.delete(id);
      if (success) {
        setTasks(prev => prev.filter(t => t.id !== id));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      throw err;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updated = await window.electronAPI.tasks.update(id, updates);
      if (updated) {
        setTasks(prev => prev.map(t => t.id === id ? updated : t));
      }
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    completeTask,
    deleteTask,
    updateTask
  };
}

export function useMonoWork() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonoWork = useCallback(async () => {
    setLoading(true);
    try {
      const monoTasks = await window.electronAPI.tasks.getMonoWork();
      setTasks(monoTasks);
    } catch (err) {
      console.error('Failed to fetch Mono work:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonoWork();
  }, [fetchMonoWork]);

  return { tasks, loading, refresh: fetchMonoWork };
}

export function useTopPriority(limit: number = 1) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTopPriority = useCallback(async () => {
    setLoading(true);
    try {
      const topTasks = await window.electronAPI.tasks.getTopPriority(limit);
      setTasks(topTasks);
    } catch (err) {
      console.error('Failed to fetch top priority:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTopPriority();
  }, [fetchTopPriority]);

  return { tasks, loading, refresh: fetchTopPriority };
}
