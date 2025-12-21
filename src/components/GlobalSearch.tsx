import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Sparkles, Scissors, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface SearchResult {
  id: string;
  title: string;
  type: 'blog' | 'service';
  path: string;
  description?: string;
}

export const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const searchServices: SearchResult[] = [
    { id: 'skin', title: 'Know Your Skin', type: 'service', path: '/know-your-skin', description: 'AI-powered skin analysis' },
    { id: 'hair', title: 'Know Your Hair', type: 'service', path: '/know-your-hair', description: 'Discover your hair type' },
    { id: 'karma', title: 'Ask Karma', type: 'service', path: '/ask-karma', description: 'AI beauty assistant' },
    { id: 'ingredients', title: 'Ingredients', type: 'service', path: '/ingredients', description: 'Learn about skincare ingredients' },
  ];

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const lowerQuery = searchQuery.toLowerCase();

    // Search services
    const serviceResults = searchServices.filter(service =>
      service.title.toLowerCase().includes(lowerQuery) ||
      service.description?.toLowerCase().includes(lowerQuery)
    );

    // Search blogs
    try {
      const { data: blogs } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt')
        .eq('is_published', true)
        .ilike('title', `%${searchQuery}%`)
        .limit(5);

      const blogResults: SearchResult[] = (blogs || []).map(blog => ({
        id: blog.id,
        title: blog.title,
        type: 'blog' as const,
        path: `/blogs/${blog.slug || blog.id}`,
        description: blog.excerpt || undefined,
      }));

      setResults([...serviceResults, ...blogResults]);
    } catch (error) {
      console.error('Search error:', error);
      setResults(serviceResults);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleResultClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'blog':
        return <FileText className="w-4 h-4" />;
      case 'service':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
        aria-label="Search"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline text-sm">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
      <div
        ref={searchRef}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services, blogs, and more..."
            className="flex-1 outline-none text-gray-800 placeholder-gray-400"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result.path)}
                  className="w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-karma-light-gold rounded-lg flex items-center justify-center flex-shrink-0 text-karma-gold">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 mb-1">{result.title}</div>
                    {result.description && (
                      <div className="text-sm text-gray-500 truncate">{result.description}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">{result.type}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : query ? (
            <div className="p-8 text-center text-gray-500">No results found</div>
          ) : (
            <div className="p-8 text-center text-gray-500">Start typing to search...</div>
          )}
        </div>
      </div>
    </div>
  );
};


