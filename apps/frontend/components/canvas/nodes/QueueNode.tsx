'use client';

import { ArrowLeftRight } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function QueueNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="Queue"
      subtitle="Message Queue"
      typeColor="border-amber-400 bg-amber-50"
      icon={<ArrowLeftRight className="h-7 w-7 text-amber-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
