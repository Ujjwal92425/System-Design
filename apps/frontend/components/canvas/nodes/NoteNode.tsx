'use client';

import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { StickyNote } from 'lucide-react';

interface NoteData {
  text?: string;
  label?: string;
  color?: string;
  onEditLabel?: (id: string, text: string) => void;
}

function NoteNode({ data, selected, id }: NodeProps) {
  const noteData = data as unknown as NoteData;
  const [text, setText] = useState<string>(String(noteData?.text || noteData?.label || 'Add your notes here...'));
  const [color, setColor] = useState<string>(noteData?.color || '#FEF3C7');

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (noteData.onEditLabel) {
      noteData.onEditLabel(id, e.target.value);
    }
  }, [noteData, id]);

  const colors = ['#FEF3C7', '#DBEAFE', '#D1FAE5', '#FCE7F3', '#E0E7FF', '#F5F5F4'];

  return (
    <div
      className={`rounded-xl shadow-sm border transition-all min-w-[200px] max-w-[320px] ${
        selected ? 'ring-2 ring-yc-accent shadow-md' : 'border-gray-200'
      }`}
      style={{ backgroundColor: color }}
    >
      {/* Multi-port: input ports on left, output ports on right */}
      {[0, 1, 2, 3].map((i) => (
        <Handle key={`nt-target-left-${i}`} type="target" position={Position.Left} id={`target-left-${i}`} style={{ top: `${25 + i * 18}%` }} className="!w-3 !h-3 !bg-white !border-2 !border-yc-accent" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Handle key={`nt-source-right-${i}`} type="source" position={Position.Right} id={`source-right-${i}`} style={{ top: `${25 + i * 18}%` }} className="!w-3 !h-3 !bg-yc-accent !border-2 !border-white" />
      ))}
      <Handle type="target" position={Position.Top} id="target-top" className="!w-3 !h-3 !bg-white !border-2 !border-yc-accent" />
      <Handle type="source" position={Position.Top} id="source-top" className="!w-3 !h-3 !bg-yc-accent !border-2 !border-white" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="!w-3 !h-3 !bg-white !border-2 !border-yc-accent" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!w-3 !h-3 !bg-yc-accent !border-2 !border-white" />
      <Handle type="target" position={Position.Left} id="target-left" className="!w-3 !h-3 !bg-white !border-2 !border-yc-accent" />
      <Handle type="source" position={Position.Left} id="source-left" className="!w-3 !h-3 !bg-yc-accent !border-2 !border-white" />
      <Handle type="target" position={Position.Right} id="target-right" className="!w-3 !h-3 !bg-white !border-2 !border-yc-accent" />
      <Handle type="source" position={Position.Right} id="source-right" className="!w-3 !h-3 !bg-yc-accent !border-2 !border-white" />

      <div className="flex items-center gap-2 px-3 py-2 border-b border-black/10">
        <StickyNote className="w-3.5 h-3.5 text-gray-600" />
        <span className="text-[10px] font-semibold text-gray-700 font-mono uppercase tracking-wider">Note</span>
        <div className="flex gap-1 ml-auto">
          {colors.map((c) => (
            <button
              key={c}
              onClick={(e) => { e.stopPropagation(); setColor(c); }}
              className="w-3 h-3 rounded-full border border-black/10 transition-transform hover:scale-125"
              style={{ backgroundColor: c }}
              aria-label={`Change note color to ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="p-3">
        <textarea
          value={text}
          onChange={handleTextChange}
          className="w-full bg-transparent border-none outline-none resize-none text-xs text-gray-800 leading-relaxed min-h-[60px] font-sans"
          rows={3}
          aria-label="Note content"
        />
      </div>
    </div>
  );
}

export default memo(NoteNode);
