'use client';

import React, { useEffect, useState, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { useCanvasStore, CanvasNode, CanvasEdge } from '@/features/canvas/useCanvasStore';
import { useAutoSave } from '@/features/canvas/useAutoSave';
import { useAutoLayout } from '@/features/canvas/useAutoLayout';
import { useSimulation } from '@/features/simulation/useSimulation';
import { useCollaboration } from '@/features/canvas/useCollaboration';
import { FlowCanvas } from '@/components/canvas/FlowCanvas';
import { toPng } from 'html-to-image';
import { CanvasSidebar } from '@/components/canvas/CanvasSidebar';
import { SimulationPanel } from '@/components/canvas/panels/SimulationPanel';
import { InspectorPanel } from '@/components/canvas/panels/InspectorPanel';
import type { ScenarioTemplate } from '@/content/scenarios';
import LatencyBudgetPanel from '@/components/canvas/panels/LatencyBudgetPanel';
import AIReviewPanel from '@/components/canvas/panels/AIReviewPanel';
import { useInterviewSession } from '@/features/interview/useInterviewSession';
import { communityService } from '@/api-clients/community';
import { Timer } from '@/components/interview/Timer';
import { RequirementsPanel } from '@/components/interview/RequirementsPanel';
import { HintPanel } from '@/components/interview/HintPanel';
import type { Node, Edge } from '@xyflow/react';
import {
  ChevronLeft, Save, RotateCcw, Copy, Trash, Globe, Lock,
  Loader2, AlertCircle, Info, ArrowLeftRight,
  Undo2, Redo2, Settings, Sliders, Clock, Sparkles,
  Download, StickyNote, PanelRight, X,
} from 'lucide-react';
import { NodeCategoryItem } from '@/features/canvas/nodeCategories';

function createReactFlowNode(cn: CanvasNode): Node {
  const isNote = cn.type === 'NOTE';
  const isGroup = cn.type === 'GROUP';
  return {
    id: cn.id,
    type: isNote ? 'noteNode' : isGroup ? 'groupNode' : 'architectureNode',
    position: cn.position,
    data: {
      nodeType: cn.type,
      label: cn.data?.label || cn.type.toLowerCase().replace(/_/g, ' '),
      text: cn.data?.text || cn.data?.label || '',
      color: cn.data?.color || '#FEF3C7',
      ...cn.data,
    },
    selected: cn.selected || false,
    ...(isGroup ? { style: { width: 400, height: 300 } } : {}),
  };
}

function createReactFlowEdge(ce: CanvasEdge): Edge {
  return {
    id: ce.id,
    source: ce.source,
    target: ce.target,
    sourceHandle: ce.sourceHandle || undefined,
    targetHandle: ce.targetHandle || undefined,
    type: 'architectureEdge',
    data: { label: ce.label || 'HTTP' },
    animated: true,
    selected: ce.selected || false,
  };
}

export default function CanvasWorkspace({ params }: { params: Promise<{ designId: string }> }) {
  const { designId } = use(params);
  const router = useRouter();

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const init = useCanvasStore((s) => s.init);
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const addNode = useCanvasStore((s) => s.addNode);
  const addEdge = useCanvasStore((s) => s.addEdge);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const deleteSelected = useCanvasStore((s) => s.deleteSelected);
  const duplicateNode = useCanvasStore((s) => s.duplicateNode);
  const duplicateSelected = useCanvasStore((s) => s.duplicateSelected);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const dirty = useCanvasStore((s) => s.dirty);
  const lastSavedAt = useCanvasStore((s) => s.lastSavedAt);
  const markSaved = useCanvasStore((s) => s.markSaved);
  const renameNode = useCanvasStore((s) => s.renameNode);

  const [designMeta, setDesignMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [rightPanel, setRightPanel] = useState<'inspector' | 'latency' | 'ai-review' | null>('inspector');

  const simulation = useSimulation(nodes, edges);

  // FIX: Simulation timeout detection — if no first tick arrives within 5s,
  // emit a warning event. This catches cases where the worker crashes silently.
  useEffect(() => {
    if (!simulation.isRunning) return;
    const timeout = setTimeout(() => {
      if (!simulation.currentMetrics && simulation.startupPhase !== 'error') {
        simulation.addEvent?.('TIMEOUT', 'No tick received in 5s — worker may be unresponsive. Try resetting.', 'ERROR');
      }
    }, 5000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation.isRunning]);

  useCollaboration({ designId, enabled: true });
  const { layout } = useAutoLayout();
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<'palette' | 'requirements' | 'hints'>('requirements');
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [publishTags, setPublishTags] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sessId = params.get('interviewSessionId');
      if (sessId) setInterviewSessionId(sessId);
    }
  }, []);

  const interview = useInterviewSession(interviewSessionId || undefined);

  useEffect(() => {
    if (interview.session && interview.isTimerRunning) setIsLocked(false);
  }, [interview.session, interview.isTimerRunning]);

  useEffect(() => {
    const handleUndo = () => undo();
    const handleRedo = () => redo();
    window.addEventListener('canvas-undo', handleUndo);
    window.addEventListener('canvas-redo', handleRedo);
    return () => {
      window.removeEventListener('canvas-undo', handleUndo);
      window.removeEventListener('canvas-redo', handleRedo);
    };
  }, [undo, redo]);

  const loadDesign = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/designs/${designId}`);
      const design = res.data.data;
      setDesignMeta(design);
      const canvasData = design.canvas || { nodes: [], edges: [] };
      init(
        Array.isArray(canvasData.nodes) ? canvasData.nodes : [],
        Array.isArray(canvasData.edges) ? canvasData.edges : []
      );
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDesign(); }, [designId]);
  useAutoSave(designId);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/designs/${designId}/save`, { nodes, edges, message: 'Manual workspace save' });
      markSaved();
      const metaRes = await api.get(`/designs/${designId}`);
      setDesignMeta(metaRes.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleInterviewSubmit = async () => {
    if (!interviewSessionId) return;
    setSaving(true);
    try {
      await api.post(`/designs/${designId}/save`, { nodes, edges, message: 'Final interview design submission' });
      markSaved();
      await interview.submitDesign({ nodes, edges });
      router.push(`/interview/${interviewSessionId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Submission failed');
    } finally {
      setSaving(false);
      setIsSubmitConfirmOpen(false);
    }
  };

  const handlePublish = async () => {
    try {
      await api.post(`/designs/${designId}/save`, { nodes, edges, message: 'Published to community' });
      markSaved();
      const bp = await communityService.createBlueprint({
        designId,
        title: publishTitle || designMeta?.title || 'Untitled Design',
        description: publishDesc,
        tags: publishTags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setShowPublishModal(false);
      window.open(`/community/${bp.id}`, '_blank');
    } catch (err: any) {
      alert(err.message || 'Publish failed');
    }
  };

  const toggleVisibility = async () => {
    if (!designMeta) return;
    const nextPublic = !designMeta.isPublic;
    try {
      await api.patch(`/designs/${designId}`, { isPublic: nextPublic });
      setDesignMeta((prev: any) => ({ ...prev, isPublic: nextPublic }));
    } catch { alert('Failed to update workspace settings'); }
  };

  const NODE_DEFAULTS: Record<string, Record<string, any>> = {
    LOAD_BALANCER: { routingAlgorithm: 'round_robin' },
    CDN: { hitRatioOverride: 90 },
    WEB_SERVER: { threadPoolSize: 200, requestTimeoutMs: 10000 },
    RATE_LIMITER: { rateLimitQps: 2000, rateLimiterType: 'token_bucket' },
    DATABASE_SQL: { readReplicaCount: 0, connectionPoolSize: 50, replicationLagMs: 100 },
    DATABASE_NOSQL: { readReplicaCount: 0, connectionPoolSize: 50, replicationLagMs: 100 },
    CACHE: { evictionPolicy: 'lru', ttlSeconds: 3600 },
    QUEUE: { processingRate: 3000 },
    CIRCUIT_BREAKER: { failureThreshold: 5, halfOpenMaxQps: 100, recoveryTimeoutMs: 30000 },
    DEAD_LETTER_QUEUE: { maxRetryCount: 3, dlqBaseRate: 0.02, processingRate: 500 },
    SERVICE_MESH: { sidecarCpuOverhead: 0.05, sidecarLatencyMs: 3, enableMtls: true, enableTraces: true, enableRetries: true },
  };

  const handleAddNode = useCallback((item: NodeCategoryItem) => {
    const defaults = NODE_DEFAULTS[item.type] || {};
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type: item.type,
      position: { x: 200 + Math.random() * 200, y: 150 + Math.random() * 200 },
      data: { label: `${item.label} ${nodes.length + 1}`, qps: 1000, latency: 10, ...defaults },
    };
    addNode(newNode);
  }, [nodes.length, addNode]);

  const rfNodes: Node[] = nodes.map(createReactFlowNode);
  const rfEdges: Edge[] = edges.map(createReactFlowEdge);

  const handleRFNodesChange = useCallback((updatedNodes: Node[]) => {
    const canvasNodes: CanvasNode[] = updatedNodes.map((n) => ({
      id: n.id,
      type: (n.data?.nodeType as string) || (n.type === 'noteNode' ? 'NOTE' : 'WEB_SERVER'),
      position: { x: n.position.x, y: n.position.y },
      data: {
        label: String(n.data?.label || ''),
        text: String(n.data?.text || ''),
        color: n.data?.color || '#FEF3C7',
        ...n.data,
      },
      selected: n.selected,
    }));
    setNodes(canvasNodes);

    const hasSelected = canvasNodes.some((n) => n.selected);
    if (hasSelected && rightPanel !== 'inspector') {
      setRightPanel('inspector');
    }
  }, [setNodes, rightPanel, setRightPanel]);

  const handleRFEdgesChange = useCallback((updatedEdges: Edge[]) => {
    const canvasEdges: CanvasEdge[] = updatedEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
      label: String(e.data?.label || 'HTTP'),
      animated: e.animated,
      selected: e.selected,
      type: 'architectureEdge',
    }));
    setEdges(canvasEdges);
  }, [setEdges]);

  const handleRFAddEdge = useCallback((edge: Edge) => {
    const ce: CanvasEdge = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
      label: String(edge.data?.label || 'HTTP'),
      animated: true,
    };
    addEdge(ce);
  }, [addEdge]);

  const handleRFDeleteNode = useCallback((nodeId: string) => {
    deleteNode(nodeId);
  }, [deleteNode]);

  const handleRFEdgeLabelChange = useCallback((edgeId: string, label: string) => {
    setEdges(
      edges.map((e) =>
        e.id === edgeId ? { ...e, label } : e
      )
    );
  }, [edges, setEdges]);

  const handleRFEditLabel = useCallback((nodeId: string, label: string) => {
    setNodes(nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label } } : n)));
  }, [nodes, setNodes]);

  const handleRFDuplicateNode = useCallback((nodeId: string) => {
    duplicateNode(nodeId);
  }, [duplicateNode]);

  const handleRFRenameNode = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    const newLabel = prompt('Rename node:', node?.data?.label || '');
    if (newLabel && newLabel.trim()) renameNode(nodeId, newLabel.trim());
  }, [nodes, renameNode]);

  const handleAddStickyNote = useCallback(() => {
    const newNode: CanvasNode = {
      id: `note-${Date.now()}`,
      type: 'NOTE',
      position: { x: 200 + Math.random() * 200, y: 150 + Math.random() * 200 },
      data: { label: 'Add your notes here...', text: 'Add your notes here...' },
    };
    addNode(newNode);
  }, [addNode]);


  const handleExportImage = useCallback((dataUrl: string) => {
    const link = document.createElement('a');
    link.download = `architecture-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  const handleRestoreVersion = async (vNum: number) => {
    if (!confirm(`Restore to version v${vNum}? This creates a new checkpoint.`)) return;
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
      <div className="flex items-center justify-center h-screen bg-yc-bg">
        <div className="text-center flex flex-col gap-3 items-center">
          <Loader2 className="w-9 h-9 text-yc-accent animate-spin" />
          <p className="text-yc-text-muted text-xs font-mono tracking-wider">LOADING CANVAS ENVIRONMENT...</p>
        </div>
      </div>
    );
  }

  if (error || !designMeta) {
    return (
      <div className="p-16 max-w-lg mx-auto text-center flex flex-col gap-5 items-center">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-yc-text">Workspace Error</h2>
        <p className="text-sm text-yc-text-muted">{error || 'Failed to launch design studio.'}</p>
        <button onClick={() => router.push('/build')} className="px-5 py-2.5 bg-yc-accent text-white rounded-lg text-sm font-bold">
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-yc-bg">
      {/* Toolbar — fixed height, scrollable on tiny screens */}
      <div className="h-12 border-b border-yc-border bg-yc-bg backdrop-blur-sm flex items-center justify-between px-2 sm:px-4 flex-shrink-0 overflow-x-auto gap-1">
        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          <button onClick={() => router.push('/build')} className="p-1.5 rounded-md text-yc-text-muted hover:text-yc-text transition" title="Back">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-yc-text font-display">{designMeta.title}</h1>
              <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${dirty ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {dirty ? 'UNSAVED' : 'SAVED'}
              </span>
            </div>
            {lastSavedAt && (
              <p className="text-[9px] text-yc-text-muted font-mono m-0 leading-none">
                Last saved: {new Date(lastSavedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => {
              const layouted = layout(rfNodes, rfEdges, 'LR');
              setNodes(layouted.map((n) => ({
                id: n.id,
                type: String(n.data?.nodeType || 'WEB_SERVER') as any,
                position: n.position,
                data: n.data,
                selected: n.selected,
              })));
              setTimeout(() => {}, 100);
            }}
            className="p-1.5 rounded-md text-yc-text-muted hover:text-yc-text hover:bg-yc-bg-card transition flex items-center gap-1.5 text-xs"
            title="Auto Layout Horizontal"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto Layout</span>
          </button>

          <div className="w-px h-5 bg-yc-border hidden sm:block" />

          <button onClick={undo} className="p-1.5 rounded-md text-yc-text-muted hover:text-yc-text hover:bg-yc-bg-card transition" title="Undo (Ctrl+Z)" aria-label="Undo" data-track="canvas:undo">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={redo} className="p-1.5 rounded-md text-yc-text-muted hover:text-yc-text hover:bg-yc-bg-card transition" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" data-track="canvas:redo">
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-yc-border hidden sm:block" />

          <button onClick={duplicateSelected} className="p-1.5 rounded-md text-yc-text-muted hover:text-yc-text hover:bg-yc-bg-card transition" title="Duplicate Selected" aria-label="Duplicate selected" data-track="canvas:duplicate">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={deleteSelected} className="p-1.5 rounded-md text-yc-text-muted hover:text-red-500 hover:bg-red-50 transition" title="Delete Selected" aria-label="Delete selected" data-track="canvas:delete_node">
            <Trash className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-yc-border hidden sm:block" />

          <button
            onClick={async () => {
              analytics.track('canvas:export_png');
              const container = document.querySelector('.react-flow') as HTMLElement;
              if (!container) return;
              const dataUrl = await toPng(container, { backgroundColor: '#FCF9F2', pixelRatio: 2 });
              handleExportImage(dataUrl);
            }}
            className="p-1.5 rounded-md text-yc-text-muted hover:text-yc-text hover:bg-yc-bg-card transition"
            title="Export as PNG"
            aria-label="Export as PNG"
            data-track="canvas:export_png"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddStickyNote}
            className="p-1.5 rounded-md text-yc-text-muted hover:text-yc-text hover:bg-yc-bg-card transition"
            title="Add Sticky Note"
            aria-label="Add sticky note"
          >
            <StickyNote className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-yc-border hidden sm:block" />

          <button onClick={toggleVisibility} className="p-1.5 rounded-md text-yc-text-muted hover:text-yc-text hover:bg-yc-bg-card transition flex items-center gap-1 text-xs" title={designMeta.isPublic ? 'Public' : 'Private'} aria-label="Toggle visibility">
            {designMeta.isPublic ? <Globe className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => { handleSave(); setShowPublishModal(true); }}
            className="px-2.5 py-1.5 border border-yc-border rounded-lg text-xs font-semibold text-yc-text-muted hover:text-yc-accent hover:border-yc-accent transition flex items-center gap-1"
            title="Publish to community"
            data-track="canvas:publish"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Publish</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 bg-yc-accent text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition hover:bg-yc-accent-hover disabled:opacity-60"
            data-track="canvas:save"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left Sidebar — overlay on mobile, static on desktop */}
        {interviewSessionId && interview.session ? (
          <aside className="w-80 border-r border-yc-border bg-white flex flex-col flex-shrink-0 overflow-hidden">
            <div className="p-4 border-b border-yc-border">
              <Timer
                timeLeft={interview.timeLeft}
                totalTime={interview.session.timeLimit}
                isRunning={interview.isTimerRunning}
                onToggle={interview.toggleTimer}
              />
            </div>
            <div className="flex border-b border-yc-border bg-yc-bg">
              {(['requirements', 'hints', 'palette'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveLeftTab(tab)}
                  className={`flex-1 py-2.5 text-[9px] font-bold uppercase tracking-wider transition ${
                    activeLeftTab === tab
                      ? 'text-yc-accent border-b-2 border-yc-accent'
                      : 'text-yc-text-muted border-b-2 border-transparent'
                  }`}
                >
                  {tab === 'requirements' ? 'Specs' : tab === 'hints' ? 'Hints' : 'Palette'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {activeLeftTab === 'requirements' && <RequirementsPanel prompt={interview.session.prompt} />}
              {activeLeftTab === 'hints' && (
                <HintPanel hints={interview.session.prompt.hints} hintsUsed={interview.session.hintsUsed} onUseHint={interview.requestHint} />
              )}
              {activeLeftTab === 'palette' && (
                <CanvasSidebar collapsed={false} onToggleCollapse={() => {}} onAddNode={handleAddNode} />
              )}
            </div>
            <div className="p-4 border-t border-yc-border bg-yc-bg">
              <button
                onClick={() => {
                  analytics.track('canvas:submit_interview_click');
                  setIsSubmitConfirmOpen(true);
                }}
                disabled={!interview.isTimerStarted || interview.session.status !== 'IN_PROGRESS'}
                className="w-full py-2.5 bg-yc-accent text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                data-track="canvas:submit_interview"
              >
                <span>Submit Architecture</span>
              </button>
            </div>
          </aside>
        ) : (
          <>
            {/* Desktop sidebar */}
            <div className="hidden md:flex">
              <CanvasSidebar
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
                onAddNode={handleAddNode}
              />
            </div>
            {/* Mobile sidebar overlay */}
            {!sidebarCollapsed && (
              <div className="md:hidden fixed inset-0 z-40 flex">
                <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarCollapsed(true)} />
                <div className="relative z-50">
                  <CanvasSidebar collapsed={false} onToggleCollapse={() => setSidebarCollapsed(true)} onAddNode={handleAddNode} />
                </div>
              </div>
            )}
            {/* Mobile sidebar toggle button — visible when collapsed */}
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="md:hidden fixed left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-12 bg-yc-bg border border-yc-border rounded-r-lg shadow-sm flex items-center justify-center text-yc-text-muted hover:text-yc-accent transition"
                aria-label="Open sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </>
        )}

          {/* Canvas + Simulation — stack vertically */}
        <div className="flex flex-col flex-1 min-h-0 relative">
          {/* Canvas area: takes all remaining space via flex-1 */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <FlowCanvas
              initialNodes={rfNodes}
              initialEdges={rfEdges}
              onNodesChange={handleRFNodesChange}
              onEdgesChange={handleRFEdgesChange}
              onAddEdge={handleRFAddEdge}
              onDeleteNode={handleRFDeleteNode}
              onDuplicateNode={handleRFDuplicateNode}
              onRenameNode={handleRFRenameNode}
              onEdgeLabelChange={handleRFEdgeLabelChange}
              onEditLabel={handleRFEditLabel}
              onExportImage={handleExportImage}
              onAddStickyNote={handleAddStickyNote}
              isRightPanelOpen={!!rightPanel}
              simulation={{
                isRunning: simulation.isRunning,
                currentMetrics: simulation.currentMetrics,
                failedNodes: simulation.failedNodes,
                nodeChaosModes: simulation.nodeChaosModes,
              }}
            />
          </div>

          <SimulationPanel
            nodes={nodes}
            edges={edges}
            simulation={simulation}
          />
        </div>

        {/* Right Panels — overlay on mobile, sidebar on desktop */}
        {rightPanel && (
          <aside className="fixed lg:static right-0 top-12 bottom-0 z-30 w-full sm:w-80 lg:w-72 border-l border-yc-border bg-white flex flex-col overflow-y-auto shadow-xl lg:shadow-none">
            <div className="flex items-center border-b border-yc-border flex-shrink-0">
              <div className="flex-1" />
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setRightPanel(rightPanel === 'inspector' ? null : 'inspector')}
                  className={`p-2 transition ${rightPanel === 'inspector' ? 'text-yc-accent' : 'text-yc-text-muted hover:text-yc-text'}`}
                  title="Inspector"
                  aria-label="Inspector panel"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setRightPanel(rightPanel === 'latency' ? null : 'latency')}
                  className={`p-2 transition ${rightPanel === 'latency' ? 'text-yc-accent' : 'text-yc-text-muted hover:text-yc-text'}`}
                  title="Latency Budget"
                  aria-label="Latency budget panel"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setRightPanel(rightPanel === 'ai-review' ? null : 'ai-review')}
                  className={`p-2 transition ${rightPanel === 'ai-review' ? 'text-yc-accent' : 'text-yc-text-muted hover:text-yc-text'}`}
                  title="AI Review"
                  aria-label="AI review panel"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => setRightPanel(null)}
                className="p-2 text-yc-text-muted hover:text-yc-text transition"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {rightPanel === 'inspector' && (
              <InspectorPanel
                liveMetrics={simulation?.currentMetrics?.nodes?.find(
                  (m: any) => m.id === nodes.find((n) => n.selected)?.id
                )}
              />
            )}
            {rightPanel === 'latency' && <LatencyBudgetPanel nodes={nodes} edges={edges} />}
            {rightPanel === 'ai-review' && <AIReviewPanel nodes={nodes} edges={edges} />}
          </aside>
        )}

        {/* Mobile panel toggle button */}
        <button
          onClick={() => setRightPanel(rightPanel ? null : 'inspector')}
          className="fixed bottom-4 right-4 z-30 w-10 h-10 bg-white border border-yc-border rounded-full shadow-md flex items-center justify-center text-yc-text-muted hover:text-yc-accent transition"
          aria-label="Toggle panels"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Publish to community modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-yc-text mb-4">Publish to Community</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-yc-text-muted block mb-1">Title</label>
                <input
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder={designMeta?.title || 'My Architecture'}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-yc-text-muted block mb-1">Description</label>
                <textarea
                  value={publishDesc}
                  onChange={(e) => setPublishDesc(e.target.value)}
                  placeholder="Describe your architecture design..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-yc-text-muted block mb-1">Tags (comma-separated)</label>
                <input
                  value={publishTags}
                  onChange={(e) => setPublishTags(e.target.value)}
                  placeholder="e.g. microservices, aws, high-availability"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowPublishModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 transition">
                Cancel
              </button>
              <button onClick={handlePublish} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold transition hover:bg-orange-600">
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview submit confirmation */}
      {isSubmitConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-yc-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex gap-3 items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-yc-accent/10 flex items-center justify-center text-yc-accent flex-shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-yc-text">Submit Architecture?</h3>
                <p className="text-xs text-yc-text-muted mt-1 leading-relaxed">
                  Are you sure you want to finish this timed interview? Your final design will be graded instantly. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setIsSubmitConfirmOpen(false)} className="px-4 py-2 border border-yc-border rounded-lg text-xs font-semibold text-yc-text-muted hover:text-yc-text transition">
                Keep Designing
              </button>
              <button onClick={handleInterviewSubmit} className="px-4 py-2 bg-yc-accent text-white rounded-lg text-xs font-bold transition hover:bg-yc-accent-hover">
                Submit &amp; Evaluate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
