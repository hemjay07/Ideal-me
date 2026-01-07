import { Task } from '@idealme/core';

interface PriorityCardProps {
  task: Task | null;
  reason?: string;
  onStart?: () => void;
  onSkip?: () => void;
}

export default function PriorityCard({ task, reason, onStart, onSkip }: PriorityCardProps) {
  if (!task) {
    return (
      <div className="card border-2 border-dark-border">
        <div className="text-center py-8">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-lg font-semibold mb-2">All caught up!</p>
          <p className="text-dark-muted text-sm">No urgent tasks right now. Great job!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-2 border-primary-600 bg-gradient-to-br from-dark-surface to-dark-bg">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-primary-500">Tonight's Focus</h3>
          <span className="text-xs text-dark-muted">Priority: {task.priority}</span>
        </div>
        <p className="text-xl font-medium text-dark-text">{task.content}</p>
      </div>

      {reason && (
        <div className="mb-4 p-3 bg-dark-border rounded-lg">
          <p className="text-sm text-dark-muted">
            <span className="font-semibold text-dark-text">Why: </span>
            {reason}
          </p>
        </div>
      )}

      {task.deadline && (
        <div className="mb-4">
          <p className="text-sm text-dark-muted">
            ⏰ Deadline: {new Date(task.deadline).toLocaleString()}
          </p>
        </div>
      )}

      {task.project_id && (
        <div className="mb-4">
          <p className="text-sm text-dark-muted">
            🚀 Project: {task.project_id}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        {onStart && (
          <button
            onClick={onStart}
            className="btn btn-primary flex-1"
          >
            Start Working
          </button>
        )}
        {onSkip && (
          <button
            onClick={onSkip}
            className="btn btn-secondary"
          >
            Not Today →
          </button>
        )}
      </div>
    </div>
  );
}
