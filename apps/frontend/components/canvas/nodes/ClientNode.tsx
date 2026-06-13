'use client';

import { Monitor } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function ClientNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="Client"
      subtitle="Browser / App"
      typeColor="border-gray-400 bg-gray-50"
      icon={<Monitor className="h-7 w-7 text-gray-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
