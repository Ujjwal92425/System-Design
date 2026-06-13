'use client';

import { KeyRound } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function AuthServiceNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="Auth Service"
      subtitle="Auth"
      typeColor="border-orange-400 bg-orange-50"
      icon={<KeyRound className="h-7 w-7 text-orange-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
