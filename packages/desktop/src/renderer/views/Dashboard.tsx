import { useEffect, useState } from 'react';
import { useTopPriority, useMonoWork, useTasks } from '../hooks/useTasks';
import PriorityCard from '../components/PriorityCard';
import TaskCard from '../components/TaskCard';

export default function Dashboard() {
  const { tasks: topPriority, loading: loadingPriority } = useTopPriority(1);
  const { tasks: monoTasks, loading: loadingMono, refresh: refreshMono } = useMonoWork();
  const { tasks: allTasks, completeTask, deleteTask } = useTasks();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const mainFocus = topPriority[0] || null;

  // Calculate secondary tasks (top 3 excluding main focus)
  const secondaryTasks = allTasks
    .filter(t => !mainFocus || t.id !== mainFocus.id)
    .filter(t => t.source !== 'mono_work')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  // Generate AI reason for priority
  const getPriorityReason = () => {
    if (!mainFocus) return '';

    const reasons: string[] = [];

    // Check deadline
    if (mainFocus.deadline) {
      const deadline = new Date(mainFocus.deadline);
      const hoursUntil = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntil < 24) {
        reasons.push('Deadline is less than 24 hours away');
      } else if (hoursUntil < 48) {
        reasons.push('Deadline approaching soon');
      }
    }

    // Check priority score
    if (mainFocus.priority >= 95) {
      reasons.push('Highest priority task');
    }

    // Check project
    if (mainFocus.project_id === 'truthbounty') {
      reasons.push('Critical for TruthBounty funding');
    }

    // Evening optimization
    const hour = currentTime.getHours();
    if (hour >= 20 || hour < 1) {
      reasons.push('You work best in the evening (8pm-12am)');
    }

    return reasons.join('. ') || 'Based on priority and deadline analysis';
  };

  const handleCompleteTask = async (id: string) => {
    await completeTask(id);
    await window.electronAPI.activity.log('task_completed', 'task', id);
    refreshMono(); // Refresh in case it was Mono work
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
  };

  const handleStartWorking = () => {
    if (mainFocus) {
      window.electronAPI.activity.log('task_started', 'task', mainFocus.id);
    }
  };

  const isStandupReady = monoTasks.length === 0;
  const standupTime = '11:00 AM';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-dark-muted">
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
          {' · '}
          {currentTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          })}
        </p>
      </div>

      {/* Mono Work Section */}
      {monoTasks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">💼 Mono Work</h2>
            <span className="text-sm text-dark-muted">Standup at {standupTime}</span>
          </div>

          <div className="card border-2 border-orange-600 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold">Prep for standup</p>
                <p className="text-sm text-dark-muted">
                  Complete these tasks before {standupTime} standup
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {monoTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {monoTasks.length === 0 && currentTime.getHours() < 11 && (
        <div className="mb-8">
          <div className="card border-2 border-green-600 bg-green-950/20">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-500">Ready for Standup</p>
                <p className="text-sm text-dark-muted">
                  All prep work complete. You're good for {standupTime} standup!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Focus */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">🎯 Main Focus</h2>
        {loadingPriority ? (
          <div className="card">
            <p className="text-dark-muted">Loading...</p>
          </div>
        ) : (
          <PriorityCard
            task={mainFocus}
            reason={getPriorityReason()}
            onStart={handleStartWorking}
            onSkip={() => {
              // TODO: Implement skip logic
              console.log('Skip clicked');
            }}
          />
        )}
      </div>

      {/* Secondary Tasks */}
      {secondaryTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">📋 Secondary (if time allows)</h2>
          <div className="space-y-3">
            {secondaryTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleCompleteTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-dark-muted mb-1">Total Tasks</p>
          <p className="text-2xl font-bold">{allTasks.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-muted mb-1">High Priority</p>
          <p className="text-2xl font-bold">
            {allTasks.filter(t => t.priority >= 80).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-muted mb-1">Mono Ready</p>
          <p className="text-2xl font-bold">{isStandupReady ? '✓' : '✗'}</p>
        </div>
      </div>
    </div>
  );
}
