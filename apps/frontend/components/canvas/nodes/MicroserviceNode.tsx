'use client';

import { Box } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function MicroserviceNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="Microservice"
      subtitle="Service"
      typeColor="border-slate-400 bg-slate-50"
      icon={<Box className="h-7 w-7 text-slate-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
