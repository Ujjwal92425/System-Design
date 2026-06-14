/**
 * apps/frontend/components/canvas/panels/Toolbar.tsx
 *
 * Left-side toolbar for adding architecture nodes to the canvas.
 * Lists all 15 node types grouped by category with drag-to-add.
 * Also provides undo/redo and zoom-reset controls.
 *
 * CHANGE: Implemented from stub — full toolbar with drag-and-drop
 *          node creation and canvas control actions.
 */

'use client';

import { useCallback, useState } from 'react';
import { NodeType } from '@sd-os/shared';
import { useCanvasStore, type CanvasNode } from '../../../features/canvas/useCanvasStore';
import { cn } from '@sd-os/ui';
import {
  Shield, Scale, Server, Database, Hexagon, Zap, ArrowLeftRight,
  Globe, Archive, BookOpen, Box, KeyRound, Bell, Search, Monitor,
  Undo2, Redo2, RotateCcw, Trash2, Copy,
} from 'lucide-react';

interface NodeTypeEntry {
  type: NodeType;
  label: string;
  category: string;
  icon: React.ReactNode;
}

const NODE_TYPES: NodeTypeEntry[] = [
  { type: NodeType.CLIENT, label: 'Client', category: 'Entry', icon: <Monitor className="h-5 w-5" /> },
  { type: NodeType.DNS, label: 'DNS', category: 'Entry', icon: <BookOpen className="h-5 w-5" /> },
  { type: NodeType.CDN, label: 'CDN', category: 'Entry', icon: <Globe className="h-5 w-5" /> },
  { type: NodeType.LOAD_BALANCER, label: 'Load Balancer', category: 'Gateway', icon: <Scale className="h-5 w-5" /> },
  { type: NodeType.API_GATEWAY, label: 'API Gateway', category: 'Gateway', icon: <Shield className="h-5 w-5" /> },
  { type: NodeType.WEB_SERVER, label: 'Web Server', category: 'Compute', icon: <Server className="h-5 w-5" /> },
  { type: NodeType.MICROSERVICE, label: 'Microservice', category: 'Compute', icon: <Box className="h-5 w-5" /> },
  { type: NodeType.CACHE, label: 'Cache', category: 'Data', icon: <Zap className="h-5 w-5" /> },
  { type: NodeType.QUEUE, label: 'Queue', category: 'Data', icon: <ArrowLeftRight className="h-5 w-5" /> },
  { type: NodeType.DATABASE_SQL, label: 'SQL Database', category: 'Data', icon: <Database className="h-5 w-5" /> },
  { type: NodeType.DATABASE_NOSQL, label: 'NoSQL Database', category: 'Data', icon: <Hexagon className="h-5 w-5" /> },
  { type: NodeType.OBJECT_STORAGE, label: 'Object Storage', category: 'Data', icon: <Archive className="h-5 w-5" /> },
  { type: NodeType.SEARCH_ENGINE, label: 'Search Engine', category: 'Services', icon: <Search className="h-5 w-5" /> },
  { type: NodeType.AUTH_SERVICE, label: 'Auth Service', category: 'Services', icon: <KeyRound className="h-5 w-5" /> },
  { type: NodeType.NOTIFICATION_SERVICE, label: 'Notifications', category: 'Services', icon: <Bell className="h-5 w-5" /> },
];

const categories = ['Entry', 'Gateway', 'Compute', 'Data', 'Services'] as const;

export function Toolbar() {
  const { nodes, addNode, undo, redo, deleteSelected, duplicateSelected, setNodes } = useCanvasStore();
  const [filter, setFilter] = useState<string | null>(null);

  const handleAddNode = useCallback(
    (type: NodeType) => {
      const id = `${type.toLowerCase()}-${Date.now()}`;
      const offset = nodes.length * 30;
      const newNode: CanvasNode = {
        id,
        type,
        position: { x: 100 + offset, y: 100 + offset },
        data: { label: type.replace(/_/g, ' ') },
      };
      addNode(newNode);
    },
    [nodes.length, addNode],
  );

  const handleDragStart = useCallback((e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('node-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const selectedCount = nodes.filter((n) => n.selected).length;

  return (
    <div className="flex w-56 flex-col border-r border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 px-3 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Components</h2>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1 border-b border-slate-100 px-3 py-2">
        <button
          onClick={() => setFilter(null)}
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
            !filter ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat === filter ? null : cat)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
              filter === cat ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Node type list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {categories
          .filter((cat) => !filter || filter === cat)
          .map((cat) => {
            const items = NODE_TYPES.filter((n) => n.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-3">
                <h3 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {cat}
                </h3>
                <div className="space-y-0.5">
                  {items.map((nodeType) => (
                    <button
                      key={nodeType.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, nodeType.type)}
                      onClick={() => handleAddNode(nodeType.type)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      <span className="text-slate-400">{nodeType.icon}</span>
                      <span>{nodeType.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* Actions footer */}
      <div className="border-t border-slate-100 px-2 py-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5">
            <button
              onClick={undo}
              title="Undo (Ctrl+Z)"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              title="Redo (Ctrl+Shift+Z)"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-0.5">
            <button
              onClick={duplicateSelected}
              disabled={selectedCount === 0}
              title="Duplicate selected (Ctrl+D)"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={deleteSelected}
              disabled={selectedCount === 0}
              title="Delete selected (Delete)"
              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-1 text-center text-[10px] text-slate-400">
          Drag nodes onto the canvas
        </p>
      </div>
    </div>
  );
}
