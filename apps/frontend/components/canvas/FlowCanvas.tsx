'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  SelectionMode,
  ReactFlowProvider,
  useReactFlow,
  useOnViewportChange,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import NodeWithHandles from './nodes/NodeWithHandles';
import NoteNode from './nodes/NoteNode';
import GroupNode from './nodes/GroupNode';
import FlowEdge from './edges/FlowEdge';
import { CanvasControls } from './panels/CanvasControls';
import { ContextMenu } from './panels/ContextMenu';
import { useAutoLayout } from '@/features/canvas/useAutoLayout';
import { useCanvasStore } from '@/features/canvas/useCanvasStore';

const nodeTypes: NodeTypes = { architectureNode: NodeWithHandles, noteNode: NoteNode, groupNode: GroupNode };
const edgeTypes: EdgeTypes = { architectureEdge: FlowEdge };

interface FlowCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onAddEdge: (edge: Edge) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onRenameNode: (nodeId: string) => void;
  onEditLabel: (nodeId: string, label: string) => void;
  onEdgeLabelChange: (edgeId: string, label: string) => void;
  onExportImage?: (dataUrl: string) => void;
  onAddStickyNote?: () => void;
  isRightPanelOpen?: boolean;
  simulation?: {
    isRunning: boolean;
    currentMetrics: any;
    failedNodes: string[];
    nodeChaosModes?: Record<string, string>;
  };
}

function FlowCanvasInner({
  initialNodes: externalNodes,
  initialEdges: externalEdges,
  onNodesChange,
  onEdgesChange,
  onAddEdge,
  onDeleteNode,
  onDuplicateNode,
  onRenameNode,
  onEditLabel,
  onEdgeLabelChange,
  onExportImage,
  isRightPanelOpen,
  simulation,
}: FlowCanvasProps) {
  const reactFlowInstance = useReactFlow();
  const { layout } = useAutoLayout();
  const [nodes, setNodes, onNodesChangeRF] = useNodesState(externalNodes);
  const [edges, setEdges, onEdgesChangeRF] = useEdgesState(externalEdges);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const syncVersionRef = useRef(0);

  useEffect(() => {
    syncVersionRef.current++;
    const timer = setTimeout(() => {
      setNodes(externalNodes);
      setEdges(externalEdges);
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalNodes.length, externalEdges.length, externalNodes, externalEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) return;
      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'architectureEdge',
        data: { label: 'HTTP' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#FF6600', width: 20, height: 20 },
        animated: true,
      };
      onAddEdge(newEdge);
    },
    [onAddEdge]
  );

  const isValidConnection = useCallback(
    (connection: any) => {
      if (connection.source === connection.target) return false;
      const sourceNode = nodes.find((n: Node) => n.id === connection.source);
      const targetNode = nodes.find((n: Node) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;
      return true;
    },
    [nodes]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeRF(changes);
      const nextNodes = applyNodeChanges(changes, nodes);
      const hasPositionChange = changes.some(c => c.type === 'position' && c.dragging === false);
      const hasSelectionChange = changes.some(c => c.type === 'select');
      if (hasPositionChange || hasSelectionChange) {
        onNodesChange(nextNodes);
      }
    },
    [nodes, onNodesChangeRF, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeRF(changes);
      const nextEdges = applyEdgeChanges(changes, edges);
      const hasSelectionChange = changes.some(c => c.type === 'select');
      if (hasSelectionChange) {
        onEdgesChange(nextEdges);
      }
    },
    [edges, onEdgesChangeRF, onEdgesChange]
  );

  const onNodeDragStop = useCallback(
    (_event: any, node: Node) => {
      const updated = nodes.map((n) => (n.id === node.id ? node : n));
      onNodesChange(updated);
    },
    [nodes, onNodesChange]
  );

  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((n) => onDeleteNode(n.id));
    },
    [onDeleteNode]
  );

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  const onPaneClick = useCallback(() => setContextMenu(null), []);

  const handleZoomIn = useCallback(() => reactFlowInstance.zoomIn(), [reactFlowInstance]);
  const handleZoomOut = useCallback(() => reactFlowInstance.zoomOut(), [reactFlowInstance]);
  const handleFitView = useCallback(() => reactFlowInstance.fitView({ padding: 0.15 }), [reactFlowInstance]);
  const handleReset = useCallback(() => reactFlowInstance.zoomTo(1), [reactFlowInstance]);
  useOnViewportChange({ onChange: (vp) => setZoom(vp.zoom) });

  const handleAutoLayoutHorizontal = useCallback(() => {
    const layouted = layout(nodes, edges, 'LR');
    setNodes(layouted);
    onNodesChange(layouted);
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.3 }), 100);
  }, [nodes, edges, layout, onNodesChange, reactFlowInstance]);

  const handleAutoLayoutVertical = useCallback(() => {
    const layouted = layout(nodes, edges, 'TB');
    setNodes(layouted);
    onNodesChange(layouted);
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.3 }), 100);
  }, [nodes, edges, layout, onNodesChange, reactFlowInstance]);

  const handleExport = useCallback(async () => {
    try {
      const container = document.querySelector('.react-flow') as HTMLElement;
      if (!container) return;
      const dataUrl = await toPng(container, { backgroundColor: '#FCF9F2', pixelRatio: 2 });
      if (onExportImage) {
        onExportImage(dataUrl);
      } else {
        const link = document.createElement('a');
        link.download = `architecture-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Export failed', err);
    }
  }, [onExportImage]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('canvas-undo'));
      }
      if ((ctrl && e.key === 'z' && e.shiftKey) || (ctrl && e.key === 'y')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('canvas-redo'));
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const selected = nodes.filter((n) => n.selected);
        const currentIdx = selected.length === 1 ? nodes.findIndex((n) => n.id === selected[0].id) : -1;
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + nodes.length) % nodes.length
          : (currentIdx + 1) % nodes.length;
        const nextNode = nodes[nextIdx];
        if (nextNode) {
          setNodes((nds) =>
            nds.map((n) => ({ ...n, selected: n.id === nextNode.id }))
          );
          reactFlowInstance.setCenter(nextNode.position!.x + 100, nextNode.position!.y + 50, { zoom: 1, duration: 200 });
        }
        return;
      }

      const selectedNodes = nodes.filter((n) => n.selected);
      if (selectedNodes.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 5;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const updatedNodes = nodes.map((n) =>
          n.selected
            ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
            : n
        );
        setNodes(updatedNodes);
        onNodesChange(updatedNodes);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, setNodes, reactFlowInstance, onNodesChange]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <ReactFlow
        nodes={nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            metrics: simulation?.currentMetrics?.nodes?.find((m: any) => m.id === n.id) || n.data?.metrics,
            chaosMode: simulation?.nodeChaosModes?.[n.id] || null,
            onEditLabel,
          },
        }))}
        edges={edges.map((e) => ({
          ...e,
          data: {
            ...e.data,
            isSimulating: simulation?.isRunning,
            errorRate: simulation?.currentMetrics?.nodes?.find((m: any) => m.id === e.source)?.errorRate,
            qps: simulation?.currentMetrics?.nodes?.find((m: any) => m.id === e.source)?.qps || 0,
            onLabelChange: onEdgeLabelChange,
          },
        }))}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        panOnDrag={!isLocked}
        nodesDraggable={!isLocked}
        zoomOnScroll={!isLocked}
        zoomOnPinch={!isLocked}
        fitView
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          type: 'architectureEdge',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#FF6600', width: 20, height: 20 },
          animated: true,
        }}
        deleteKeyCode={isLocked ? [] : ['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        snapToGrid={showGrid}
        snapGrid={[20, 20]}
        colorMode="light"
        proOptions={{ hideAttribution: true }}
      >
        {showGrid && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.5}
            color="#E5E2D9"
          />
        )}
        {showMiniMap && (
          <MiniMap
            nodeStrokeColor="#FF6600"
            nodeColor={(node) => {
              const type = node.data?.nodeType as string;
              const colors: Record<string, string> = {
                LOAD_BALANCER: '#93C5FD', CDN: '#A5B4FC', CACHE: '#FDA4AF',
                DATABASE_SQL: '#86EFAC', DATABASE_NOSQL: '#86EFAC',
                QUEUE: '#FCD34D', API_GATEWAY: '#C4B5FD',
                WEB_SERVER: '#BAE6FD', CLIENT: '#CBD5E1',
                RATE_LIMITER: '#FDBA74', WAF: '#FDBA74',
              };
              return colors[type] || '#CBD5E1';
            }}
            maskColor="rgba(0,0,0,0.08)"
            style={{ border: '1px solid #E5E2D9', borderRadius: 8 }}
          />
        )}
      </ReactFlow>

      <CanvasControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onReset={handleReset}
        showMiniMap={showMiniMap}
        onToggleMiniMap={() => setShowMiniMap((v) => !v)}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((v) => !v)}
        isLocked={isLocked}
        onToggleLock={() => setIsLocked((v) => !v)}
        isRightPanelOpen={isRightPanelOpen}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
          onDuplicate={onDuplicateNode}
          onDelete={onDeleteNode}
          onRename={onRenameNode}
        />
      )}

    </div>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
