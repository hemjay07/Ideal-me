import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../client';
import { InsightRepository } from '../InsightRepository';
import { TaskRepository } from '../TaskRepository';
import { ProjectRepository } from '../ProjectRepository';
import { GoalRepository } from '../GoalRepository';
import fs from 'fs';
import path from 'path';

describe('InsightRepository - Advanced Analysis (THE MOAT)', () => {
  let dbClient: DatabaseClient;
  let insightRepo: InsightRepository;
  let taskRepo: TaskRepository;
  let projectRepo: ProjectRepository;
  let goalRepo: GoalRepository;
  const testDbPath = path.join(__dirname, 'test-advanced-insights.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    dbClient = new DatabaseClient(testDbPath);
    dbClient.migrate();

    insightRepo = new InsightRepository(dbClient);
    taskRepo = new TaskRepository(dbClient);
    projectRepo = new ProjectRepository(dbClient);
    goalRepo = new GoalRepository(dbClient);
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Goal Alignment Detection', () => {
    it('should detect when tasks dont map to any project', () => {
      // Create 2 projects
      const truthBounty = projectRepo.create({
        name: 'TruthBounty',
        status: 'active',
        funding_status: 'pending',
        funding_amount: 25000000, // $250K
        priority: 95,
      });

      const fantasyct = projectRepo.create({
        name: 'Fantasy CT',
        status: 'active',
        funding_status: 'none',
        priority: 70,
      });

      // Create 20 tasks total
      // 6 for TruthBounty
      for (let i = 0; i < 6; i++) {
        taskRepo.create({
          content: `TruthBounty task ${i}`,
          source: 'manual',
          priority: 80,
          project_id: truthBounty.id,
        });
      }

      // 14 tasks with NO project (70% unaligned)
      for (let i = 0; i < 14; i++) {
        taskRepo.create({
          content: `Random task ${i}`,
          source: 'manual',
          priority: 50,
        });
      }

      const insights = insightRepo.detectGoalMisalignment();

      expect(insights.length).toBeGreaterThan(0);

      const misalignmentInsight = insights.find(i =>
        i.content.includes('70%') && i.content.includes("don't map to")
      );

      expect(misalignmentInsight).toBeDefined();
      expect(misalignmentInsight?.type).toBe('pattern');
      expect(misalignmentInsight?.confidence_score).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect when high-value projects are being neglected', () => {
      const truthBounty = projectRepo.create({
        name: 'TruthBounty',
        status: 'active',
        funding_status: 'pending',
        funding_amount: 25000000, // $250K - highest value
        priority: 95,
      });

      const lowValueProject = projectRepo.create({
        name: 'Side Project',
        status: 'active',
        funding_status: 'none',
        priority: 30,
      });

      // User is working on low-value project (20 tasks)
      for (let i = 0; i < 20; i++) {
        taskRepo.create({
          content: `Side project task ${i}`,
          source: 'manual',
          priority: 40,
          project_id: lowValueProject.id,
        });
      }

      // Only 2 tasks for TruthBounty (high-value, urgent)
      for (let i = 0; i < 2; i++) {
        taskRepo.create({
          content: `TruthBounty task ${i}`,
          source: 'manual',
          priority: 80,
          project_id: truthBounty.id,
        });
      }

      const insights = insightRepo.detectGoalMisalignment();

      const neglectInsight = insights.find(i =>
        i.content.includes('TruthBounty') &&
        i.content.includes('$250') &&
        i.title.toLowerCase().includes('neglect')
      );

      expect(neglectInsight).toBeDefined();
      expect(neglectInsight?.type).toBe('suggestion');
      expect(neglectInsight?.impact_prediction).toContain('funding');
    });
  });

  describe('Deadline Pressure Detection', () => {
    it('should detect urgent deadlines and suggest focus', () => {
      // Create deadline 36 hours from now (within 2 days)
      const urgentDeadline = new Date();
      urgentDeadline.setHours(urgentDeadline.getHours() + 36);

      const truthBounty = projectRepo.create({
        name: 'TruthBounty',
        status: 'active',
        funding_status: 'pending',
        funding_amount: 25000000,
        priority: 95,
        metadata: { voting_date: urgentDeadline.toISOString().split('T')[0] },
      });

      // Create 5 incomplete TruthBounty tasks
      for (let i = 0; i < 5; i++) {
        taskRepo.create({
          content: `TruthBounty rally prep ${i}`,
          source: 'manual',
          priority: 90,
          project_id: truthBounty.id,
          deadline: urgentDeadline.toISOString(),
        });
      }

      const insights = insightRepo.detectDeadlinePressure();

      expect(insights.length).toBeGreaterThan(0);

      const urgentInsight = insights.find(i =>
        i.title.includes('Urgent:') && i.content.includes('incomplete tasks')
      );

      expect(urgentInsight).toBeDefined();
      expect(urgentInsight?.type).toBe('suggestion');
      expect(urgentInsight?.confidence_score).toBeGreaterThan(0.85);
    });
  });

  describe('Financial Trajectory Prediction', () => {
    it('should predict when user will hit $1M goal based on current progress', () => {
      // Create $1M financial goal with target April 2026
      goalRepo.create({
        title: 'Reach $1M personal wealth',
        type: 'financial',
        target_amount: 100000000, // $1M in cents
        target_date: '2026-04-30',
        current_progress: 0, // $0 current
        status: 'active',
      });

      // Create projects with funding that totals $250K pending
      projectRepo.create({
        name: 'TruthBounty',
        status: 'active',
        funding_status: 'pending',
        funding_amount: 25000000, // $250K
        priority: 95,
      });

      const insights = insightRepo.predictFinancialTrajectory();

      expect(insights.length).toBeGreaterThan(0);

      const trajectoryInsight = insights.find(i =>
        i.type === 'pattern' && i.title.toLowerCase().includes('trajectory')
      );

      expect(trajectoryInsight).toBeDefined();
      // Should warn that $250K pending is not enough for $1M by April
      expect(trajectoryInsight?.content.toLowerCase()).toContain('toward');
    });
  });

  describe('Context Switching Detection', () => {
    it('should detect excessive project switching that kills momentum', () => {
      // Create 5 projects
      const projects = [];
      for (let i = 0; i < 5; i++) {
        projects.push(
          projectRepo.create({
            name: `Project ${i}`,
            status: 'active',
            funding_status: 'none',
            priority: 50,
          })
        );
      }

      // Create tasks spread across all 5 projects (high context switching)
      // Pattern: 2 tasks per project per day for 7 days
      for (let day = 0; day < 7; day++) {
        for (const project of projects) {
          for (let t = 0; t < 2; t++) {
            taskRepo.create({
              content: `Task for ${project.name} day ${day}`,
              source: 'manual',
              priority: 50,
              project_id: project.id,
            });
          }
        }
      }

      const insights = insightRepo.detectContextSwitching();

      expect(insights.length).toBeGreaterThan(0);

      const switchingInsight = insights.find(i =>
        i.content.includes('switch') && i.content.includes('5')
      );

      expect(switchingInsight).toBeDefined();
      expect(switchingInsight?.type).toBe('pattern');
      expect(switchingInsight?.impact_prediction).toContain('momentum');
    });
  });

  describe('Causal Inference - Task Failure Patterns', () => {
    it('should detect when tasks fail due to missing dependencies', () => {
      const project = projectRepo.create({
        name: 'Test Project',
        status: 'active',
        funding_status: 'none',
        priority: 70,
      });

      // Create 10 high-priority tasks that are blocked (have deps)
      for (let i = 0; i < 10; i++) {
        taskRepo.create({
          content: `Blocked task ${i}`,
          source: 'manual',
          priority: 85,
          project_id: project.id,
          metadata: { blocked: true, dependencies: ['other-task'] },
        });
        // Don't complete these
      }

      // Create 10 independent tasks that get completed
      for (let i = 0; i < 10; i++) {
        const task = taskRepo.create({
          content: `Independent task ${i}`,
          source: 'manual',
          priority: 85,
          project_id: project.id,
        });
        taskRepo.complete(task.id);
      }

      const insights = insightRepo.detectTaskFailurePatterns();

      expect(insights.length).toBeGreaterThan(0);

      const dependencyInsight = insights.find(i =>
        i.content.includes('dependencies') || i.content.includes('blocked')
      );

      expect(dependencyInsight).toBeDefined();
      expect(dependencyInsight?.type).toBe('feature_proposal');
      expect(dependencyInsight?.title).toContain('dependency');
    });
  });
});
