'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import rough from 'roughjs';

interface DiagramNode {
  id: string;
  label: string;
  type?: string;
  x: number;
  y: number;
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

interface RoughDiagramProps {
  nodes?: DiagramNode[] | string;
  edges?: DiagramEdge[] | string;
  height?: number;
}

const NODE_COLORS: Record<string, { stroke: string; fill: string; dot: string; text: string }> = {
  client:   { stroke: '#6366f1', fill: '#eef2ff', dot: '#6366f1', text: '#3730a3' },
  dns:      { stroke: '#22c55e', fill: '#f0fdf4', dot: '#22c55e', text: '#15803d' },
  lb:       { stroke: '#f97316', fill: '#fff7ed', dot: '#f97316', text: '#c2410c' },
  cdn:      { stroke: '#0ea5e9', fill: '#f0f9ff', dot: '#0ea5e9', text: '#0369a1' },
  web:      { stroke: '#3b82f6', fill: '#eff6ff', dot: '#3b82f6', text: '#1d4ed8' },
  app:      { stroke: '#8b5cf6', fill: '#f5f3ff', dot: '#8b5cf6', text: '#6d28d9' },
  cache:    { stroke: '#f59e0b', fill: '#fffbeb', dot: '#f59e0b', text: '#b45309' },
  db:       { stroke: '#10b981', fill: '#ecfdf5', dot: '#10b981', text: '#047857' },
  queue:    { stroke: '#ec4899', fill: '#fdf2f8', dot: '#ec4899', text: '#be185d' },
  worker:   { stroke: '#64748b', fill: '#f8fafc', dot: '#64748b', text: '#334155' },
  storage:  { stroke: '#06b6d4', fill: '#ecfeff', dot: '#06b6d4', text: '#0e7490' },
  gateway:  { stroke: '#f97316', fill: '#fff7ed', dot: '#f97316', text: '#c2410c' },
  auth:     { stroke: '#ef4444', fill: '#fef2f2', dot: '#ef4444', text: '#b91c1c' },
  metrics:  { stroke: '#3b82f6', fill: '#eff6ff', dot: '#3b82f6', text: '#1d4ed8' },
  default:  { stroke: '#94a3b8', fill: '#f8fafc', dot: '#94a3b8', text: '#475569' },
};

function getNodeCenter(nodeId: string, nodes: DiagramNode[]) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return { x: 0, y: 0 };
  return { x: node.x + 80, y: node.y + 24 };
}

function getEdgeEndpoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
  nodeW = 160, nodeH = 48
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

export function RoughDiagram({ nodes: rawNodes = [], edges: rawEdges = [], height = 300 }: RoughDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const nodes: DiagramNode[] = typeof rawNodes === 'string' ? JSON.parse(rawNodes) : rawNodes;
  const edges: DiagramEdge[] = typeof rawEdges === 'string' ? JSON.parse(rawEdges) : rawEdges;

  const padding = 50;
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const minX = xs.length ? Math.min(...xs) - padding : 0;
  const maxX = xs.length ? Math.max(...xs) + padding : 800;
  const minY = ys.length ? Math.min(...ys) - padding : 0;
  const maxY = ys.length ? Math.max(...ys) + padding : height;
  const viewBox = `${minX} ${minY} ${Math.max(800, maxX - minX)} ${Math.max(height, maxY - minY)}`;

  const edgeEndpoints = useMemo(() => edges.map(edge => {
    const start = getNodeCenter(edge.from, nodes);
    const end = getNodeCenter(edge.to, nodes);
    const pts = getEdgeEndpoints(start, end);
    return { ...pts, label: edge.label, dashed: edge.dashed };
  }), [edges, nodes]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;

    svg.querySelectorAll('.rough-draw').forEach(el => el.remove());

    const rc = rough.svg(svg);

    edges.forEach((edge, i) => {
      const ep = edgeEndpoints[i];
      if (!ep) return;
      const { x1, y1, x2, y2 } = ep;

      const lineEl = rc.line(x1, y1, x2, y2, {
        stroke: '#FF6600',
        strokeWidth: 1.5,
        roughness: 0.8,
        bowing: 0.5,
        strokeLineDash: edge.dashed ? [6, 4] : undefined,
      });
      lineEl.classList.add('rough-draw');
      svg.appendChild(lineEl as SVGGraphicsElement);

      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const size = 10;
      const a1 = angle + Math.PI * 0.85;
      const a2 = angle - Math.PI * 0.85;
      const p1x = x2 + size * Math.cos(a1);
      const p1y = y2 + size * Math.sin(a1);
      const p2x = x2 + size * Math.cos(a2);
      const p2y = y2 + size * Math.sin(a2);
      const arrowEl = rc.linearPath([
        [x2, y2], [p1x, p1y],
        [x2, y2], [p2x, p2y],
      ], {
        stroke: '#FF6600',
        strokeWidth: 1.5,
        roughness: 0.8,
        bowing: 0.5,
      });
      arrowEl.classList.add('rough-draw');
      svg.appendChild(arrowEl as SVGGraphicsElement);

      // Edge label bg
      if (edge.label) {
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const labelBg = rc.rectangle(midX - 42, midY - 11, 84, 18, {
          fill: '#FAF9F5',
          stroke: '#d0cbbf',
          strokeWidth: 0.8,
          roughness: 0.6,
          fillStyle: 'solid',
        });
        labelBg.classList.add('rough-draw');
        svg.appendChild(labelBg as SVGGraphicsElement);

        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', String(midX));
        txt.setAttribute('y', String(midY + 3));
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('fill', 'var(--text-muted)');
        txt.setAttribute('font-size', '9');
        txt.setAttribute('font-family', 'monospace');
        txt.textContent = edge.label;
        txt.classList.add('rough-draw');
        svg.appendChild(txt);
      }
    });

    nodes.forEach((node) => {
      const colors = NODE_COLORS[node.type || 'default'] || NODE_COLORS.default;

      const rectEl = rc.rectangle(node.x, node.y, 160, 48, {
        fill: colors.fill,
        fillStyle: 'solid',
        stroke: colors.stroke,
        strokeWidth: 1.5,
        roughness: 1.2,
        bowing: 1.5,
      });
      rectEl.classList.add('rough-draw');
      svg.appendChild(rectEl as SVGGraphicsElement);

      // Rough dot
      const dot = rc.circle(node.x + 16, node.y + 24, 7, {
        fill: colors.dot,
        fillStyle: 'solid',
        stroke: colors.dot,
        strokeWidth: 0.5,
        roughness: 1.5,
      });
      dot.classList.add('rough-draw');
      svg.appendChild(dot as SVGGraphicsElement);

      // Node label text
      const labelTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelTxt.setAttribute('x', String(node.x + 32));
      labelTxt.setAttribute('y', String(node.y + 20));
      labelTxt.setAttribute('fill', colors.text);
      labelTxt.setAttribute('font-size', '11');
      labelTxt.setAttribute('font-weight', '700');
      labelTxt.setAttribute('font-family', 'sans-serif');
      labelTxt.textContent = node.label;
      labelTxt.classList.add('rough-draw');
      svg.appendChild(labelTxt);

      // Type sub-tag
      const typeTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      typeTxt.setAttribute('x', String(node.x + 32));
      typeTxt.setAttribute('y', String(node.y + 34));
      typeTxt.setAttribute('fill', 'var(--text-muted)');
      typeTxt.setAttribute('font-size', '9');
      typeTxt.setAttribute('font-family', 'monospace');
      typeTxt.textContent = (node.type || 'NODE').toUpperCase();
      typeTxt.classList.add('rough-draw');
      svg.appendChild(typeTxt);
    });
  }, [nodes, edges, edgeEndpoints]);

  return (
    <div style={{
      background: '#FAF9F5',
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
        letterSpacing: '0.08em',
        zIndex: 1,
      }} className="mono animate-pulse-edge">
        SYSTEM TOPOLOGY GRAPH
      </div>

      <svg
        ref={svgRef}
        viewBox={viewBox}
        style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '500px' }}
      >
        <defs>
          <marker id="arrow-rough" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#FF6600" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
