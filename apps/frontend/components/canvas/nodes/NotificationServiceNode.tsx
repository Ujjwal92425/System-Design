'use client';

import { Bell } from 'lucide-react';
import { BaseNode, type BaseNodeProps } from './BaseNode';

export function NotificationServiceNode(props: Partial<BaseNodeProps>) {
  return (
    <BaseNode
      label="Notification"
      subtitle="Notifications"
      typeColor="border-pink-400 bg-pink-50"
      icon={<Bell className="h-7 w-7 text-pink-600" strokeWidth={1.5} />}
      {...props}
    />
  );
}
