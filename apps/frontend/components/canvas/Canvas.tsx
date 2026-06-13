/**
 * apps/frontend/components/canvas/Canvas.tsx
 *
 * Main canvas surface for the Build architecture diagram editor.
 * Renders nodes and edges with drag-and-drop, selection, and pan/zoom.
 *
 * Uses a lightweight custom canvas implementation (no React Flow dependency).
 * Each node is positioned absolutely and rendered by its type component.
 * Edges are rendered as SVG paths between source/target nodes.
 *
 * CHANGE: Implemented from stub — full interactive canvas with
 *          node dragging, edge rendering, selection, and pan/zoom.
 */

'use client';

import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useCanvasStore, type CanvasNode, type CanvasEdge } from '../../features/canvas/useCanvasStore';
import { NodeType } from '@sd-os/shared';
import { cn } from '@sd-os/ui';
import { Plus } from 'lucide-react';

import { ApiGatewayNode } from './nodes/ApiGatewayNode';
import { LoadBalancerNode } from './nodes/LoadBalancerNode';
import { WebServerNode } from './nodes/WebServerNode';
import { DatabaseSqlNode } from './nodes/DatabaseSqlNode';
import { DatabaseNoSqlNode } from './nodes/DatabaseNoSqlNode';
import { CacheNode } from './nodes/CacheNode';
import { QueueNode } from './nodes/QueueNode';
import { CdnNode } from './nodes/CdnNode';
import { ObjectStorageNode } from './nodes/ObjectStorageNode';
import { DnsNode } from './nodes/DnsNode';
import { MicroserviceNode } from './nodes/MicroserviceNode';
import { AuthServiceNode } from './nodes/AuthServiceNode';
import { NotificationServiceNode } from './nodes/NotificationServiceNode';
import { SearchEngineNode } from './nodes/SearchEngineNode';
import { ClientNode } from './nodes/ClientNode';

const NODE_RENDERERS: Record<string, React.FC<any>> = {
  [NodeType.API_GATEWAY]: ApiGatewayNode,
  [NodeType.LOAD_BALANCER]: LoadBalancerNode,
  [NodeType.WEB_SERVER]: WebServerNode,
  [NodeType.DATABASE_SQL]: DatabaseSqlNode,
  [NodeType.DATABASE_NOSQL]: DatabaseNoSqlNode,
  [NodeType.CACHE]: CacheNode,
  [NodeType.QUEUE]: QueueNode,
  [NodeType.CDN]: CdnNode,
  [NodeType.OBJECT_STORAGE]: ObjectStorageNode,
  [NodeType.DNS]: DnsNode,
  [NodeType.MICROSERVICE]: MicroserviceNode,
  [NodeType.AUTH_SERVICE]: AuthServiceNode,
  [NodeType.NOTIFICATION_SERVICE]: NotificationServiceNode,
  [NodeType.SEARCH_ENGINE]: SearchEngineNode,
  [NodeType.CLIENT]: ClientNode,
};

export function Canvas() {
  const { nodes, edges, setNodes, setEdges } = useCanvasStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent, nodeId?: string) => {
      if (!nodeId) {
        // Background pan
        setIsPanning(true);
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        return;
      }
      // Node drag
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      setDragging(nodeId);
      dragOffset.current = {
        x: e.clientX / zoom - node.position.x,
        y: e.clientY / zoom - node.position.y,
      };
      // Select node
      setNodes(nodes.map((n) => ({ ...n, selected: n.id === nodeId })));
    },
    [nodes, pan, zoom, setNodes],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent) => {
      if (isPanning) {
        setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
        return;
      }
      if (dragging) {
        const newX = (e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom - dragOffset.current.x;
        const newY = (e.clientY - e.currentTarget.getBoundingClientRect().top) / zoom - dragOffset.current.y;
        setNodes(
          nodes.map((n) =>
            n.id === dragging ? { ...n, position: { x: newX, y: newY } } : n,
          ),
        );
      }
    },
    [isPanning, dragging, nodes, zoom, setNodes],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDragging(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.25, Math.min(2, prev - e.deltaY * 0.001)));
  }, []);

  const handleBgClick = useCallback(() => {
    setNodes(nodes.map((n) => ({ ...n, selected: false })));
  }, [nodes, setNodes]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)]"
      style={{ backgroundSize: `${20 * zoom}px ${20 * zoom}px`, cursor: isPanning ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div
        className="absolute inset-0"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        {/* Edge layer */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          {edges.map((edge) => (
            <EdgeLine key={edge.id} edge={edge} nodes={nodes} />
          ))}
        </svg>

        {/* Node layer */}
        {nodes.map((node) => {
          const Renderer = NODE_RENDERERS[node.type];
          return (
            <div
              key={node.id}
              className={cn(
                'absolute cursor-grab',
                dragging === node.id && 'cursor-grabbing z-50',
                node.selected && 'z-40',
              )}
              style={{ left: node.position.x, top: node.position.y }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, node.id);
              }}
            >
              {Renderer ? (
                <Renderer selected={node.selected} />
              ) : (
                <div className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
                  {node.type}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <button
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
          className="rounded-md px-2 py-0.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          −
        </button>
        <span className="min-w-[40px] text-center text-xs text-slate-500">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          className="rounded-md px-2 py-0.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Renders an SVG path line between source and target node centers.
 */
function EdgeLine({ edge, nodes }: { edge: CanvasEdge; nodes: CanvasNode[] }) {
  const source = nodes.find((n) => n.id === edge.source);
  const target = nodes.find((n) => n.id === edge.target);
  if (!source || !target) return null;

  const sx = source.position.x + 60;
  const sy = source.position.y + 40;
  const tx = target.position.x + 60;
  const ty = target.position.y + 40;
  const midX = (sx + tx) / 2;

  const d = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;

  return (
    <g>
      <path
        d={d}
        className={cn(
          'fill-none stroke-2 transition-colors',
          edge.animated ? 'stroke-blue-400' : 'stroke-slate-400',
        )}
        strokeDasharray={edge.animated ? '6 4' : undefined}
        markerEnd="url(#edge-arrow)"
      />
      {edge.label && (
        <g>
          <rect
            x={midX - (edge.label.length * 8 + 16) / 2}
            y={(sy + ty) / 2 - 10}
            width={edge.label.length * 8 + 16}
            height={20}
            rx={4}
            className="fill-white stroke-slate-200"
          />
          <text
            x={midX}
            y={(sy + ty) / 2 + 4}
            textAnchor="middle"
            className="fill-slate-600 text-[10px] font-medium"
          >
            {edge.label}
          </text>
        </g>
      )}
    </g>
  );
}
