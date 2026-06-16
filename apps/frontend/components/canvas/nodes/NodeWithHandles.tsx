'use client';

import { memo, useCallback, useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { cn } from '@sd-os/ui';
import {
  Monitor, Globe, Network, ArrowUpDown, Shield, Server, Cpu, Zap,
  Database, HardDrive, Activity, Search, Bell, BookOpen, Key,
  ShieldCheck, Lock, Trash, Copy, Palette, GripVertical,
} from 'lucide-react';

const NODE_ICONS: Record<string, any> = {
  CLIENT: Monitor,
  DNS: BookOpen,
  CDN: Globe,
  LOAD_BALANCER: ArrowUpDown,
  API_GATEWAY: Shield,
  WEB_SERVER: Server,
  APP_SERVER: Server,
  MICROSERVICE: Cpu,
  WORKER: Cpu,
  SERVERLESS_FN: Zap,
  DATABASE_SQL: Database,
  DATABASE_NOSQL: Database,
  CACHE: Zap,
  QUEUE: Activity,
  OBJECT_STORAGE: HardDrive,
  FILE_STORAGE: HardDrive,
  DATA_LAKE: HardDrive,
  SEARCH_ENGINE: Search,
  AUTH_SERVICE: Key,
  NOTIFICATION_SERVICE: Bell,
  REVERSE_PROXY: Network,
  WAF: Lock,
  MONITORING: Shield,
  LOGS: Activity,
  METRICS: Activity,
  TRACING: Activity,
  ALERTING: Bell,
  OAUTH: Key,
  JWT: Shield,
  RATE_LIMITER: ShieldCheck,
  SECRETS_MANAGER: Lock,
  PUBSUB: Activity,
  LLM_GATEWAY: Cpu,
  EMBEDDING_SVC: Cpu,
  VECTOR_DB: Database,
  RAG_SERVICE: Search,
  INFERENCE_SVC: Cpu,
  BROWSER: Globe,
  DESKTOP_APP: Monitor,
  ADMIN_PANEL: Shield,
  MOBILE_APP: Monitor,
  CIRCUIT_BREAKER: Shield,
  DEAD_LETTER_QUEUE: Activity,
  SERVICE_MESH: Network,
};

const TYPE_COLORS: Record<string, string> = {
  CLIENT: 'border-slate-300 bg-slate-50',
  DNS: 'border-violet-300 bg-violet-50',
  CDN: 'border-indigo-300 bg-indigo-50',
  LOAD_BALANCER: 'border-blue-300 bg-blue-50',
  API_GATEWAY: 'border-purple-300 bg-purple-50',
  WEB_SERVER: 'border-sky-300 bg-sky-50',
  APP_SERVER: 'border-blue-300 bg-blue-50',
  MICROSERVICE: 'border-slate-300 bg-slate-50',
  WORKER: 'border-amber-300 bg-amber-50',
  SERVERLESS_FN: 'border-yellow-300 bg-yellow-50',
  DATABASE_SQL: 'border-emerald-300 bg-emerald-50',
  DATABASE_NOSQL: 'border-emerald-300 bg-emerald-50',
  CACHE: 'border-rose-300 bg-rose-50',
  QUEUE: 'border-amber-300 bg-amber-50',
  OBJECT_STORAGE: 'border-cyan-300 bg-cyan-50',
  FILE_STORAGE: 'border-gray-300 bg-gray-50',
  DATA_LAKE: 'border-indigo-300 bg-indigo-50',
  SEARCH_ENGINE: 'border-yellow-300 bg-yellow-50',
  AUTH_SERVICE: 'border-orange-300 bg-orange-50',
  NOTIFICATION_SERVICE: 'border-pink-300 bg-pink-50',
  REVERSE_PROXY: 'border-cyan-300 bg-cyan-50',
  WAF: 'border-orange-300 bg-orange-50',
  MONITORING: 'border-green-300 bg-green-50',
  LOGS: 'border-gray-300 bg-gray-50',
  METRICS: 'border-blue-300 bg-blue-50',
  TRACING: 'border-teal-300 bg-teal-50',
  ALERTING: 'border-red-300 bg-red-50',
  OAUTH: 'border-green-300 bg-green-50',
  JWT: 'border-purple-300 bg-purple-50',
  RATE_LIMITER: 'border-amber-300 bg-amber-50',
  SECRETS_MANAGER: 'border-red-300 bg-red-50',
  PUBSUB: 'border-yellow-300 bg-yellow-50',
  LLM_GATEWAY: 'border-purple-300 bg-purple-50',
  EMBEDDING_SVC: 'border-violet-300 bg-violet-50',
  VECTOR_DB: 'border-indigo-300 bg-indigo-50',
  RAG_SERVICE: 'border-blue-300 bg-blue-50',
  INFERENCE_SVC: 'border-cyan-300 bg-cyan-50',
  BROWSER: 'border-blue-300 bg-blue-50',
  DESKTOP_APP: 'border-gray-300 bg-gray-50',
  ADMIN_PANEL: 'border-violet-300 bg-violet-50',
  MOBILE_APP: 'border-indigo-300 bg-indigo-50',
  CIRCUIT_BREAKER: 'border-orange-300 bg-orange-50',
  DEAD_LETTER_QUEUE: 'border-red-300 bg-red-50',
  SERVICE_MESH: 'border-cyan-300 bg-cyan-50',
};

const TYPE_ICON_COLORS: Record<string, string> = {
  CLIENT: 'text-slate-600',
  DNS: 'text-violet-600',
  CDN: 'text-indigo-600',
  LOAD_BALANCER: 'text-blue-600',
  API_GATEWAY: 'text-purple-600',
  WEB_SERVER: 'text-sky-600',
  APP_SERVER: 'text-blue-600',
  MICROSERVICE: 'text-slate-600',
  WORKER: 'text-amber-600',
  SERVERLESS_FN: 'text-yellow-600',
  DATABASE_SQL: 'text-emerald-600',
  DATABASE_NOSQL: 'text-emerald-600',
  CACHE: 'text-rose-600',
  QUEUE: 'text-amber-600',
  OBJECT_STORAGE: 'text-cyan-600',
  FILE_STORAGE: 'text-gray-600',
  DATA_LAKE: 'text-indigo-600',
  SEARCH_ENGINE: 'text-yellow-600',
  AUTH_SERVICE: 'text-orange-600',
  NOTIFICATION_SERVICE: 'text-pink-600',
  REVERSE_PROXY: 'text-cyan-600',
  WAF: 'text-orange-600',
  MONITORING: 'text-green-600',
  LOGS: 'text-gray-600',
  METRICS: 'text-blue-600',
  TRACING: 'text-teal-600',
  ALERTING: 'text-red-600',
  OAUTH: 'text-green-600',
  JWT: 'text-purple-600',
  RATE_LIMITER: 'text-amber-600',
  SECRETS_MANAGER: 'text-red-600',
  PUBSUB: 'text-yellow-600',
  LLM_GATEWAY: 'text-purple-600',
  EMBEDDING_SVC: 'text-violet-600',
  VECTOR_DB: 'text-indigo-600',
  RAG_SERVICE: 'text-blue-600',
  INFERENCE_SVC: 'text-cyan-600',
  BROWSER: 'text-blue-600',
  DESKTOP_APP: 'text-gray-600',
  ADMIN_PANEL: 'text-violet-600',
  MOBILE_APP: 'text-indigo-600',
  CIRCUIT_BREAKER: 'text-orange-600',
  DEAD_LETTER_QUEUE: 'text-red-600',
  SERVICE_MESH: 'text-cyan-600',
};

function getNodeIcon(type: string) {
  const Icon = NODE_ICONS[type] || Server;
  return <Icon className="w-4 h-4" />;
}

function NodeWithHandles({ id, data, selected }: NodeProps) {
  const type = String(data.nodeType || 'WEB_SERVER');
  const label = String(data.label || type.toLowerCase().replace(/_/g, ' '));
  const Icon = NODE_ICONS[type] || Server;
  const typeColor = TYPE_COLORS[type] || 'border-slate-300 bg-slate-50';
  const iconColor = TYPE_ICON_COLORS[type] || 'text-slate-600';
  const metrics = data.metrics as Record<string, any> | undefined;

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 px-3 py-2.5 shadow-sm transition-shadow min-w-[140px] group',
        typeColor,
        selected && 'ring-2 ring-yc-accent shadow-lg',
      )}
    >
      {/* Resize handles (shown when selected) */}
      {selected && <NodeResizer minWidth={120} minHeight={50} />}

      {/* 4-sided Target Handles (inputs) - visible on node hover */}
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 border-2 border-yc-accent bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Bottom} className="!w-3 !h-3 border-2 border-yc-accent bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 border-2 border-yc-accent bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="target" position={Position.Right} className="!w-3 !h-3 border-2 border-yc-accent bg-white opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* 4-sided Source Handles (outputs) - visible on node hover */}
      <Handle type="source" position={Position.Top} className="!w-3 !h-3 border-2 border-yc-accent bg-yc-accent opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 border-2 border-yc-accent bg-yc-accent opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Left} className="!w-3 !h-3 border-2 border-yc-accent bg-yc-accent opacity-0 group-hover:opacity-100 transition-opacity" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 border-2 border-yc-accent bg-yc-accent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className={cn('flex-shrink-0', iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          {type.toLowerCase().replace(/_/g, ' ')}
        </span>
      </div>

      {/* Label */}
      <p className="text-xs font-bold text-gray-800 truncate m-0">
        {label}
      </p>

      {/* Metrics */}
      {metrics && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-200 flex items-center gap-2 text-[9px] text-gray-500">
          {metrics.qps !== undefined && <span>{metrics.qps.toLocaleString()} qps</span>}
          {metrics.errorRate !== undefined && (
            <span className={cn(metrics.errorRate > 30 ? 'text-red-500 font-semibold' : '')}>
              {metrics.errorRate}% err
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(NodeWithHandles);
