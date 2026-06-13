'use client';

import { Scale } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function LoadBalancerNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="Load Balancer"
      subtitle="Load Balancer"
      typeColor="border-blue-400 bg-blue-50"
      icon={<Scale className="h-7 w-7 text-blue-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
