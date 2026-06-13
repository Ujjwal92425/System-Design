'use client';

import { Shield } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function ApiGatewayNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="API Gateway"
      subtitle="API Gateway"
      typeColor="border-purple-400 bg-purple-50"
      icon={<Shield className="h-7 w-7 text-purple-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
