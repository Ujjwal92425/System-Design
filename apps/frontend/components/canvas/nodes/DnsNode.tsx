'use client';

import { BookOpen } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function DnsNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="DNS"
      subtitle="DNS"
      typeColor="border-violet-400 bg-violet-50"
      icon={<BookOpen className="h-7 w-7 text-violet-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
