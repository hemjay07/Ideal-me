import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseClient } from '../../client';
import { ResourceRepository } from '../ResourceRepository';
import { ProjectRepository } from '../ProjectRepository';
import fs from 'fs';
import path from 'path';

describe('ResourceRepository', () => {
  let dbClient: DatabaseClient;
  let resourceRepo: ResourceRepository;
  let projectRepo: ProjectRepository;
  const testDbPath = path.join(__dirname, 'test-resources.db');

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create fresh database
    dbClient = new DatabaseClient(testDbPath);
    dbClient.migrate();

    resourceRepo = new ResourceRepository(dbClient);
    projectRepo = new ProjectRepository(dbClient);
  });

  afterEach(() => {
    dbClient.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('create', () => {
    it('should create a resource with minimal data', () => {
      const resource = resourceRepo.create({
        type: 'article',
        url: 'https://example.com/article',
      });

      expect(resource.id).toBeDefined();
      expect(resource.type).toBe('article');
      expect(resource.url).toBe('https://example.com/article');
      expect(resource.created_at).toBeDefined();
      expect(resource.bookmarked_at).toBeDefined();
    });

    it('should create a resource with full data', () => {
      const project = projectRepo.create({
        name: 'TruthBounty',
        status: 'active',
        funding_status: 'pending',
        priority: 90,
      });

      const resource = resourceRepo.create({
        type: 'website',
        url: 'https://linear.app',
        title: 'Linear - Issue Tracking',
        content: 'Love their command palette and animations',
        category: 'design',
        thumbnail_url: 'https://linear.app/og-image.png',
        project_id: project.id,
        source: 'manual',
      });

      expect(resource.id).toBeDefined();
      expect(resource.type).toBe('website');
      expect(resource.url).toBe('https://linear.app');
      expect(resource.title).toBe('Linear - Issue Tracking');
      expect(resource.content).toBe('Love their command palette and animations');
      expect(resource.category).toBe('design');
      expect(resource.thumbnail_url).toBe('https://linear.app/og-image.png');
      expect(resource.project_id).toBe(project.id);
      expect(resource.source).toBe('manual');
    });

    it('should create a tweet resource', () => {
      const resource = resourceRepo.create({
        type: 'tweet',
        url: 'https://twitter.com/user/status/123',
        title: 'Great design tip',
        category: 'design',
        metadata: {
          author: '@designer',
          likes: 1500,
        },
      });

      expect(resource.type).toBe('tweet');
      expect(resource.metadata).toEqual({
        author: '@designer',
        likes: 1500,
      });
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      // Seed test data
      resourceRepo.create({
        type: 'article',
        url: 'https://example.com/design',
        title: 'Design Article',
        category: 'design',
      });

      resourceRepo.create({
        type: 'article',
        url: 'https://example.com/polymarket',
        title: 'Polymarket Strategy',
        category: 'polymarket',
      });

      resourceRepo.create({
        type: 'website',
        url: 'https://example.com/vibesite',
        title: 'Vibe Coding Site',
        category: 'vibe-coding',
      });
    });

    it('should return all resources by default', () => {
      const resources = resourceRepo.findAll();
      expect(resources.length).toBe(3);
    });

    it('should filter by category', () => {
      const designResources = resourceRepo.findAll({ category: 'design' });
      expect(designResources.length).toBe(1);
      expect(designResources[0].category).toBe('design');

      const polymarketResources = resourceRepo.findAll({ category: 'polymarket' });
      expect(polymarketResources.length).toBe(1);
      expect(polymarketResources[0].title).toBe('Polymarket Strategy');
    });

    it('should filter by type', () => {
      const websites = resourceRepo.findAll({ type: 'website' });
      expect(websites.length).toBe(1);
      expect(websites[0].type).toBe('website');

      const articles = resourceRepo.findAll({ type: 'article' });
      expect(articles.length).toBe(2);
    });

    it('should filter by project_id', () => {
      const project = projectRepo.create({
        name: 'TruthBounty',
        status: 'active',
        funding_status: 'pending',
        priority: 90,
      });

      resourceRepo.create({
        type: 'article',
        url: 'https://example.com/truthbounty-design',
        title: 'TruthBounty Design Ref',
        category: 'design',
        project_id: project.id,
      });

      const projectResources = resourceRepo.findAll({ project_id: project.id });
      expect(projectResources.length).toBe(1);
      expect(projectResources[0].project_id).toBe(project.id);
    });

    it('should combine multiple filters', () => {
      const project = projectRepo.create({
        name: 'TruthBounty',
        status: 'active',
        funding_status: 'pending',
        priority: 90,
      });

      resourceRepo.create({
        type: 'website',
        url: 'https://example.com/truthbounty-ref',
        category: 'design',
        project_id: project.id,
      });

      const filtered = resourceRepo.findAll({
        type: 'website',
        category: 'design',
        project_id: project.id,
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].type).toBe('website');
      expect(filtered[0].category).toBe('design');
    });
  });

  describe('findById', () => {
    it('should return resource by ID', () => {
      const created = resourceRepo.create({
        type: 'article',
        url: 'https://example.com/test',
        title: 'Test Article',
      });

      const found = resourceRepo.findById(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Test Article');
    });

    it('should return null for non-existent ID', () => {
      const found = resourceRepo.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a resource', () => {
      const resource = resourceRepo.create({
        type: 'article',
        url: 'https://example.com/to-delete',
      });

      const deleted = resourceRepo.delete(resource.id);
      expect(deleted).toBe(true);

      const found = resourceRepo.findById(resource.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent resource', () => {
      const deleted = resourceRepo.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('getRecent', () => {
    beforeEach(() => {
      // Create resources in order (timestamps will differ slightly)
      resourceRepo.create({
        type: 'article',
        url: 'https://example.com/old',
        title: 'Old Article',
      });

      resourceRepo.create({
        type: 'article',
        url: 'https://example.com/recent',
        title: 'Recent Article',
      });
    });

    it('should return recent resources ordered by created_at', () => {
      const recent = resourceRepo.getRecent(10);
      expect(recent.length).toBeGreaterThan(0);

      // Most recent should be first
      if (recent.length >= 2) {
        const firstDate = new Date(recent[0].created_at);
        const secondDate = new Date(recent[1].created_at);
        expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
      }
    });

    it('should respect limit parameter', () => {
      // Create more resources
      for (let i = 0; i < 5; i++) {
        resourceRepo.create({
          type: 'article',
          url: `https://example.com/article-${i}`,
        });
      }

      const recent = resourceRepo.getRecent(3);
      expect(recent.length).toBe(3);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      resourceRepo.create({
        type: 'article',
        url: 'https://example.com/spring-animations',
        title: 'Emil Kowalski - Spring Animations',
        content: 'Best guide for spring physics in React',
        category: 'vibe-coding',
      });

      resourceRepo.create({
        type: 'website',
        url: 'https://linear.app',
        title: 'Linear - Issue Tracking',
        content: 'Love their spring-based transitions',
        category: 'design',
      });

      resourceRepo.create({
        type: 'article',
        url: 'https://example.com/polymarket-bots',
        title: 'Building Polymarket Bots',
        content: 'Strategy guide for automated trading',
        category: 'polymarket',
      });
    });

    it('should search in title', () => {
      const results = resourceRepo.search('spring');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.title?.toLowerCase().includes('spring'))).toBe(true);
    });

    it('should search in content', () => {
      const results = resourceRepo.search('strategy');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.content?.toLowerCase().includes('strategy'))).toBe(true);
    });

    it('should search in URL', () => {
      const results = resourceRepo.search('linear');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.url?.includes('linear'))).toBe(true);
    });

    it('should be case insensitive', () => {
      const results = resourceRepo.search('SPRING');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = resourceRepo.search('nonexistentkeyword123');
      expect(results.length).toBe(0);
    });
  });
});
