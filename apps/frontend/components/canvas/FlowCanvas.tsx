'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
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
import FlowEdge from './edges/FlowEdge';
import { CanvasControls } from './panels/CanvasControls';
import { ContextMenu } from './panels/ContextMenu';
import { useAutoLayout } from '@/features/canvas/useAutoLayout';

const nodeTypes: NodeTypes = { architectureNode: NodeWithHandles, noteNode: NoteNode };
const edgeTypes: EdgeTypes = { architectureEdge: FlowEdge };

const PROTOCOL_LABELS = ['HTTP', 'HTTPS', 'gRPC', 'TCP', 'UDP', 'Kafka', 'Redis', 'WebSocket'];

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
  simulation?: {
    isRunning: boolean;
    currentMetrics: any;
    failedNodes: string[];
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
  simulation,
}: FlowCanvasProps) {
  const reactFlowInstance = useReactFlow();
  const { layout } = useAutoLayout();
  const [nodes, setNodes, onNodesChangeRF] = useNodesState(externalNodes);
  const [edges, setEdges, onEdgesChangeRF] = useEdgesState(externalEdges);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);
  const [zoom, setZoom] = useState(1);
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

  const onEdgeClick = useCallback(
    (_event: any, edge: Edge) => {
      const currentLabel = String(edge.data?.label || 'HTTP');
      const idx = PROTOCOL_LABELS.indexOf(currentLabel);
      const nextLabel = PROTOCOL_LABELS[(idx + 1) % PROTOCOL_LABELS.length];
      onEdgeLabelChange(edge.id, nextLabel);
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edge.id ? { ...e, data: { ...e.data, label: nextLabel } } : e
        )
      );
    },
    [onEdgeLabelChange]
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
      const svgData = new XMLSerializer().serializeToString(
        container.querySelector('.react-flow__renderer') || container
      );
      const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      if (onExportImage) {
        onExportImage(dataUrl);
      } else {
        const link = document.createElement('a');
        link.download = `architecture-${Date.now()}.svg`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Export failed', err);
    }
  }, [onExportImage]);

  useEffect(() => {
    (window as any).__canvasAutoLayoutH = handleAutoLayoutHorizontal;
    (window as any).__canvasAutoLayoutV = handleAutoLayoutVertical;
    (window as any).__canvasExport = handleExport;
  }, [handleAutoLayoutHorizontal, handleAutoLayoutVertical, handleExport]);

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
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = nodes.filter((n) => n.selected);
        selected.forEach((n) => onDeleteNode(n.id));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, onDeleteNode]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            metrics: simulation?.currentMetrics?.nodes?.find((m: any) => m.id === n.id) || n.data?.metrics,
            onEditLabel,
          },
        }))}
        edges={edges.map((e) => ({
          ...e,
          data: {
            ...e.data,
            isSimulating: simulation?.isRunning,
            errorRate: simulation?.currentMetrics?.nodes?.find((m: any) => m.id === e.source)?.errorRate,
            onLabelChange: onEdgeLabelChange,
          },
        }))}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgeClick={onEdgeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        fitView
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          type: 'architectureEdge',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#FF6600', width: 20, height: 20 },
          animated: true,
        }}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        snapToGrid
        snapGrid={[20, 20]}
        colorMode="light"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#E5E2D9"
        />
      </ReactFlow>

      <CanvasControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onReset={handleReset}
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
