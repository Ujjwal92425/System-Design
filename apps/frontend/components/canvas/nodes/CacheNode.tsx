'use client';

import { Zap } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function CacheNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="Cache"
      subtitle="Redis"
      typeColor="border-rose-400 bg-rose-50"
      icon={<Zap className="h-7 w-7 text-rose-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
