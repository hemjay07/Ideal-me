-- Migration 001: Initial Schema
-- Creates all core tables for IdealMe

-- This migration is idempotent - safe to run multiple times
-- All CREATE TABLE statements use IF NOT EXISTS

.read ../schema.sql

-- Seed initial data
INSERT OR IGNORE INTO projects (id, name, description, status, funding_status, funding_amount, funding_source, priority, category) VALUES
  ('truthbounty', 'TruthBounty', 'Cross-platform reputation system for prediction markets', 'active', 'pending', 25000000, 'Seedify Hackathon (Top 20)', 100, 'prediction-markets'),
  ('fantasy-ct', 'Fantasy CT', 'Fantasy league for Crypto Twitter', 'active', 'none', NULL, NULL, 80, 'crypto');

INSERT OR IGNORE INTO goals (id, title, type, target_amount, target_date, status) VALUES
  ('personal-1m', 'Achieve $1M personal wealth', 'financial', 100000000, '2026-04-30', 'active'),
  ('lab-5m', 'Lab/Studio raises or makes $5M total', 'financial', 500000000, '2026-04-30', 'active'),
  ('design-mastery', 'Master design to differentiate from other vibe coders', 'skill', NULL, '2026-04-30', 'active'),
  ('prediction-market-expertise', 'Deep expertise in prediction markets + making money monthly', 'skill', NULL, '2026-04-30', 'active'),
  ('vibe-coding-expert', 'Become expert AI/vibe coder, known in space', 'skill', NULL, '2026-04-30', 'active');

INSERT OR IGNORE INTO tasks (id, content, source, priority, deadline, project_id) VALUES
  ('truthbounty-rally', 'TruthBounty rally for Seedify votes', 'manual', 100, '2026-01-08 13:00:00', 'truthbounty'),
  ('message-liam', 'Message Liam about student rally for TruthBounty', 'manual', 95, '2026-01-07 14:00:00', 'truthbounty'),
  ('resume-mono', 'Resume Mono work - prep for standup', 'mono_work', 90, '2026-01-07 11:00:00', NULL);

INSERT OR IGNORE INTO course_progress (id, course_name, course_category, completed) VALUES
  ('devouring-details', 'Devouring Details', 'design', FALSE),
  ('emil-kowalski', 'Emil Kowalski - Web Animation', 'design', FALSE),
  ('vibe-coding-course', 'Vibe Coding Course', 'vibe-coding', FALSE);

-- Log initial migration
INSERT INTO activity_log (id, event_type, entity_type, metadata) VALUES
  ('migration-001', 'database_initialized', 'app', '{"migration": "001_initial", "timestamp": "' || datetime('now') || '"}');
