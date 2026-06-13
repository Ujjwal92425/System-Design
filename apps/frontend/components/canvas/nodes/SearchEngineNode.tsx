'use client';

import { Search } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function SearchEngineNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="Search Engine"
      subtitle="Elasticsearch"
      typeColor="border-yellow-400 bg-yellow-50"
      icon={<Search className="h-7 w-7 text-yellow-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
