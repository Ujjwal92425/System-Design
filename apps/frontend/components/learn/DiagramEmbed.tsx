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

  // Node Type Styling map
  const NODE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    client:   { bg: 'rgba(54,120,255,0.06)', border: '#2A3A58', text: '#E2E8F0', dot: '#3680FF' },
    dns:      { bg: 'rgba(77,255,127,0.06)', border: '#2A3A58', text: '#E2E8F0', dot: '#4DFF7F' },
    lb:       { bg: 'rgba(232,160,69,0.06)', border: '#2A3A58', text: '#E2E8F0', dot: '#E8A045' },
    web:      { bg: 'rgba(54,120,255,0.06)', border: '#2A3A58', text: '#E2E8F0', dot: '#3680FF' },
    app:      { bg: 'rgba(54,120,255,0.06)', border: '#2A3A58', text: '#E2E8F0', dot: '#3680FF' },
    cache:    { bg: 'rgba(232,160,69,0.06)', border: '#2A3A58', text: '#E2E8F0', dot: '#E8A045' },
    db:       { bg: 'rgba(77,255,127,0.06)', border: '#2A3A58', text: '#E2E8F0', dot: '#4DFF7F' },
    queue:    { bg: 'rgba(232,160,69,0.06)', border: '#2A3A58', text: '#E2E8F0', dot: '#E8A045' },
    worker:   { bg: 'rgba(54,120,255,0.06)', border: '#2A3A58', text: '#E2E8F0', dot: '#3680FF' },
    storage:  { bg: 'rgba(77,255,127,0.06)', border: '#2A3A58', text: '#E2E8F0', dot: '#4DFF7F' },
  };

  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 80, y: node.y + 24 }; // Offset to middle of 160x48 node box
  };

  return (
    <div style={{
      background: '#080B14',
      border: '1px solid #1E2A42',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      margin: '24px 0'
    }}>
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        fontSize: '10px',
        color: '#4F5E7B',
        fontWeight: 600,
        letterSpacing: '0.05em'
      }} className="mono">
        ARCHITECTURE GRAPH
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
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#1E2A42" />
          </marker>
        </defs>

        {/* Draw Edges */}
        {edges.map((edge, i) => {
          const start = getNodeCenter(edge.from);
          const end = getNodeCenter(edge.to);

          // Calculate point on node boundaries to avoid overlap with arrow markers
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) return null;

          const ux = dx / len;
          const uy = dy / len;

          // Border offsets (node box is 160x48)
          const offsetStart = 30;
          const offsetEnd = 85; 

          const x1 = start.x + ux * offsetStart;
          const y1 = start.y + uy * offsetStart;
          const x2 = end.x - ux * offsetEnd;
          const y2 = end.y - uy * offsetEnd;

          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          return (
            <g key={i}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#1E2A42"
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
                    fill="#080B14"
                    rx={2}
                  />
                  <text
                    textAnchor="middle"
                    fill="#4F5E7B"
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
          const colors = NODE_COLORS[node.type || 'app'] || NODE_COLORS.app;
          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              {/* Card box */}
              <rect
                width="160"
                height="48"
                rx="6"
                fill={colors.bg}
                stroke={colors.border}
                strokeWidth="1.2"
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
                fontSize="12"
                fontFamily="sans-serif"
                fontWeight="500"
              >
                {node.label}
              </text>
              {/* Type sub-tag */}
              <text
                x="32"
                y="40"
                fill="#4F5E7B"
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
