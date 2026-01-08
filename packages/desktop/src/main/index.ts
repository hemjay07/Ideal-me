import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { getDatabase, TaskRepository, ProjectRepository, ActivityLogRepository, InsightRepository, ResourceRepository } from '@idealme/core';

let mainWindow: BrowserWindow | null = null;
let dbClient: ReturnType<typeof getDatabase> | null = null;
let taskRepo: TaskRepository | null = null;
let projectRepo: ProjectRepository | null = null;
let activityRepo: ActivityLogRepository | null = null;
let insightRepo: InsightRepository | null = null;
let resourceRepo: ResourceRepository | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    frame: false,
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Log app opened
  if (activityRepo) {
    activityRepo.log('app_opened', 'app');
  }
}

function initializeDatabase() {
  // Get database instance (will create if doesn't exist)
  const dbPath = path.join(app.getPath('userData'), 'idealme.db');
  dbClient = getDatabase(dbPath);

  // Run migration (idempotent - safe to run multiple times)
  dbClient.migrate();

  // Seed initial data if database is new
  try {
    dbClient.seed();
  } catch (error) {
    // Seed might fail if data already exists (that's okay)
    console.log('Database already seeded');
  }

  // Initialize repositories
  taskRepo = new TaskRepository(dbClient);
  projectRepo = new ProjectRepository(dbClient);
  activityRepo = new ActivityLogRepository(dbClient);
  insightRepo = new InsightRepository(dbClient);
  resourceRepo = new ResourceRepository(dbClient);

  console.log('Database initialized successfully');
}

app.whenReady().then(() => {
  initializeDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Log app closed
  if (activityRepo) {
    activityRepo.log('app_closed', 'app');
  }
});

// ============================================
// IPC HANDLERS - Communication with React
// ============================================

// Tasks
ipcMain.handle('tasks:getAll', async (_, filters) => {
  return taskRepo?.findAll(filters) || [];
});

ipcMain.handle('tasks:getPending', async () => {
  return taskRepo?.getPending() || [];
});

ipcMain.handle('tasks:getMonoWork', async () => {
  return taskRepo?.getMonoWork() || [];
});

ipcMain.handle('tasks:getTopPriority', async (_, limit) => {
  return taskRepo?.getTopPriority(limit) || [];
});

ipcMain.handle('tasks:create', async (_, input) => {
  const task = taskRepo?.create(input);
  if (task && activityRepo) {
    activityRepo.log('task_created', 'task', task.id);
  }
  return task;
});

ipcMain.handle('tasks:update', async (_, id, updates) => {
  return taskRepo?.update(id, updates);
});

ipcMain.handle('tasks:complete', async (_, id) => {
  const task = taskRepo?.complete(id);
  if (task && activityRepo) {
    activityRepo.log('task_completed', 'task', id);
  }
  return task;
});

ipcMain.handle('tasks:delete', async (_, id) => {
  return taskRepo?.delete(id);
});

ipcMain.handle('tasks:getStats', async (_, days) => {
  return taskRepo?.getStats(days);
});

// Projects
ipcMain.handle('projects:getAll', async (_, filters) => {
  return projectRepo?.findAll(filters) || [];
});

ipcMain.handle('projects:getActive', async () => {
  return projectRepo?.getActive() || [];
});

ipcMain.handle('projects:findById', async (_, id) => {
  return projectRepo?.findById(id);
});

ipcMain.handle('projects:update', async (_, id, updates) => {
  const project = projectRepo?.update(id, updates);
  if (project && activityRepo) {
    activityRepo.log('project_updated', 'project', id);
  }
  return project;
});

// Activity Log
ipcMain.handle('activity:log', async (_, eventType, entityType, entityId, duration, metadata) => {
  return activityRepo?.log(eventType, entityType, entityId, duration, metadata);
});

ipcMain.handle('activity:getRecent', async (_, limit) => {
  return activityRepo?.getRecent(limit);
});

ipcMain.handle('activity:getPatternStats', async (_, days) => {
  return activityRepo?.getPatternStats(days);
});

ipcMain.handle('activity:getNotificationPatterns', async (_, days) => {
  return activityRepo?.getNotificationPatterns(days);
});

// App Control
ipcMain.handle('app:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('app:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('app:close', () => {
  mainWindow?.close();
});

// Insights
ipcMain.handle('insights:getPending', async () => {
  return insightRepo?.getPending() || [];
});

ipcMain.handle('insights:getByStatus', async (_, status) => {
  return insightRepo?.findByStatus(status) || [];
});

ipcMain.handle('insights:approve', async (_, id) => {
  return insightRepo?.updateStatus(id, 'approved');
});

ipcMain.handle('insights:reject', async (_, id) => {
  return insightRepo?.updateStatus(id, 'rejected');
});

ipcMain.handle('insights:runAnalysis', async () => {
  return insightRepo?.runAnalysis() || [];
});

ipcMain.handle('insights:getReadinessStats', async () => {
  return insightRepo?.getReadinessStats();
});

// Resources
ipcMain.handle('resources:create', async (_, input) => {
  const resource = resourceRepo?.create(input);
  if (resource && activityRepo) {
    activityRepo.log('resource_saved', 'resource', resource.id);
  }
  return resource;
});

ipcMain.handle('resources:getAll', async (_, filters) => {
  return resourceRepo?.findAll(filters) || [];
});

ipcMain.handle('resources:getRecent', async (_, limit) => {
  return resourceRepo?.getRecent(limit || 20) || [];
});

ipcMain.handle('resources:search', async (_, query) => {
  return resourceRepo?.search(query) || [];
});

ipcMain.handle('resources:findById', async (_, id) => {
  return resourceRepo?.findById(id);
});

ipcMain.handle('resources:update', async (_, id, updates) => {
  return resourceRepo?.update(id, updates);
});

ipcMain.handle('resources:delete', async (_, id) => {
  return resourceRepo?.delete(id);
});

ipcMain.handle('resources:getCountsByCategory', async () => {
  return resourceRepo?.getCountsByCategory() || {};
});
