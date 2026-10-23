'use client';

import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { NODE_CATEGORIES, NodeCategoryItem } from '@/features/canvas/nodeCategories';
import type { NodeCategory } from '@/features/canvas/nodeCategories';

interface CanvasSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onAddNode: (item: NodeCategoryItem) => void;
}

const fuseOptions = {
  keys: ['label', 'type'],
  threshold: 0.4,
  includeScore: true,
};

const allItems = NODE_CATEGORIES.flatMap((cat) => cat.items);
const fuse = new Fuse(allItems, fuseOptions);

export function CanvasSidebar({ collapsed, onToggleCollapse, onAddNode }: CanvasSidebarProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NODE_CATEGORIES.forEach((cat) => { initial[cat.name] = true; });
    return initial;
  });

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    return fuse.search(search.trim()).map((r) => r.item);
  }, [search]);

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const hasSearch = searchResults !== null;

  const renderItem = (item: NodeCategoryItem, idx: number) => (
    <button
      key={`${item.type}-${idx}`}
      onClick={() => onAddNode(item)}
      className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-all hover:bg-orange-50 hover:border-orange-200 border border-transparent group"
    >
      <span className={`flex-shrink-0 ${item.color}`}>{item.icon}</span>
      <span className="text-xs font-medium text-gray-700 truncate group-hover:text-gray-900">
        {search && searchResults ? highlightMatch(item.label, search) : item.label}
      </span>
    </button>
  );

  return (
    <aside
      className={`bg-yc-bg border-r border-yc-border flex flex-col h-full transition-all duration-300 flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center border-b border-yc-border py-3 ${collapsed ? 'justify-center px-0' : 'px-4 justify-between'}`}>
        {!collapsed && (
          <>
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Components</span>
            <span className="text-[9px] text-gray-400 font-mono">{allItems.length}</span>
          </>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {collapsed ? (
        /* Collapsed: show category icons only */
        <div className="flex flex-col items-center gap-2 py-3 px-1 overflow-y-auto flex-1">
          {NODE_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => onToggleCollapse()}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search bar */}
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search components..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition"
              />
            </div>
          </div>

          {/* Scrollable category list */}
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
            {hasSearch ? (
              /* Search results */
              searchResults.length > 0 ? (
                <div className="py-2 space-y-0.5">
                  <p className="text-[10px] text-gray-400 font-medium px-2 pb-1">{searchResults.length} results</p>
                  {searchResults.map((item, idx) => renderItem(item, idx))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Search className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">No components found</p>
                </div>
              )
            ) : (
              /* Categorized list */
              NODE_CATEGORIES.map((cat) => (
                <div key={cat.name}>
                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{cat.icon}</span>
                      <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-gray-400 font-mono">{cat.items.length}</span>
                      {expandedCategories[cat.name] ? (
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {expandedCategories[cat.name] && (
                    <div className="ml-1 pl-2 border-l border-gray-100 space-y-0.5">
                      {cat.items.map((item, idx) => renderItem(item, idx))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-orange-200 text-orange-900 rounded-sm px-0.5">{part}</mark> : part
  );
}
