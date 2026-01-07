import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Tasks
  tasks: {
    getAll: (filters?: any) => ipcRenderer.invoke('tasks:getAll', filters),
    getPending: () => ipcRenderer.invoke('tasks:getPending'),
    getMonoWork: () => ipcRenderer.invoke('tasks:getMonoWork'),
    getTopPriority: (limit?: number) => ipcRenderer.invoke('tasks:getTopPriority', limit),
    create: (input: any) => ipcRenderer.invoke('tasks:create', input),
    update: (id: string, updates: any) => ipcRenderer.invoke('tasks:update', id, updates),
    complete: (id: string) => ipcRenderer.invoke('tasks:complete', id),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
    getStats: (days?: number) => ipcRenderer.invoke('tasks:getStats', days),
  },

  // Projects
  projects: {
    getAll: (filters?: any) => ipcRenderer.invoke('projects:getAll', filters),
    getActive: () => ipcRenderer.invoke('projects:getActive'),
    findById: (id: string) => ipcRenderer.invoke('projects:findById', id),
    update: (id: string, updates: any) => ipcRenderer.invoke('projects:update', id, updates),
  },

  // Activity
  activity: {
    log: (eventType: string, entityType?: string, entityId?: string, duration?: number, metadata?: any) =>
      ipcRenderer.invoke('activity:log', eventType, entityType, entityId, duration, metadata),
    getRecent: (limit?: number) => ipcRenderer.invoke('activity:getRecent', limit),
    getPatternStats: (days?: number) => ipcRenderer.invoke('activity:getPatternStats', days),
    getNotificationPatterns: (days?: number) => ipcRenderer.invoke('activity:getNotificationPatterns', days),
  },

  // App Control
  app: {
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close: () => ipcRenderer.invoke('app:close'),
  },

  // Insights
  insights: {
    getPending: () => ipcRenderer.invoke('insights:getPending'),
    getByStatus: (status: string) => ipcRenderer.invoke('insights:getByStatus', status),
    approve: (id: string) => ipcRenderer.invoke('insights:approve', id),
    reject: (id: string) => ipcRenderer.invoke('insights:reject', id),
    runAnalysis: () => ipcRenderer.invoke('insights:runAnalysis'),
    getReadinessStats: () => ipcRenderer.invoke('insights:getReadinessStats'),
  },
});
