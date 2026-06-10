'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCanvasStore, CanvasNode, CanvasEdge } from '@/features/canvas/useCanvasStore';
import { useAutoSave } from '@/features/canvas/useAutoSave';
import { NodeType } from '@sd-os/shared';
import {
  ChevronLeft, Play, Save, RotateCcw, Copy, Trash, Check,
  Share2, Eye, Shield, Globe, Lock, ShieldAlert, Cpu, Bell,
  Search, ShieldCheck, HardDrive, Activity, Zap, Database,
  Server, Key, ArrowUpDown, Laptop, Globe2, Network, Loader2,
  Clock, AlertCircle, Info, Sliders, Settings
} from 'lucide-react';

// ── Node Icon Selector ────────────────────────────────────────────────────────
const getNodeIcon = (type: string) => {
  switch (type) {
    case NodeType.CLIENT:
      return <Laptop style={{ width: '18px', height: '18px' }} />;
    case NodeType.DNS:
      return <Globe style={{ width: '18px', height: '18px' }} />;
    case NodeType.CDN:
      return <Network style={{ width: '18px', height: '18px' }} />;
    case NodeType.LOAD_BALANCER:
      return <ArrowUpDown style={{ width: '18px', height: '18px' }} />;
    case NodeType.API_GATEWAY:
      return <Key style={{ width: '18px', height: '18px' }} />;
    case NodeType.WEB_SERVER:
      return <Server style={{ width: '18px', height: '18px' }} />;
    case NodeType.DATABASE_SQL:
    case NodeType.DATABASE_NOSQL:
      return <Database style={{ width: '18px', height: '18px' }} />;
    case NodeType.CACHE:
      return <Zap style={{ width: '18px', height: '18px' }} />;
    case NodeType.QUEUE:
      return <Activity style={{ width: '18px', height: '18px' }} />;
    case NodeType.OBJECT_STORAGE:
      return <HardDrive style={{ width: '18px', height: '18px' }} />;
    case NodeType.SEARCH_ENGINE:
      return <Search style={{ width: '18px', height: '18px' }} />;
    case NodeType.AUTH_SERVICE:
      return <ShieldCheck style={{ width: '18px', height: '18px' }} />;
    case NodeType.NOTIFICATION_SERVICE:
      return <Bell style={{ width: '18px', height: '18px' }} />;
    case NodeType.MICROSERVICE:
      return <Cpu style={{ width: '18px', height: '18px' }} />;
    default:
      return <Server style={{ width: '18px', height: '18px' }} />;
  }
};

// ── Node Type Display Names ───────────────────────────────────────────────────
const getNodeName = (type: string) => {
  return type.toLowerCase().replace(/_/g, ' ');
};

export default function CanvasWorkspace({ params }: { params: Promise<{ designId: string }> }) {
  const { designId } = use(params);
  const router = useRouter();

  // Zustand Store values
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const init = useCanvasStore((state) => state.init);
  const setNodes = useCanvasStore((state) => state.setNodes);
  const setEdges = useCanvasStore((state) => state.setEdges);
  const addNode = useCanvasStore((state) => state.addNode);
  const deleteSelected = useCanvasStore((state) => state.deleteSelected);
  const duplicateSelected = useCanvasStore((state) => state.duplicateSelected);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const dirty = useCanvasStore((state) => state.dirty);
  const lastSavedAt = useCanvasStore((state) => state.lastSavedAt);
  const markSaved = useCanvasStore((state) => state.markSaved);

  // Component UI State
  const [designMeta, setDesignMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connection mode state
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null);

  // Active panel (inspector vs versions vs config)
  const [activeRightTab, setActiveRightTab] = useState<'inspector' | 'versions'>('inspector');

  // Manual save status
  const [saving, setSaving] = useState(false);

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelected, duplicateSelected]);

  // Load Design Meta & Content
  const loadDesign = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/designs/${designId}`);
      const design = res.data.data;
      setDesignMeta(design);
      
      const canvasData = design.canvas || { nodes: [], edges: [] };
      const loadedNodes = Array.isArray(canvasData.nodes) ? canvasData.nodes : [];
      const loadedEdges = Array.isArray(canvasData.edges) ? canvasData.edges : [];
      init(loadedNodes, loadedEdges);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDesign();
  }, [designId]);

  // Initialize auto-save
  useAutoSave(designId);

  // Selected node
  const selectedNode = nodes.find(n => n.selected);

  // Manual save
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/designs/${designId}/save`, {
        nodes,
        edges,
        message: 'Manual workspace save',
      });
      markSaved();
      
      // Update history list in meta
      const metaRes = await api.get(`/designs/${designId}`);
      setDesignMeta(metaRes.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Visibility
  const toggleVisibility = async () => {
    if (!designMeta) return;
    const nextPublic = !designMeta.isPublic;
    try {
      await api.patch(`/designs/${designId}`, { isPublic: nextPublic });
      setDesignMeta((prev: any) => ({ ...prev, isPublic: nextPublic }));
    } catch (err: any) {
      alert('Failed to update workspace settings');
    }
  };

  // Node Drag Handlers
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    if (connectionSourceId) return; // ignore drag while connecting
    e.stopPropagation();

    // Select this node, unselect others
    setNodes(nodes.map(n => ({
      ...n,
      selected: n.id === nodeId,
    })));

    const node = nodes.find(n => n.id === nodeId);
    if (!node || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    dragOffsetRef.current = {
      x: mouseX - node.position.x,
      y: mouseY - node.position.y,
    };

    setDraggingNodeId(nodeId);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = Math.round((mouseX - dragOffsetRef.current.x) / 10) * 10; // 10px grid snapping
    const newY = Math.round((mouseY - dragOffsetRef.current.y) / 10) * 10;

    setNodes(nodes.map(n => {
      if (n.id === draggingNodeId) {
        return { ...n, position: { x: Math.max(0, newX), y: Math.max(0, newY) } };
      }
      return n;
    }));
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Click background to clear selection or cancel connection
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.target === canvasRef.current?.firstChild) {
      setNodes(nodes.map(n => ({ ...n, selected: false })));
      setConnectionSourceId(null);
    }
  };

  // Create node helper
  const handleAddNodeType = (type: NodeType) => {
    const defaultLabel = `${type.toLowerCase().replace(/_/g, ' ')} ${nodes.length + 1}`;
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x: 100, y: 150 },
      data: {
        label: defaultLabel,
        qps: 1000,
        latency: 10,
        cpu: 10,
        memory: 128
      },
      selected: true
    };

    // Deselect existing
    const updatedNodes: CanvasNode[] = [...nodes.map(n => ({ ...n, selected: false })), newNode];
    setNodes(updatedNodes);
  };

  // Connection setup
  const handleNodeConnectClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!connectionSourceId) {
      setConnectionSourceId(nodeId);
    } else {
      if (connectionSourceId === nodeId) {
        setConnectionSourceId(null);
        return;
      }
      // Create edge
      const newEdge: CanvasEdge = {
        id: `edge-${connectionSourceId}-${nodeId}`,
        source: connectionSourceId,
        target: nodeId,
        label: 'HTTP',
        animated: false
      };
      setEdges([...edges, newEdge]);
      setConnectionSourceId(null);
    }
  };

  // Remove individual edge
  const handleDeleteEdge = (edgeId: string) => {
    setEdges(edges.filter(e => e.id !== edgeId));
  };

  // Selected node info updates
  const handleSelectedNodeDataChange = (field: string, value: any) => {
    if (!selectedNode) return;
    setNodes(nodes.map(n => {
      if (n.id === selectedNode.id) {
        return {
          ...n,
          data: {
            ...n.data,
            [field]: value
          }
        };
      }
      return n;
    }));
  };

  // Restore specific historical version
  const handleRestoreVersion = async (vNum: number) => {
    if (!confirm(`Are you sure you want to restore to version v${vNum}? This creates a new version history checkpoint.`)) return;
    try {
      setLoading(true);
      await api.post(`/designs/${designId}/restore`, { version: vNum });
      await loadDesign();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Restore failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <Loader2 style={{ width: '36px', height: '36px', color: 'var(--accent-amber)' }} className="animate-spin" />
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }} className="mono">LOADING CANVAS ENVIRONMENT...</p>
        </div>
      </div>
    );
  }

  if (error || !designMeta) {
    return (
      <div style={{ padding: '60px 40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <AlertCircle style={{ width: '48px', height: '48px', color: '#F87171' }} />
        <h2 className="bricolage" style={{ fontSize: '22px', color: 'var(--text-primary)', margin: 0 }}>Workspace Error</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>{error || 'Failed to launch design studio.'}</p>
        <button onClick={() => router.push('/build')} style={{ padding: '10px 20px', background: 'var(--accent-amber)', color: '#080B14', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg-base)' }}>
      
      {/* ── Sub-header / Toolbar Row ────────────────────────────────────────── */}
      <div style={{
        height: '56px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'var(--bg-surface)',
        flexShrink: 0
      }}>
        
        {/* Left info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => router.push('/build')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '6px',
              transition: 'color 150ms ease'
            }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ChevronLeft style={{ width: '20px', height: '20px' }} />
          </button>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="bricolage" style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
                {designMeta.title}
              </h2>
              <span className="mono" style={{ fontSize: '9px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                {dirty ? 'UNSAVED' : 'SAVED'}
              </span>
            </div>
            {lastSavedAt && (
              <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }} className="mono">
                Last auto-saved: {new Date(lastSavedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Public / Private toggle button */}
          <button
            onClick={toggleVisibility}
            className="mono"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px 12px',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'border-color 150ms'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {designMeta.isPublic ? (
              <>
                <Globe style={{ width: '13px', height: '13px', color: 'var(--accent-green)' }} />
                <span>Public Share Link Active</span>
              </>
            ) : (
              <>
                <Lock style={{ width: '13px', height: '13px' }} />
                <span>Private Canvas</span>
              </>
            )}
          </button>

          {/* Undo/Redo */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              onClick={undo}
              style={{ padding: '6px 10px', background: 'transparent', border: 'none', borderRight: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw style={{ width: '14px', height: '14px', transform: 'scaleX(-1)' }} />
            </button>
            <button
              onClick={redo}
              style={{ padding: '6px 10px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              title="Redo (Ctrl+Shift+Z)"
            >
              <RotateCcw style={{ width: '14px', height: '14px' }} />
            </button>
          </div>

          {/* Save & Run */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '7px 14px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {saving ? <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" /> : <Save style={{ width: '14px', height: '14px' }} />}
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

        </div>
      </div>

      {/* ── Main Studio Grid ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Side: Component Library */}
        <aside style={{
          width: '260px',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflowY: 'auto',
          padding: '24px 18px',
          gap: '20px'
        }}>
          <div>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Component Library
            </span>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Click to deploy elements onto the architectural grid.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.values(NodeType).map((type) => (
              <button
                key={type}
                onClick={() => handleAddNodeType(type as NodeType)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 120ms ease'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = 'var(--border-bright)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <div style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center' }}>
                  {getNodeIcon(type)}
                </div>
                <span className="mono" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>
                  {getNodeName(type)}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Center: Canvas Workspace Area */}
        <div
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={handleCanvasClick}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: draggingNodeId ? 'grabbing' : 'default',
            // Visual grid pattern
            backgroundColor: '#080B14',
            backgroundImage: `
              linear-gradient(to right, rgba(30, 42, 66, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(30, 42, 66, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        >
          {/* Instruction notification if connecting */}
          {connectionSourceId && (
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(232, 160, 69, 0.95)',
              color: '#080B14',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 50,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <Info style={{ width: '13px', height: '13px' }} />
              <span>Click another node to draw connection, or click canvas to cancel</span>
            </div>
          )}

          {/* SVG Overlay for Connections */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-bright)" />
              </marker>
            </defs>
            {edges.map(e => {
              const sourceNode = nodes.find(n => n.id === e.source);
              const targetNode = nodes.find(n => n.id === e.target);
              if (!sourceNode || !targetNode) return null;

              // Compute centers
              const x1 = sourceNode.position.x + 70;
              const y1 = sourceNode.position.y + 40;
              const x2 = targetNode.position.x + 70;
              const y2 = targetNode.position.y + 40;

              return (
                <g key={e.id}>
                  {/* Glowing background line */}
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="rgba(232, 160, 69, 0.05)"
                    strokeWidth="6"
                  />
                  {/* Connector line */}
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="var(--border-bright)"
                    strokeWidth="1.5"
                    markerEnd="url(#arrow)"
                  />
                </g>
              );
            })}
          </svg>

          {/* Render Nodes */}
          {nodes.map(node => {
            const isSelected = node.selected;
            const isConnectingSource = connectionSourceId === node.id;
            
            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                style={{
                  position: 'absolute',
                  left: `${node.position.x}px`,
                  top: `${node.position.y}px`,
                  width: '140px',
                  background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                  border: isSelected 
                    ? '1.5px solid var(--accent-amber)' 
                    : isConnectingSource 
                      ? '1.5px solid var(--accent-blue)' 
                      : '1px solid var(--border)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: draggingNodeId === node.id ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  zIndex: isSelected ? 10 : 2,
                  boxShadow: isSelected ? '0 8px 24px rgba(0,0,0,0.4), 0 0 8px rgba(232, 160, 69, 0.15)' : 'none',
                }}
              >
                {/* Node Header */}
                <div style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.02)'
                }}>
                  <div style={{ color: isSelected ? 'var(--accent-amber)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    {getNodeIcon(node.type)}
                  </div>
                  <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {getNodeName(node.type)}
                  </span>
                </div>

                {/* Node Body */}
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-primary)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {node.data.label}
                  </p>
                  
                  {/* Capacity Info line */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }} className="mono">
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>QPS: {node.data.qps || 1000}</span>
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{node.data.latency || 10}ms</span>
                  </div>
                </div>

                {/* Node Connector Handle Button */}
                <button
                  onClick={(e) => handleNodeConnectClick(node.id, e)}
                  title="Draw connection"
                  style={{
                    position: 'absolute',
                    right: '-6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isConnectingSource ? 'var(--accent-blue)' : 'var(--border)',
                    border: '2px solid var(--bg-surface)',
                    cursor: 'pointer',
                    zIndex: 20,
                    padding: 0
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Right Panel: Inspector & Version History */}
        <aside style={{
          width: '320px',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflowY: 'auto'
        }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {(['inspector', 'versions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveRightTab(tab)}
                className="mono"
                style={{
                  flex: 1,
                  padding: '12px',
                  background: activeRightTab === tab ? 'var(--bg-elevated)' : 'transparent',
                  border: 'none',
                  borderBottom: activeRightTab === tab ? '2px solid var(--accent-amber)' : '2px solid transparent',
                  color: activeRightTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  marginBottom: '-1px'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* ── INSPECTOR TAB ─────────────────────────────────────────────── */}
            {activeRightTab === 'inspector' && (
              <>
                {!selectedNode ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    <Sliders style={{ width: '28px', height: '28px', margin: '0 auto 12px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: '12px' }}>No element selected</p>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Click on any canvas node to configure capacity specs, custom names, and workloads.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    
                    {/* Node Summary */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ color: 'var(--accent-amber)' }}>
                        {getNodeIcon(selectedNode.type)}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {getNodeName(selectedNode.type)}
                        </h4>
                        <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>ID: {selectedNode.id}</span>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">DISPLAY LABEL</label>
                        <input
                          type="text"
                          value={selectedNode.data.label || ''}
                          onChange={(e) => handleSelectedNodeDataChange('label', e.target.value)}
                          style={{
                            padding: '8px 10px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            outline: 'none'
                          }}
                          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">MAX CAPACITY (QPS)</label>
                        <input
                          type="number"
                          value={selectedNode.data.qps || 1000}
                          onChange={(e) => handleSelectedNodeDataChange('qps', parseInt(e.target.value) || 0)}
                          style={{
                            padding: '8px 10px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">BASE LATENCY (MS)</label>
                        <input
                          type="number"
                          value={selectedNode.data.latency || 10}
                          onChange={(e) => handleSelectedNodeDataChange('latency', parseInt(e.target.value) || 0)}
                          style={{
                            padding: '8px 10px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            outline: 'none'
                          }}
                        />
                      </div>

                    </div>

                    {/* Edge connections for selected node */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">CONNECTED PATHS</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).map(e => (
                          <div
                            key={e.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: 'var(--bg-elevated)',
                              borderRadius: '6px',
                              border: '1px solid var(--border)'
                            }}
                          >
                            <span className="mono" style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                              {nodes.find(n => n.id === e.source)?.data.label || 'Node'} → {nodes.find(n => n.id === e.target)?.data.label || 'Node'}
                            </span>
                            <button
                              onClick={() => handleDeleteEdge(e.id)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                              onMouseOver={el => el.currentTarget.style.color = '#F87171'}
                              onMouseOut={el => el.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <Trash style={{ width: '12px', height: '12px' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delete Action button */}
                    <button
                      onClick={deleteSelected}
                      style={{
                        marginTop: '20px',
                        padding: '10px',
                        background: 'rgba(248, 113, 113, 0.08)',
                        border: '1px solid rgba(248, 113, 113, 0.2)',
                        borderRadius: '8px',
                        color: '#F87171',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Trash style={{ width: '14px', height: '14px' }} />
                      <span>Delete Element</span>
                    </button>

                  </div>
                )}
              </>
            )}

            {/* ── VERSIONS TAB ──────────────────────────────────────────────── */}
            {activeRightTab === 'versions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Version Timeline
                  </span>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Immutable history checkpoints of this workspace.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {designMeta.versions?.map((v: any) => (
                    <div
                      key={v.id}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: 700 }}>
                          v{v.version}
                        </span>
                        <button
                          onClick={() => handleRestoreVersion(v.version)}
                          className="mono"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 4px',
                            borderRadius: '4px'
                          }}
                          onMouseOver={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
                          onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          <RotateCcw style={{ width: '10px', height: '10px' }} />
                          <span>Restore</span>
                        </button>
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {v.message || 'Auto-save snapshot'}
                      </p>
                      <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock style={{ width: '10px', height: '10px' }} />
                        {new Date(v.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </aside>

      </div>

    </div>
  );
}
