import { useState, useEffect } from 'react';

interface Resource {
  id: string;
  type: string;
  title?: string;
  url?: string;
  content?: string;
  category?: string;
  thumbnail_url?: string;
  project_id?: string;
  created_at: string;
}

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourceNotes, setNewResourceNotes] = useState('');
  const [newResourceCategory, setNewResourceCategory] = useState<string>('general');

  useEffect(() => {
    loadResources();
  }, [filter]);

  const loadResources = async () => {
    try {
      const filters = filter !== 'all' ? { category: filter } : undefined;
      const data = await window.electronAPI.resources.getRecent(50);

      if (filters?.category) {
        const filtered = data.filter((r: Resource) => r.category === filters.category);
        setResources(filtered);
      } else {
        setResources(data);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  };

  const handleAddResource = async () => {
    if (!newResourceUrl.trim()) return;

    try {
      // Infer type from URL
      let type = 'website';
      if (newResourceUrl.includes('twitter.com') || newResourceUrl.includes('x.com')) {
        type = 'tweet';
      } else if (newResourceUrl.includes('youtube.com') || newResourceUrl.includes('youtu.be')) {
        type = 'video';
      } else if (newResourceUrl.match(/\.(pdf|doc|txt)$/i)) {
        type = 'article';
      }

      await window.electronAPI.resources.create({
        type,
        url: newResourceUrl,
        content: newResourceNotes,
        category: newResourceCategory,
        source: 'manual',
      });

      // Reset form
      setNewResourceUrl('');
      setNewResourceNotes('');
      setNewResourceCategory('general');
      setIsAddModalOpen(false);

      // Reload
      loadResources();
    } catch (error) {
      console.error('Failed to add resource:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resource?')) return;

    try {
      await window.electronAPI.resources.delete(id);
      loadResources();
    } catch (error) {
      console.error('Failed to delete resource:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadResources();
      return;
    }

    try {
      const results = await window.electronAPI.resources.search(searchQuery);
      setResources(results);
    } catch (error) {
      console.error('Failed to search resources:', error);
    }
  };

  const getCategoryBadgeColor = (category?: string) => {
    switch (category) {
      case 'design': return 'bg-purple-500/20 text-purple-400';
      case 'polymarket': return 'bg-green-500/20 text-green-400';
      case 'vibe-coding': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark-text mb-2">References</h1>
          <p className="text-dark-muted">Save and organize things you find</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          + Add Reference
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-2">
          {['all', 'design', 'polymarket', 'vibe-coding', 'general'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === cat
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-surface text-dark-muted hover:text-dark-text'
              }`}
            >
              {cat === 'all' ? 'All' : cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search references..."
            className="flex-1 px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-dark-surface hover:bg-dark-hover border border-dark-border rounded-lg text-dark-text transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource) => (
          <div
            key={resource.id}
            className="bg-dark-surface border border-dark-border rounded-lg p-4 hover:border-primary-500 transition-all group"
          >
            {/* Thumbnail */}
            {resource.thumbnail_url ? (
              <div className="w-full h-40 mb-3 rounded-lg overflow-hidden bg-dark-bg">
                <img
                  src={resource.thumbnail_url}
                  alt={resource.title || 'Resource'}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-40 mb-3 rounded-lg bg-dark-bg flex items-center justify-center text-dark-muted">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            )}

            {/* Title */}
            <h3 className="text-lg font-semibold text-dark-text mb-1 truncate">
              {resource.title || 'Untitled'}
            </h3>

            {/* URL */}
            {resource.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-400 hover:text-primary-300 mb-2 block truncate"
              >
                {resource.url}
              </a>
            )}

            {/* Notes */}
            {resource.content && (
              <p className="text-sm text-dark-muted mb-3 line-clamp-2">
                {resource.content}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-dark-border">
              {resource.category && (
                <span className={`text-xs px-2 py-1 rounded ${getCategoryBadgeColor(resource.category)}`}>
                  {resource.category}
                </span>
              )}

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => window.open(resource.url, '_blank')}
                  className="text-dark-muted hover:text-primary-400 transition-colors"
                  title="Open"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(resource.id)}
                  className="text-dark-muted hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {resources.length === 0 && (
        <div className="text-center py-16 text-dark-muted">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p>No references yet. Add your first one!</p>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-surface border border-dark-border rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-dark-text">Add Reference</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-dark-muted hover:text-dark-text"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dark-muted mb-1">URL *</label>
                <input
                  type="text"
                  value={newResourceUrl}
                  onChange={(e) => setNewResourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-dark-muted mb-1">Notes (optional)</label>
                <textarea
                  value={newResourceNotes}
                  onChange={(e) => setNewResourceNotes(e.target.value)}
                  placeholder="Why did this catch your interest?"
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-dark-muted mb-1">Category</label>
                <select
                  value={newResourceCategory}
                  onChange={(e) => setNewResourceCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary-500"
                >
                  <option value="general">General</option>
                  <option value="design">Design</option>
                  <option value="polymarket">Polymarket</option>
                  <option value="vibe-coding">Vibe Coding</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-dark-bg hover:bg-dark-hover border border-dark-border rounded-lg text-dark-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddResource}
                  disabled={!newResourceUrl.trim()}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-border disabled:text-dark-muted text-white rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
