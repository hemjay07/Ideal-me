import { useProjects } from '../hooks/useProjects';
import { Project } from '@idealme/core';

function ProjectCard({ project }: { project: Project }) {
  const getFundingStatusColor = (status: string) => {
    switch (status) {
      case 'secured': return 'text-green-500';
      case 'pending': return 'text-yellow-500';
      default: return 'text-dark-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'paused': return 'bg-yellow-600';
      case 'completed': return 'bg-blue-600';
      default: return 'bg-dark-border';
    }
  };

  const formatMoney = (cents?: number) => {
    if (!cents) return '$0';
    return `$${(cents / 100).toLocaleString()}`;
  };

  return (
    <div className="card hover:border-primary-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold mb-1">{project.name}</h3>
          <p className="text-sm text-dark-muted">{project.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)} text-white`}>
            {project.status}
          </span>
        </div>
      </div>

      {project.funding_amount && (
        <div className="mb-4 p-3 bg-dark-border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-dark-muted mb-1">Potential Funding</p>
              <p className="text-2xl font-bold">{formatMoney(project.funding_amount)}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${getFundingStatusColor(project.funding_status)}`}>
                {project.funding_status}
              </p>
              {project.funding_source && (
                <p className="text-xs text-dark-muted">{project.funding_source}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-dark-muted">
        {project.category && (
          <span className="flex items-center gap-1">
            <span>🏷️</span>
            <span className="capitalize">{project.category.replace('-', ' ')}</span>
          </span>
        )}
        <span className="flex items-center gap-1">
          <span>⭐</span>
          <span>Priority: {project.priority}</span>
        </span>
      </div>
    </div>
  );
}

export default function Projects() {
  const { projects, loading } = useProjects();

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Projects</h1>
        <p className="text-dark-muted">Loading...</p>
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status === 'active');
  const totalFunding = projects.reduce((sum, p) => sum + (p.funding_amount || 0), 0);
  const highPriority = projects.filter(p => p.priority >= 80).length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Projects</h1>
        <p className="text-dark-muted">
          Managing {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-dark-muted mb-1">Active Projects</p>
          <p className="text-2xl font-bold">{activeProjects.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-muted mb-1">Total Potential Funding</p>
          <p className="text-2xl font-bold">
            ${(totalFunding / 100).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-muted mb-1">High Priority</p>
          <p className="text-2xl font-bold">{highPriority}</p>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">🚀</p>
            <p className="text-lg font-semibold mb-2">No projects yet</p>
            <p className="text-dark-muted">
              Your projects will appear here once you add them
            </p>
          </div>
        ) : (
          projects
            .sort((a, b) => b.priority - a.priority)
            .map(project => (
              <ProjectCard key={project.id} project={project} />
            ))
        )}
      </div>
    </div>
  );
}
