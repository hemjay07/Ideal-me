import { Task, Project, CreateTaskInput, ActivityEventType, EntityType, ActivityLog } from '@idealme/core';

export interface ElectronAPI {
  tasks: {
    getAll: (filters?: any) => Promise<Task[]>;
    getPending: () => Promise<Task[]>;
    getMonoWork: () => Promise<Task[]>;
    getTopPriority: (limit?: number) => Promise<Task[]>;
    create: (input: CreateTaskInput) => Promise<Task>;
    update: (id: string, updates: Partial<Task>) => Promise<Task | null>;
    complete: (id: string) => Promise<Task | null>;
    delete: (id: string) => Promise<boolean>;
    getStats: (days?: number) => Promise<{
      total: number;
      completed: number;
      pending: number;
      completion_rate: number;
    }>;
  };
  projects: {
    getAll: (filters?: any) => Promise<Project[]>;
    getActive: () => Promise<Project[]>;
    findById: (id: string) => Promise<Project | null>;
    update: (id: string, updates: Partial<Project>) => Promise<Project | null>;
  };
  activity: {
    log: (
      eventType: ActivityEventType,
      entityType?: EntityType,
      entityId?: string,
      duration?: number,
      metadata?: any
    ) => Promise<ActivityLog>;
    getRecent: (limit?: number) => Promise<ActivityLog[]>;
    getPatternStats: (days?: number) => Promise<any>;
    getNotificationPatterns: (days?: number) => Promise<any>;
  };
  app: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
