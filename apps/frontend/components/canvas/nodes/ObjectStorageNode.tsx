'use client';

import { Archive } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function ObjectStorageNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="Object Storage"
      subtitle="S3 / GCS"
      typeColor="border-cyan-400 bg-cyan-50"
      icon={<Archive className="h-7 w-7 text-cyan-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
