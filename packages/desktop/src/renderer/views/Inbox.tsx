import { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import TaskCard from '../components/TaskCard';

export default function Inbox() {
  const { tasks, createTask, completeTask, deleteTask } = useTasks();
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState(50);
  const [source, setSource] = useState<'manual' | 'twitter' | 'github'>('manual');
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      // Detect if it's a URL
      const isURL = input.match(/^https?:\/\//);
      const taskSource = isURL ? 'twitter' : source;

      await createTask({
        content: input.trim(),
        source: taskSource,
        priority,
      });

      // Log activity
      await window.electronAPI.activity.log('task_created', 'task');

      // Clear input
      setInput('');
      setPriority(50);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  };

  const recentTasks = tasks.slice(0, 10);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Inbox</h1>
        <p className="text-dark-muted">
          Quick capture for tasks, links, and notes
        </p>
      </div>

      {/* Quick Capture Form */}
      <form onSubmit={handleQuickAdd} className="mb-8">
        <div className="card">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              What do you need to do?
            </label>
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a task, paste a link, or share from mobile..."
                className="input flex-1 min-h-[100px] resize-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handlePaste}
                className="btn btn-secondary h-10"
                title="Paste from clipboard"
              >
                📋
              </button>
            </div>
            <p className="text-xs text-dark-muted mt-2">
              Tip: Paste URLs directly to save tweets, articles, or resources
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                className="input w-full"
              >
                <option value="manual">Manual</option>
                <option value="twitter">Twitter</option>
                <option value="github">GitHub</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Priority: {priority}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-dark-muted mt-1">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="btn btn-primary flex-1"
            >
              {isLoading ? 'Adding...' : '✓ Add to Inbox'}
            </button>
            <button
              type="button"
              onClick={() => {
                setInput('');
                setPriority(50);
              }}
              className="btn btn-secondary"
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      {/* Keyboard Shortcuts */}
      <div className="mb-8 card bg-dark-border/50">
        <p className="text-sm font-semibold mb-2">⌨️ Keyboard Shortcuts</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-dark-muted">
          <div><kbd className="px-2 py-1 bg-dark-surface rounded">Cmd+V</kbd> Paste</div>
          <div><kbd className="px-2 py-1 bg-dark-surface rounded">Enter</kbd> Submit</div>
          <div><kbd className="px-2 py-1 bg-dark-surface rounded">Esc</kbd> Clear</div>
        </div>
      </div>

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Recent ({recentTasks.length})
          </h2>
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={completeTask}
                onDelete={deleteTask}
              />
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-6xl mb-4">📥</p>
          <p className="text-lg font-semibold mb-2">Inbox is empty</p>
          <p className="text-dark-muted">
            Start by adding a task above, or share content from your phone
          </p>
        </div>
      )}
    </div>
  );
}
