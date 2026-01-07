import { Task } from '@idealme/core';

interface TaskCardProps {
  task: Task;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  showProject?: boolean;
}

export default function TaskCard({ task, onComplete, onDelete, showProject = false }: TaskCardProps) {
  const isCompleted = !!task.completed_at;
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !isCompleted;

  const getPriorityColor = (priority: number) => {
    if (priority >= 90) return 'text-red-500';
    if (priority >= 70) return 'text-orange-500';
    if (priority >= 50) return 'text-yellow-500';
    return 'text-dark-muted';
  };

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 1) return `in ${days} days`;
    if (days === 1) return 'tomorrow';
    if (hours > 0) return `in ${hours}h`;
    if (hours === 0) return 'due now';
    return 'overdue';
  };

  return (
    <div className={`card hover:border-dark-muted transition-colors ${isCompleted ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Checkbox */}
          <button
            onClick={() => onComplete?.(task.id)}
            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isCompleted
                ? 'bg-primary-600 border-primary-600'
                : 'border-dark-border hover:border-primary-600'
            }`}
          >
            {isCompleted && <span className="text-white text-xs">✓</span>}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${isCompleted ? 'line-through text-dark-muted' : 'text-dark-text'}`}>
              {task.content}
            </p>

            {/* Meta info */}
            <div className="flex items-center gap-3 mt-2 text-xs">
              {task.deadline && (
                <span className={`${isOverdue ? 'text-red-500' : 'text-dark-muted'}`}>
                  🕐 {formatDeadline(task.deadline)}
                </span>
              )}
              <span className={getPriorityColor(task.priority)}>
                Priority: {task.priority}
              </span>
              {task.source && (
                <span className="text-dark-muted capitalize">
                  {task.source.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {onDelete && (
          <button
            onClick={() => onDelete(task.id)}
            className="text-dark-muted hover:text-red-500 transition-colors text-sm"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
