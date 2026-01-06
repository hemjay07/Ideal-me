// Core TypeScript types for IdealMe
// Matches database schema

// ============================================
// TASKS
// ============================================

export type TaskSource =
  | 'manual'
  | 'twitter'
  | 'github'
  | 'ai_suggested'
  | 'mono_work';

export interface Task {
  id: string;
  content: string;
  source: TaskSource;
  priority: number; // 0-100
  deadline?: string; // ISO timestamp
  completed_at?: string;
  created_at: string;
  updated_at: string;
  project_id?: string;
  metadata?: Record<string, any>;
}

export interface CreateTaskInput {
  content: string;
  source: TaskSource;
  priority?: number;
  deadline?: string;
  project_id?: string;
  metadata?: Record<string, any>;
}

// ============================================
// PROJECTS
// ============================================

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'abandoned';
export type FundingStatus = 'pending' | 'secured' | 'none';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  funding_amount?: number; // in cents
  funding_status: FundingStatus;
  funding_source?: string;
  priority: number;
  category?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

// ============================================
// RESOURCES
// ============================================

export type ResourceType =
  | 'article'
  | 'video'
  | 'course'
  | 'tweet'
  | 'note'
  | 'design';

export type ResourceCategory =
  | 'design'
  | 'polymarket'
  | 'vibe-coding'
  | 'general';

export interface Resource {
  id: string;
  type: ResourceType;
  title?: string;
  url?: string;
  content?: string;
  source?: string;
  category?: ResourceCategory;
  read_at?: string;
  bookmarked_at: string;
  created_at: string;
  metadata?: Record<string, any>;
}

// ============================================
// ACTIVITY LOG
// ============================================

export type ActivityEventType =
  | 'task_completed'
  | 'task_created'
  | 'app_opened'
  | 'resource_read'
  | 'resource_saved'
  | 'notification_opened'
  | 'notification_dismissed'
  | 'project_updated'
  | 'course_progress'
  | 'design_saved'
  | 'dashboard_viewed';

export type EntityType = 'task' | 'project' | 'resource' | 'app' | 'notification';

export interface ActivityLog {
  id: string;
  event_type: ActivityEventType;
  entity_id?: string;
  entity_type?: EntityType;
  duration_seconds?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ============================================
// INSIGHTS & SELF-IMPROVEMENT
// ============================================

export type InsightType = 'pattern' | 'suggestion' | 'feature_proposal';
export type InsightStatus = 'pending_review' | 'approved' | 'implemented' | 'rejected';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  content: string;
  confidence_score: number; // 0-1
  status: InsightStatus;
  impact_prediction?: string;
  created_at: string;
  reviewed_at?: string;
  metadata?: Record<string, any>;
}

export interface AppModification {
  id: string;
  insight_id?: string;
  feature_name: string;
  description: string;
  code_diff?: string;
  commit_hash?: string;
  approved_at?: string;
  deployed_at?: string;
  impact_metrics?: Record<string, any>;
  created_at: string;
}

// ============================================
// GOALS
// ============================================

export type GoalType = 'financial' | 'skill' | 'project';
export type GoalStatus = 'active' | 'achieved' | 'abandoned';

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  target_amount?: number; // for financial goals
  target_metric?: string; // for non-financial
  target_date?: string;
  current_progress: number;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

// ============================================
// NOTIFICATIONS
// ============================================

export type NotificationType =
  | 'reminder'
  | 'insight'
  | 'priority'
  | 'deadline'
  | 'review';

export interface Notification {
  id: string;
  content: string;
  type: NotificationType;
  sent_at: string;
  opened_at?: string;
  acted_on: boolean;
  dismissed_at?: string;
  metadata?: Record<string, any>;
}

// ============================================
// DOMAIN-SPECIFIC TYPES
// ============================================

// Design Assets
export interface DesignAsset {
  id: string;
  type: 'screenshot' | 'website' | 'tweet' | 'upload';
  image_url?: string;
  source_url?: string;
  tags?: string[]; // parsed from JSON
  notes?: string;
  created_at: string;
  week_number?: number;
  metadata?: Record<string, any>;
}

// Course Progress
export interface CourseProgress {
  id: string;
  course_name: string;
  course_category?: string;
  lesson_id?: string;
  lesson_title?: string;
  completed: boolean;
  notes?: string;
  time_spent_seconds: number;
  completed_at?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

// Polymarket Research
export interface PolymarketResearch {
  id: string;
  type: 'article' | 'strategy' | 'bot' | 'market' | 'simulation';
  title: string;
  url?: string;
  content?: string;
  status: 'to_read' | 'reading' | 'completed';
  insights?: string;
  created_at: string;
  completed_at?: string;
  metadata?: Record<string, any>;
}

// Bots
export type BotStatus = 'idea' | 'building' | 'simulation' | 'live' | 'retired';

export interface Bot {
  id: string;
  name: string;
  description?: string;
  status: BotStatus;
  code_url?: string;
  performance_data?: Record<string, any>;
  simulation_results?: Record<string, any>;
  notes?: string;
  created_at: string;
  deployed_at?: string;
  metadata?: Record<string, any>;
}

// Weekly Reviews
export interface WeeklyReview {
  id: string;
  week_start_date: string; // ISO date
  tasks_completed: number;
  goals_progress?: Record<string, any>;
  design_assets_saved: number;
  polymarket_hours: number;
  insights_generated?: string;
  ai_suggestions?: string;
  user_notes?: string;
  created_at: string;
}

// ============================================
// DASHBOARD & PRIORITY TYPES
// ============================================

export interface DashboardPriority {
  main_focus: Task | null;
  secondary_tasks: Task[];
  reason: string;
  confidence: number; // 0-1
  generated_at: string;
}

export interface MonoWorkSummary {
  tasks: Task[];
  standup_time: string;
  ready: boolean;
}

// ============================================
// SETTINGS
// ============================================

export interface AppSettings {
  user_timezone: string;
  peak_hours_start: string;
  peak_hours_end: string;
  weekly_review_day: string;
  weekly_review_time: string;
  notification_enabled: boolean;
  ai_budget_monthly: number;
  theme: 'light' | 'dark';
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
