'use client';

import { Database } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function DatabaseSqlNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="SQL Database"
      subtitle="PostgreSQL"
      typeColor="border-emerald-400 bg-emerald-50"
      icon={<Database className="h-7 w-7 text-emerald-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
