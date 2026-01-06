-- IdealMe Database Schema
-- SQLite Database for local-first data storage

-- ============================================
-- CORE TABLES
-- ============================================

-- Tasks: All user tasks from various sources
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL, -- 'manual', 'twitter', 'github', 'ai_suggested', 'mono_work'
  priority INTEGER DEFAULT 0, -- AI-calculated priority score (0-100)
  deadline TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  project_id TEXT, -- FK to projects table
  metadata JSON -- flexible storage for source-specific data
);

CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source);

-- Projects: User's active projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed', 'abandoned'
  funding_amount INTEGER, -- in cents (USD)
  funding_status TEXT DEFAULT 'none', -- 'pending', 'secured', 'none'
  funding_source TEXT, -- 'Seedify', 'VC', etc.
  priority INTEGER DEFAULT 0, -- user or AI set
  category TEXT, -- 'prediction-markets', 'crypto', 'web3', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON
);

-- Resources: Bookmarks, articles, courses, notes
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'article', 'video', 'course', 'tweet', 'note', 'design'
  title TEXT,
  url TEXT,
  content TEXT, -- for notes or extracted content
  source TEXT, -- 'twitter', 'manual', 'youtube', 'share_sheet'
  category TEXT, -- 'design', 'polymarket', 'vibe-coding', etc.
  read_at TIMESTAMP,
  bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON -- tweet data, author, tags, etc.
);

CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_read ON resources(read_at);

-- Activity Log: Track all user interactions for pattern detection
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'task_completed', 'app_opened', 'resource_read', 'notification_opened', etc.
  entity_id TEXT, -- references task/project/resource
  entity_type TEXT, -- 'task', 'project', 'resource', 'app'
  duration_seconds INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON
);

CREATE INDEX IF NOT EXISTS idx_activity_event ON activity_log(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp DESC);

-- ============================================
-- SELF-IMPROVEMENT TABLES
-- ============================================

-- Insights: AI-generated patterns and suggestions
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'pattern', 'suggestion', 'feature_proposal'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence_score REAL DEFAULT 0.5, -- 0-1, how confident AI is
  status TEXT DEFAULT 'pending_review', -- 'pending_review', 'approved', 'implemented', 'rejected'
  impact_prediction TEXT, -- what AI expects to happen
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  metadata JSON
);

-- App Modifications: Track self-improvement changes
CREATE TABLE IF NOT EXISTS app_modifications (
  id TEXT PRIMARY KEY,
  insight_id TEXT, -- FK to insights
  feature_name TEXT NOT NULL,
  description TEXT NOT NULL,
  code_diff TEXT, -- git diff
  commit_hash TEXT,
  approved_at TIMESTAMP,
  deployed_at TIMESTAMP,
  impact_metrics JSON, -- tracks if it worked
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (insight_id) REFERENCES insights(id)
);

-- ============================================
-- GOAL TRACKING TABLES
-- ============================================

-- Goals: Financial and skill goals
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'financial', 'skill', 'project'
  target_amount INTEGER, -- for money goals (in cents)
  target_metric TEXT, -- for non-financial goals
  target_date TIMESTAMP,
  current_progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'achieved', 'abandoned'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON
);

-- ============================================
-- NOTIFICATION & REMINDER TABLES
-- ============================================

-- Notifications: Track sent notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  type TEXT NOT NULL, -- 'reminder', 'insight', 'priority', 'deadline', 'review'
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP,
  acted_on BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP,
  metadata JSON
);

CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_opened ON notifications(opened_at);

-- ============================================
-- DOMAIN-SPECIFIC TABLES
-- ============================================

-- Design Assets: For Design Lab
CREATE TABLE IF NOT EXISTS design_assets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'screenshot', 'website', 'tweet', 'upload'
  image_url TEXT,
  source_url TEXT,
  tags TEXT, -- JSON array: ['dark-mode', 'animation', 'landing-page']
  notes TEXT, -- "What do you like about this?"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  week_number INTEGER, -- for weekly review
  metadata JSON
);

CREATE INDEX IF NOT EXISTS idx_design_week ON design_assets(week_number);

-- Course Progress: Track learning
CREATE TABLE IF NOT EXISTS course_progress (
  id TEXT PRIMARY KEY,
  course_name TEXT NOT NULL, -- 'Devouring Details', 'Emil Kowalski', 'Vibe Coding'
  course_category TEXT, -- 'design', 'vibe-coding', 'prediction-markets'
  lesson_id TEXT,
  lesson_title TEXT,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  time_spent_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON
);

CREATE INDEX IF NOT EXISTS idx_course_name ON course_progress(course_name);
CREATE INDEX IF NOT EXISTS idx_course_completed ON course_progress(completed);

-- Polymarket Research: For Polymarket Hub
CREATE TABLE IF NOT EXISTS polymarket_research (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'article', 'strategy', 'bot', 'market', 'simulation'
  title TEXT NOT NULL,
  url TEXT,
  content TEXT,
  status TEXT DEFAULT 'to_read', -- 'to_read', 'reading', 'completed'
  insights TEXT, -- what was learned
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSON
);

-- Bots: Track bot development and simulation
CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'idea', -- 'idea', 'building', 'simulation', 'live', 'retired'
  code_url TEXT, -- GitHub link
  performance_data JSON,
  simulation_results JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deployed_at TIMESTAMP,
  metadata JSON
);

-- ============================================
-- SETTINGS & CONFIG TABLES
-- ============================================

-- App Settings: User preferences and config
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('user_timezone', 'Africa/Lagos'),
  ('peak_hours_start', '20:00'),
  ('peak_hours_end', '00:00'),
  ('weekly_review_day', 'sunday'),
  ('weekly_review_time', '20:00'),
  ('notification_enabled', 'true'),
  ('ai_budget_monthly', '10'),
  ('theme', 'dark');

-- ============================================
-- WEEKLY REVIEWS
-- ============================================

-- Weekly Reviews: Store weekly review data
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id TEXT PRIMARY KEY,
  week_start_date TEXT NOT NULL, -- ISO date of Monday
  tasks_completed INTEGER DEFAULT 0,
  goals_progress JSON,
  design_assets_saved INTEGER DEFAULT 0,
  polymarket_hours REAL DEFAULT 0,
  insights_generated TEXT,
  ai_suggestions TEXT,
  user_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_date ON weekly_reviews(week_start_date DESC);
