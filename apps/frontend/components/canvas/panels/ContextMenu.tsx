'use client';

import { useEffect, useRef } from 'react';
import { Copy, Trash, Edit3 } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string | null;
  onClose: () => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onRename: (nodeId: string) => void;
}

export function ContextMenu({ x, y, nodeId, onClose, onDuplicate, onDelete, onRename }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!nodeId) return null;

  const items = [
    { label: 'Duplicate', icon: Copy, action: () => { onDuplicate(nodeId!); onClose(); } },
    { label: 'Rename', icon: Edit3, action: () => { onRename(nodeId!); onClose(); } },
    { label: 'Delete', icon: Trash, action: () => { onDelete(nodeId!); onClose(); }, danger: true },
  ];

  const menuX = Math.min(x, window.innerWidth - 180);
  const menuY = Math.min(y, window.innerHeight - 200);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[160px]"
      style={{ left: menuX, top: menuY }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className={`flex items-center gap-3 w-full px-3.5 py-2 text-xs font-medium transition-colors ${
            item.danger
              ? 'text-red-600 hover:bg-red-50'
              : 'text-gray-700 hover:bg-orange-50 hover:text-orange-700'
          }`}
        >
          <item.icon className="w-3.5 h-3.5" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
