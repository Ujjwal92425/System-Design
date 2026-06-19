'use client';

import React from 'react';

interface DiagramNode {
  id: string;
  label: string;
  type?: 'client' | 'dns' | 'lb' | 'web' | 'app' | 'cache' | 'db' | 'queue' | 'worker' | 'storage';
  x: number;
  y: number;
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

interface DiagramEmbedProps {
  nodes?: DiagramNode[] | string;
  edges?: DiagramEdge[] | string;
  height?: number;
}

export function DiagramEmbed({ nodes: rawNodes = [], edges: rawEdges = [], height = 300 }: DiagramEmbedProps) {
  // Parse inputs in case they are JSON strings passed from MDX
  const nodes: DiagramNode[] = typeof rawNodes === 'string' ? JSON.parse(rawNodes) : rawNodes;
  const edges: DiagramEdge[] = typeof rawEdges === 'string' ? JSON.parse(rawEdges) : rawEdges;

  // Find min/max bounds to fit coordinates dynamically
  const padding = 50;
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  
  const minX = xs.length ? Math.min(...xs) - padding : 0;
  const maxX = xs.length ? Math.max(...xs) + padding : 800;
  const minY = ys.length ? Math.min(...ys) - padding : 0;
  const maxY = ys.length ? Math.max(...ys) + padding : height;

  const viewBox = `${minX} ${minY} ${Math.max(800, maxX - minX)} ${Math.max(height, maxY - minY)}`;

  const NODE_COLORS: Record<string, { border: string; bg: string; dot: string; text: string }> = {
    client:   { border: '#6366f1', bg: '#eef2ff', dot: '#6366f1', text: '#3730a3' },
    dns:      { border: '#22c55e', bg: '#f0fdf4', dot: '#22c55e', text: '#15803d' },
    lb:       { border: '#f97316', bg: '#fff7ed', dot: '#f97316', text: '#c2410c' },
    cdn:      { border: '#0ea5e9', bg: '#f0f9ff', dot: '#0ea5e9', text: '#0369a1' },
    web:      { border: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6', text: '#1d4ed8' },
    app:      { border: '#8b5cf6', bg: '#f5f3ff', dot: '#8b5cf6', text: '#6d28d9' },
    cache:    { border: '#f59e0b', bg: '#fffbeb', dot: '#f59e0b', text: '#b45309' },
    db:       { border: '#10b981', bg: '#ecfdf5', dot: '#10b981', text: '#047857' },
    queue:    { border: '#ec4899', bg: '#fdf2f8', dot: '#ec4899', text: '#be185d' },
    worker:   { border: '#64748b', bg: '#f8fafc', dot: '#64748b', text: '#334155' },
    storage:  { border: '#06b6d4', bg: '#ecfeff', dot: '#06b6d4', text: '#0e7490' },
    gateway:  { border: '#f97316', bg: '#fff7ed', dot: '#f97316', text: '#c2410c' },
    auth:     { border: '#ef4444', bg: '#fef2f2', dot: '#ef4444', text: '#b91c1c' },
    metrics:  { border: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6', text: '#1d4ed8' },
    default:  { border: '#94a3b8', bg: '#f8fafc', dot: '#94a3b8', text: '#475569' },
  };

  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 80, y: node.y + 24 };
  };

  function getEdgeEndpoints(
    start: { x: number; y: number },
    end: { x: number; y: number },
    nodeW = 160,
    nodeH = 48
  ) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const cosA = Math.abs(Math.cos(angle));
    const sinA = Math.abs(Math.sin(angle));
    const scaleW = cosA > 0.001 ? (nodeW / 2) / cosA : Infinity;
    const scaleH = sinA > 0.001 ? (nodeH / 2) / sinA : Infinity;
    const r = Math.min(scaleW, scaleH);
    return {
      x1: start.x + Math.cos(angle) * (r + 6),
      y1: start.y + Math.sin(angle) * (r + 6),
      x2: end.x - Math.cos(angle) * (r + 18),
      y2: end.y - Math.sin(angle) * (r + 18),
    };
  }

  return (
    <div style={{
      background: '#FAF9F5', // Warm paper color
      border: '2px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative',
      margin: '24px 0',
      backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
      backgroundSize: '16px 16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    }}>
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        fontSize: '9px',
        color: '#FF6600',
        fontWeight: 700,
        letterSpacing: '0.08em'
      }} className="mono animate-pulse-edge">
        SYSTEM TOPOLOGY GRAPH
      </div>

      <svg
        viewBox={viewBox}
        style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '500px' }}
      >
        {/* Definitions for arrow markers */}
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#FF6600" />
          </marker>
        </defs>

        {/* Draw Edges */}
        {edges.map((edge, i) => {
          const start = getNodeCenter(edge.from);
          const end = getNodeCenter(edge.to);

          const { x1, y1, x2, y2 } = getEdgeEndpoints(start, end);
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          return (
            <g key={i}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#FF6600"
                strokeWidth="1.5"
                strokeDasharray={edge.dashed ? '4 4' : undefined}
                markerEnd="url(#arrow)"
              />
              {edge.label && (
                <g transform={`translate(${midX}, ${midY - 8})`}>
                  <rect
                    x={-40}
                    y={-10}
                    width={80}
                    height={16}
                    fill="#FAF9F5"
                    rx={2}
                    stroke="var(--border)"
                    strokeWidth="0.8"
                  />
                  <text
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {edge.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Draw Nodes */}
        {nodes.map((node) => {
          const colors = NODE_COLORS[node.type || 'default'] || NODE_COLORS.default;
          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              {/* Card box */}
              <rect
                width="160"
                height="48"
                rx="6"
                fill={colors.bg}
                stroke={colors.border}
                strokeWidth="1.5"
              />
              {/* Type indicator dot */}
              <circle
                cx="16"
                cy="24"
                r="4.5"
                fill={colors.dot}
              />
              {/* Label */}
              <text
                x="32"
                y="28"
                fill={colors.text}
                fontSize="11"
                fontFamily="sans-serif"
                fontWeight="700"
              >
                {node.label}
              </text>
              {/* Type sub-tag */}
              <text
                x="32"
                y="40"
                fill="var(--text-muted)"
                fontSize="9"
                fontFamily="monospace"
              >
                {(node.type || 'NODE').toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
