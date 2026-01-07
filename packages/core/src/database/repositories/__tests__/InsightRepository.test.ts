import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../client';
import { InsightRepository } from '../InsightRepository';
import { TaskRepository } from '../TaskRepository';
import { ActivityLogRepository } from '../ActivityLogRepository';
import fs from 'fs';
import path from 'path';

describe('InsightRepository', () => {
  let dbClient: DatabaseClient;
  let insightRepo: InsightRepository;
  let taskRepo: TaskRepository;
  let activityRepo: ActivityLogRepository;
  const testDbPath = path.join(__dirname, 'test-insights.db');

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create fresh database
    dbClient = new DatabaseClient(testDbPath);
    dbClient.migrate();

    insightRepo = new InsightRepository(dbClient);
    taskRepo = new TaskRepository(dbClient);
    activityRepo = new ActivityLogRepository(dbClient);
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('create', () => {
    it('should create a new insight with all fields', () => {
      const insight = insightRepo.create({
        type: 'pattern',
        title: 'Test Pattern',
        content: 'This is a test pattern',
        confidence_score: 0.85,
        impact_prediction: 'Should improve productivity by 20%',
      });

      expect(insight).toBeDefined();
      expect(insight.id).toBeDefined();
      expect(insight.type).toBe('pattern');
      expect(insight.title).toBe('Test Pattern');
      expect(insight.content).toBe('This is a test pattern');
      expect(insight.confidence_score).toBe(0.85);
      expect(insight.status).toBe('pending_review');
      expect(insight.impact_prediction).toBe('Should improve productivity by 20%');
    });

    it('should create insight without optional fields', () => {
      const insight = insightRepo.create({
        type: 'suggestion',
        title: 'Simple Suggestion',
        content: 'Do this thing',
        confidence_score: 0.5,
      });

      expect(insight).toBeDefined();
      expect(insight.impact_prediction).toBeNull();
    });
  });

  describe('getPending', () => {
    it('should return empty array when no insights exist', () => {
      const pending = insightRepo.getPending();
      expect(pending).toEqual([]);
    });

    it('should return only pending insights', () => {
      insightRepo.create({
        type: 'pattern',
        title: 'Pending 1',
        content: 'Content 1',
        confidence_score: 0.8,
      });

      const approved = insightRepo.create({
        type: 'pattern',
        title: 'Approved',
        content: 'Content 2',
        confidence_score: 0.7,
      });
      insightRepo.updateStatus(approved.id, 'approved');

      insightRepo.create({
        type: 'pattern',
        title: 'Pending 2',
        content: 'Content 3',
        confidence_score: 0.9,
      });

      const pending = insightRepo.getPending();
      expect(pending).toHaveLength(2);
      expect(pending[0].title).toBe('Pending 2'); // Higher confidence first
      expect(pending[1].title).toBe('Pending 1');
    });
  });

  describe('updateStatus', () => {
    it('should update insight status', () => {
      const insight = insightRepo.create({
        type: 'pattern',
        title: 'Test',
        content: 'Test content',
        confidence_score: 0.8,
      });

      const updated = insightRepo.updateStatus(insight.id, 'approved');
      expect(updated?.status).toBe('approved');
      expect(updated?.reviewed_at).toBeDefined();
    });
  });

  describe('detectNotificationPatterns', () => {
    it('should return null when insufficient data', () => {
      // No notification events logged
      const insight = insightRepo.detectNotificationPatterns();
      expect(insight).toBeNull();
    });

    it('should detect peak notification hour with sufficient data', () => {
      // Log 10 notification opens at 8pm (20:00)
      for (let i = 0; i < 10; i++) {
        activityRepo.log('notification_opened', 'notification', `notif-${i}`);
      }

      const insight = insightRepo.detectNotificationPatterns();
      expect(insight).toBeDefined();
      expect(insight?.type).toBe('pattern');
      expect(insight?.title).toContain('notification response time');
      expect(insight?.confidence_score).toBeGreaterThan(0);
    });
  });

  describe('detectTaskCompletionPatterns', () => {
    it('should return empty array with no tasks', () => {
      const insights = insightRepo.detectTaskCompletionPatterns();
      expect(insights).toEqual([]);
    });

    it('should detect low high-priority completion rate', () => {
      // Create 15 high-priority tasks, complete only 3
      for (let i = 0; i < 15; i++) {
        const task = taskRepo.create({
          content: `High priority task ${i}`,
          source: 'manual',
          priority: 85,
        });

        if (i < 3) {
          taskRepo.complete(task.id);
        }
      }

      const insights = insightRepo.detectTaskCompletionPatterns();
      const lowCompletionInsight = insights.find(i =>
        i.title.includes('low completion rate')
      );

      expect(lowCompletionInsight).toBeDefined();
      expect(lowCompletionInsight?.type).toBe('pattern');
      expect(lowCompletionInsight?.confidence_score).toBeGreaterThan(0.5);
    });

    it('should detect high-performing task sources', () => {
      // Create tasks from 'twitter' source with high completion rate
      for (let i = 0; i < 8; i++) {
        const task = taskRepo.create({
          content: `Twitter task ${i}`,
          source: 'twitter',
          priority: 50,
        });
        taskRepo.complete(task.id);
      }

      const insights = insightRepo.detectTaskCompletionPatterns();
      const sourceInsight = insights.find(i =>
        i.title.includes('twitter')
      );

      expect(sourceInsight).toBeDefined();
      expect(sourceInsight?.type).toBe('pattern');
    });
  });

  describe('suggestFeatures', () => {
    it('should suggest task templates when many manual tasks', () => {
      // Create 25 manual tasks in the last week
      for (let i = 0; i < 25; i++) {
        taskRepo.create({
          content: `Manual task ${i}`,
          source: 'manual',
          priority: 50,
        });
      }

      const insights = insightRepo.suggestFeatures();
      const templateSuggestion = insights.find(i =>
        i.title.includes('template')
      );

      expect(templateSuggestion).toBeDefined();
      expect(templateSuggestion?.type).toBe('feature_proposal');
      expect(templateSuggestion?.confidence_score).toBeGreaterThan(0.5);
    });
  });

  describe('runAnalysis', () => {
    it('should run all analyses and return combined insights', () => {
      // Create data for different patterns
      // 1. Manual tasks for template suggestion
      for (let i = 0; i < 25; i++) {
        taskRepo.create({
          content: `Manual task ${i}`,
          source: 'manual',
          priority: 50,
        });
      }

      // 2. High-priority tasks with low completion
      for (let i = 0; i < 12; i++) {
        taskRepo.create({
          content: `High priority ${i}`,
          source: 'manual',
          priority: 85,
        });
      }

      const insights = insightRepo.runAnalysis();
      expect(insights.length).toBeGreaterThan(0);

      // Should have at least one feature proposal and one pattern
      const hasFeatureProposal = insights.some(i => i.type === 'feature_proposal');
      const hasPattern = insights.some(i => i.type === 'pattern');

      expect(hasFeatureProposal).toBe(true);
      expect(hasPattern).toBe(true);
    });
  });
});
