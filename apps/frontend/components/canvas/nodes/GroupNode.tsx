'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { cn } from '@sd-os/ui';
import { Box } from 'lucide-react';

const GROUP_STYLES: Record<string, { label: string; border: string; bg: string; header: string }> = {
  AZ: { label: 'Availability Zone', border: 'border-dashed border-blue-400', bg: 'bg-blue-50/30', header: 'bg-blue-100 text-blue-800' },
  REGION: { label: 'Region', border: 'border-dashed border-violet-400', bg: 'bg-violet-50/30', header: 'bg-violet-100 text-violet-800' },
  SERVICE: { label: 'Service Boundary', border: 'border-dashed border-emerald-400', bg: 'bg-emerald-50/30', header: 'bg-emerald-100 text-emerald-800' },
  VPC: { label: 'VPC', border: 'border-dashed border-amber-400', bg: 'bg-amber-50/30', header: 'bg-amber-100 text-amber-800' },
};

function GroupNode({ id, data, selected }: NodeProps) {
  const groupType = String(data?.groupType || 'AZ');
  const label = String(data?.label || 'Group');
  const style = GROUP_STYLES[groupType] || GROUP_STYLES.AZ;

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 min-w-[300px] min-h-[200px] transition-shadow',
        style.border,
        style.bg,
        selected && 'ring-2 ring-yc-accent shadow-lg',
      )}
    >
      <NodeResizer minWidth={200} minHeight={120} isVisible={selected} />

      <Handle type="target" position={Position.Top} className="!w-3 !h-3 border-2 border-yc-accent bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 border-2 border-yc-accent bg-yc-accent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-[10px] font-bold uppercase tracking-wider', style.header)}>
        <Box className="w-3.5 h-3.5" />
        <span>{label}</span>
        {groupType !== 'SERVICE' && (
          <span className="ml-auto text-[8px] font-mono opacity-60">{style.label}</span>
        )}
      </div>

      {data?.description ? (
        <p className="px-3 py-1 text-[9px] text-gray-500 italic m-0">{String(data.description)}</p>
      ) : null}
    </div>
  );
}

export default memo(GroupNode);
