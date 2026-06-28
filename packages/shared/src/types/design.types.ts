import { NodeType } from '../enums/node-types.enum';

export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  capacity?: number; // QPS
  latency?: number; // ms
  replicationEnabled?: boolean;
  [key: string]: any;
}

export interface DesignNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
}

export interface DesignEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  protocol?: 'sync' | 'async';
}

export interface DesignDocument {
  id: string;
  userId: string;
  title: string;
  description?: string;
  isPublic: boolean;
  nodes: DesignNode[];
  edges: DesignEdge[];
  createdAt: Date;
  updatedAt: Date;
}
