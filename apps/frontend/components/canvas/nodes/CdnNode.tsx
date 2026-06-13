'use client';

import { Globe } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function CdnNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="CDN"
      subtitle="CDN"
      typeColor="border-indigo-400 bg-indigo-50"
      icon={<Globe className="h-7 w-7 text-indigo-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
