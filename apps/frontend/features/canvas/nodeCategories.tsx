'use client';

import {
  Monitor, Globe, Network, ArrowUpDown, Shield, Server, Cpu, Zap,
  Database, HardDrive, Activity, Search, Bell, BookOpen, Key,
  ShieldCheck, Cloud, Box, FileJson, Layers, Wifi, Lock,
  Eye, BarChart, CpuIcon, BrainCircuit, Users, Shuffle,
} from 'lucide-react';
import type { ReactNode } from 'react';

export interface NodeCategoryItem {
  type: string;
  label: string;
  icon: ReactNode;
  color: string;
  borderColor: string;
}

export interface NodeCategory {
  name: string;
  icon: ReactNode;
  items: NodeCategoryItem[];
}

export const NODE_CATEGORIES: NodeCategory[] = [
  {
    name: 'Client Layer',
    icon: <Monitor className="w-3.5 h-3.5" />,
    items: [
      { type: 'CLIENT', label: 'Client', icon: <Monitor className="w-4 h-4" />, color: 'text-slate-600', borderColor: 'border-slate-300 bg-slate-50' },
      { type: 'WEB_SERVER', label: 'Web App', icon: <Globe className="w-4 h-4" />, color: 'text-sky-600', borderColor: 'border-sky-300 bg-sky-50' },
      { type: 'MOBILE_APP', label: 'Mobile App', icon: <Monitor className="w-4 h-4" />, color: 'text-indigo-600', borderColor: 'border-indigo-300 bg-indigo-50' },
      { type: 'DESKTOP_APP', label: 'Desktop App', icon: <Monitor className="w-4 h-4" />, color: 'text-gray-600', borderColor: 'border-gray-300 bg-gray-50' },
      { type: 'ADMIN_PANEL', label: 'Admin Panel', icon: <Shield className="w-4 h-4" />, color: 'text-violet-600', borderColor: 'border-violet-300 bg-violet-50' },
      { type: 'BROWSER', label: 'Browser', icon: <Globe className="w-4 h-4" />, color: 'text-blue-600', borderColor: 'border-blue-300 bg-blue-50' },
    ],
  },
  {
    name: 'Network',
    icon: <Wifi className="w-3.5 h-3.5" />,
    items: [
      { type: 'DNS', label: 'DNS', icon: <BookOpen className="w-4 h-4" />, color: 'text-violet-600', borderColor: 'border-violet-300 bg-violet-50' },
      { type: 'CDN', label: 'CDN', icon: <Globe className="w-4 h-4" />, color: 'text-indigo-600', borderColor: 'border-indigo-300 bg-indigo-50' },
      { type: 'LOAD_BALANCER', label: 'Load Balancer', icon: <ArrowUpDown className="w-4 h-4" />, color: 'text-blue-600', borderColor: 'border-blue-300 bg-blue-50' },
      { type: 'API_GATEWAY', label: 'API Gateway', icon: <Shield className="w-4 h-4" />, color: 'text-purple-600', borderColor: 'border-purple-300 bg-purple-50' },
      { type: 'REVERSE_PROXY', label: 'Reverse Proxy', icon: <Network className="w-4 h-4" />, color: 'text-cyan-600', borderColor: 'border-cyan-300 bg-cyan-50' },
      { type: 'WAF', label: 'WAF', icon: <Lock className="w-4 h-4" />, color: 'text-orange-600', borderColor: 'border-orange-300 bg-orange-50' },
      { type: 'CIRCUIT_BREAKER', label: 'Circuit Breaker', icon: <Shield className="w-4 h-4" />, color: 'text-orange-600', borderColor: 'border-orange-300 bg-orange-50' },
      { type: 'SERVICE_MESH', label: 'Service Mesh', icon: <Network className="w-4 h-4" />, color: 'text-cyan-600', borderColor: 'border-cyan-300 bg-cyan-50' },
    ],
  },
  {
    name: 'Compute',
    icon: <Server className="w-3.5 h-3.5" />,
    items: [
      { type: 'WEB_SERVER', label: 'Web Server', icon: <Server className="w-4 h-4" />, color: 'text-sky-600', borderColor: 'border-sky-300 bg-sky-50' },
      { type: 'APP_SERVER', label: 'Application Server', icon: <Server className="w-4 h-4" />, color: 'text-blue-600', borderColor: 'border-blue-300 bg-blue-50' },
      { type: 'MICROSERVICE', label: 'Microservice', icon: <Box className="w-4 h-4" />, color: 'text-slate-600', borderColor: 'border-slate-300 bg-slate-50' },
      { type: 'WORKER', label: 'Worker', icon: <Cpu className="w-4 h-4" />, color: 'text-amber-600', borderColor: 'border-amber-300 bg-amber-50' },
      { type: 'SERVERLESS_FN', label: 'Serverless Function', icon: <Zap className="w-4 h-4" />, color: 'text-yellow-600', borderColor: 'border-yellow-300 bg-yellow-50' },
    ],
  },
  {
    name: 'Databases',
    icon: <Database className="w-3.5 h-3.5" />,
    items: [
      { type: 'DATABASE_SQL', label: 'PostgreSQL', icon: <Database className="w-4 h-4" />, color: 'text-emerald-600', borderColor: 'border-emerald-300 bg-emerald-50' },
      { type: 'DATABASE_SQL', label: 'MySQL', icon: <Database className="w-4 h-4" />, color: 'text-emerald-600', borderColor: 'border-emerald-300 bg-emerald-50' },
      { type: 'DATABASE_NOSQL', label: 'MongoDB', icon: <Database className="w-4 h-4" />, color: 'text-emerald-600', borderColor: 'border-emerald-300 bg-emerald-50' },
      { type: 'DATABASE_NOSQL', label: 'DynamoDB', icon: <Database className="w-4 h-4" />, color: 'text-cyan-600', borderColor: 'border-cyan-300 bg-cyan-50' },
      { type: 'DATABASE_NOSQL', label: 'Cassandra', icon: <Database className="w-4 h-4" />, color: 'text-violet-600', borderColor: 'border-violet-300 bg-violet-50' },
      { type: 'CACHE', label: 'Redis DB', icon: <Zap className="w-4 h-4" />, color: 'text-rose-600', borderColor: 'border-rose-300 bg-rose-50' },
    ],
  },
  {
    name: 'Storage',
    icon: <HardDrive className="w-3.5 h-3.5" />,
    items: [
      { type: 'OBJECT_STORAGE', label: 'Object Storage', icon: <HardDrive className="w-4 h-4" />, color: 'text-cyan-600', borderColor: 'border-cyan-300 bg-cyan-50' },
      { type: 'OBJECT_STORAGE', label: 'Blob Storage', icon: <HardDrive className="w-4 h-4" />, color: 'text-blue-600', borderColor: 'border-blue-300 bg-blue-50' },
      { type: 'FILE_STORAGE', label: 'File Storage', icon: <FileJson className="w-4 h-4" />, color: 'text-gray-600', borderColor: 'border-gray-300 bg-gray-50' },
      { type: 'DATA_LAKE', label: 'Data Lake', icon: <Layers className="w-4 h-4" />, color: 'text-indigo-600', borderColor: 'border-indigo-300 bg-indigo-50' },
    ],
  },
  {
    name: 'Messaging',
    icon: <Activity className="w-3.5 h-3.5" />,
    items: [
      { type: 'QUEUE', label: 'Kafka', icon: <Activity className="w-4 h-4" />, color: 'text-amber-600', borderColor: 'border-amber-300 bg-amber-50' },
      { type: 'QUEUE', label: 'RabbitMQ', icon: <Activity className="w-4 h-4" />, color: 'text-orange-600', borderColor: 'border-orange-300 bg-orange-50' },
      { type: 'QUEUE', label: 'SQS', icon: <Activity className="w-4 h-4" />, color: 'text-amber-600', borderColor: 'border-amber-300 bg-amber-50' },
      { type: 'PUBSUB', label: 'PubSub', icon: <Activity className="w-4 h-4" />, color: 'text-yellow-600', borderColor: 'border-yellow-300 bg-yellow-50' },
      { type: 'QUEUE', label: 'Queue', icon: <Activity className="w-4 h-4" />, color: 'text-amber-600', borderColor: 'border-amber-300 bg-amber-50' },
      { type: 'DEAD_LETTER_QUEUE', label: 'Dead Letter Queue', icon: <Activity className="w-4 h-4" />, color: 'text-red-600', borderColor: 'border-red-300 bg-red-50' },
    ],
  },
  {
    name: 'Cache',
    icon: <Zap className="w-3.5 h-3.5" />,
    items: [
      { type: 'CACHE', label: 'Redis Cache', icon: <Zap className="w-4 h-4" />, color: 'text-rose-600', borderColor: 'border-rose-300 bg-rose-50' },
      { type: 'CACHE', label: 'Memcached', icon: <Zap className="w-4 h-4" />, color: 'text-pink-600', borderColor: 'border-pink-300 bg-pink-50' },
      { type: 'CACHE', label: 'Edge Cache', icon: <Globe className="w-4 h-4" />, color: 'text-indigo-600', borderColor: 'border-indigo-300 bg-indigo-50' },
    ],
  },
  {
    name: 'Observability',
    icon: <Eye className="w-3.5 h-3.5" />,
    items: [
      { type: 'LOGS', label: 'Logs', icon: <FileJson className="w-4 h-4" />, color: 'text-gray-600', borderColor: 'border-gray-300 bg-gray-50' },
      { type: 'METRICS', label: 'Metrics', icon: <BarChart className="w-4 h-4" />, color: 'text-blue-600', borderColor: 'border-blue-300 bg-blue-50' },
      { type: 'TRACING', label: 'Tracing', icon: <Activity className="w-4 h-4" />, color: 'text-teal-600', borderColor: 'border-teal-300 bg-teal-50' },
      { type: 'MONITORING', label: 'Monitoring', icon: <Eye className="w-4 h-4" />, color: 'text-green-600', borderColor: 'border-green-300 bg-green-50' },
      { type: 'ALERTING', label: 'Alerting', icon: <Bell className="w-4 h-4" />, color: 'text-red-600', borderColor: 'border-red-300 bg-red-50' },
    ],
  },
  {
    name: 'Security',
    icon: <Lock className="w-3.5 h-3.5" />,
    items: [
      { type: 'AUTH_SERVICE', label: 'Auth Service', icon: <Key className="w-4 h-4" />, color: 'text-orange-600', borderColor: 'border-orange-300 bg-orange-50' },
      { type: 'OAUTH', label: 'OAuth', icon: <Key className="w-4 h-4" />, color: 'text-green-600', borderColor: 'border-green-300 bg-green-50' },
      { type: 'JWT', label: 'JWT', icon: <Shield className="w-4 h-4" />, color: 'text-purple-600', borderColor: 'border-purple-300 bg-purple-50' },
      { type: 'RATE_LIMITER', label: 'Rate Limiter', icon: <ShieldCheck className="w-4 h-4" />, color: 'text-amber-600', borderColor: 'border-amber-300 bg-amber-50' },
      { type: 'SECRETS_MANAGER', label: 'Secrets Manager', icon: <Lock className="w-4 h-4" />, color: 'text-red-600', borderColor: 'border-red-300 bg-red-50' },
      { type: 'NOTIFICATION_SERVICE', label: 'Notification Service', icon: <Bell className="w-4 h-4" />, color: 'text-pink-600', borderColor: 'border-pink-300 bg-pink-50' },
      { type: 'SEARCH_ENGINE', label: 'Search Engine', icon: <Search className="w-4 h-4" />, color: 'text-yellow-600', borderColor: 'border-yellow-300 bg-yellow-50' },
    ],
  },
  {
    name: 'AI / ML',
    icon: <BrainCircuit className="w-3.5 h-3.5" />,
    items: [
      { type: 'LLM_GATEWAY', label: 'LLM Gateway', icon: <BrainCircuit className="w-4 h-4" />, color: 'text-purple-600', borderColor: 'border-purple-300 bg-purple-50' },
      { type: 'EMBEDDING_SVC', label: 'Embedding Service', icon: <CpuIcon className="w-4 h-4" />, color: 'text-violet-600', borderColor: 'border-violet-300 bg-violet-50' },
      { type: 'VECTOR_DB', label: 'Vector DB', icon: <Database className="w-4 h-4" />, color: 'text-indigo-600', borderColor: 'border-indigo-300 bg-indigo-50' },
      { type: 'RAG_SERVICE', label: 'RAG Service', icon: <Search className="w-4 h-4" />, color: 'text-blue-600', borderColor: 'border-blue-300 bg-blue-50' },
      { type: 'INFERENCE_SVC', label: 'Inference Service', icon: <Cpu className="w-4 h-4" />, color: 'text-cyan-600', borderColor: 'border-cyan-300 bg-cyan-50' },
    ],
  },
  {
    name: 'Groups',
    icon: <Shuffle className="w-3.5 h-3.5" />,
    items: [
      { type: 'GROUP', label: 'Availability Zone', icon: <Shuffle className="w-4 h-4" />, color: 'text-blue-600', borderColor: 'border-blue-300 bg-blue-50' },
      { type: 'GROUP', label: 'Region', icon: <Globe className="w-4 h-4" />, color: 'text-violet-600', borderColor: 'border-violet-300 bg-violet-50' },
      { type: 'GROUP', label: 'Service Boundary', icon: <Box className="w-4 h-4" />, color: 'text-emerald-600', borderColor: 'border-emerald-300 bg-emerald-50' },
      { type: 'GROUP', label: 'VPC', icon: <Lock className="w-4 h-4" />, color: 'text-amber-600', borderColor: 'border-amber-300 bg-amber-50' },
    ],
  },
];
