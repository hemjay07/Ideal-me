import React, { useState, useEffect, useCallback } from 'react';
import type { Insight } from '@idealme/core';

export default function Insights() {
  const [pendingInsights, setPendingInsights] = useState<Insight[]>([]);
  const [approvedInsights, setApprovedInsights] = useState<Insight[]>([]);
  const [implementedInsights, setImplementedInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    if (!window.electronAPI) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const pending = await window.electronAPI.insights.getPending();
      const approved = await window.electronAPI.insights.getByStatus('approved');
      const implemented = await window.electronAPI.insights.getByStatus('implemented');

      setPendingInsights(pending || []);
      setApprovedInsights(approved || []);
      setImplementedInsights(implemented || []);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      // Set empty arrays on error so UI shows empty state
      setPendingInsights([]);
      setApprovedInsights([]);
      setImplementedInsights([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleApprove = async (id: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.insights.approve(id);
    await fetchInsights();
  };

  const handleReject = async (id: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.insights.reject(id);
    await fetchInsights();
  };

  const handleRunAnalysis = async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    await window.electronAPI.insights.runAnalysis();
    await fetchInsights();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pattern':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'suggestion':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'feature_proposal':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return '📊';
      case 'suggestion':
        return '💡';
      case 'feature_proposal':
        return '🚀';
      default:
        return '🔍';
    }
  };

  const InsightCard = ({ insight, showActions = false }: { insight: Insight; showActions?: boolean }) => (
    <div className="card border-l-4 border-primary-600">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{getTypeIcon(insight.type)}</span>
            <div>
              <span className={`text-xs px-2 py-1 rounded border ${getTypeColor(insight.type)}`}>
                {insight.type.replace('_', ' ')}
              </span>
              <span className="ml-2 text-xs text-dark-muted">
                {Math.round(insight.confidence_score * 100)}% confidence
              </span>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-dark-text mb-2">{insight.title}</h3>
          <p className="text-dark-muted mb-3">{insight.content}</p>

          {insight.impact_prediction && (
            <div className="bg-primary-600/10 border border-primary-600/20 rounded p-3 mb-3">
              <p className="text-sm text-primary-400">
                <span className="font-semibold">Predicted Impact:</span> {insight.impact_prediction}
              </p>
            </div>
          )}

          <p className="text-xs text-dark-muted">
            Detected {new Date(insight.created_at).toLocaleDateString()} at{' '}
            {new Date(insight.created_at).toLocaleTimeString()}
          </p>
        </div>

        {showActions && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => handleApprove(insight.id)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => handleReject(insight.id)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              ✗ Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (loading && pendingInsights.length === 0) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🤖</div>
          <p className="text-dark-muted">Analyzing your usage patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark-text mb-2">AI Insights</h1>
          <p className="text-dark-muted">
            I analyze your usage patterns and suggest improvements. This is how I evolve to serve you better.
          </p>
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={loading}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-border disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
        >
          {loading ? 'Analyzing...' : '🔄 Run Analysis'}
        </button>
      </div>

      {/* Pending Insights - Need Review */}
      {pendingInsights.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark-text mb-4 flex items-center gap-2">
            <span className="text-yellow-400">⚡</span>
            Pending Review ({pendingInsights.length})
          </h2>
          <p className="text-dark-muted mb-4">
            These insights need your approval before I can act on them.
          </p>
          <div className="space-y-4">
            {pendingInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} showActions={true} />
            ))}
          </div>
        </div>
      )}

      {/* Approved Insights - Ready to Implement */}
      {approvedInsights.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark-text mb-4 flex items-center gap-2">
            <span className="text-green-400">✓</span>
            Approved ({approvedInsights.length})
          </h2>
          <p className="text-dark-muted mb-4">
            You've approved these insights. I'm working on implementing them.
          </p>
          <div className="space-y-4">
            {approvedInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Implemented Insights - Live in Production */}
      {implementedInsights.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark-text mb-4 flex items-center gap-2">
            <span className="text-primary-400">🎯</span>
            Implemented ({implementedInsights.length})
          </h2>
          <p className="text-dark-muted mb-4">
            These improvements are now live. I'm tracking their impact.
          </p>
          <div className="space-y-4">
            {implementedInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingInsights.length === 0 && approvedInsights.length === 0 && implementedInsights.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-dark-text mb-2">No insights yet</h2>
          <p className="text-dark-muted mb-6">
            Keep using IdealMe and I'll start detecting patterns in your work.
            <br />
            I need at least a few days of activity to generate meaningful insights.
          </p>
          <button
            onClick={handleRunAnalysis}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
          >
            Run Analysis Now
          </button>
        </div>
      )}

      {/* How It Works Section */}
      <div className="mt-12 bg-dark-surface rounded-lg p-6">
        <h3 className="text-xl font-bold text-dark-text mb-4">How AI Self-Improvement Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-3xl mb-2">📊</div>
            <h4 className="font-semibold text-dark-text mb-2">1. Pattern Detection</h4>
            <p className="text-sm text-dark-muted">
              I analyze your activity logs to detect patterns in task completion, notification response times, and work
              habits.
            </p>
          </div>
          <div>
            <div className="text-3xl mb-2">💡</div>
            <h4 className="font-semibold text-dark-text mb-2">2. Insight Generation</h4>
            <p className="text-sm text-dark-muted">
              Based on detected patterns, I generate insights and suggest specific features or improvements with
              confidence scores.
            </p>
          </div>
          <div>
            <div className="text-3xl mb-2">🚀</div>
            <h4 className="font-semibold text-dark-text mb-2">3. Implementation & Impact</h4>
            <p className="text-sm text-dark-muted">
              After your approval, I implement changes and track their impact on your productivity and goal progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
