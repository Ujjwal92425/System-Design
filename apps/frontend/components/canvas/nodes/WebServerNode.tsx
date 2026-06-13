'use client';

import { Server } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function WebServerNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="Web Server"
      subtitle="Web Server"
      typeColor="border-sky-400 bg-sky-50"
      icon={<Server className="h-7 w-7 text-sky-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
