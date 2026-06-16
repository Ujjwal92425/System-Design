'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { SimulationControls } from '../../simulation/SimulationControls';
import { TrafficSlider } from '../../simulation/TrafficSlider';
import { MetricsChart } from '../../simulation/MetricsChart';
import { SystemHealthBadge } from '../../simulation/SystemHealthBadge';
import { ChaosPanel } from '../../simulation/ChaosPanel';
import { ObservabilityDashboard } from '../../simulation/ObservabilityDashboard';
import { ChevronDown, ChevronUp, Radio, Sparkles, GripHorizontal, LayoutDashboard, BarChart3 } from 'lucide-react';

interface SimulationPanelProps {
  nodes: any[];
  edges: any[];
  simulation: {
    isRunning: boolean;
    trafficQps: number;
    scenario: string;
    failedNodes: string[];
    nodeChaosModes: Record<string, string>;
    metricsHistory: any[];
    currentMetrics: any | null;
    eventsLog: any[];
    start: () => void;
    stop: () => void;
    updateTraffic: (qps: number) => void;
    updateScenario: (scen: string) => void;
    toggleNodeFailure: (nodeId: string) => void;
    setNodeChaos: (nodeId: string, mode: string) => void;
    reset: () => void;
  };
  height: number;
  onResize: (newHeight: number) => void;
  minHeight?: number;
  maxHeight?: number;
}

export function SimulationPanel({
  nodes,
  edges,
  simulation,
  height,
  onResize,
  minHeight = 250,
  maxHeight = 600,
}: SimulationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dashboardView, setDashboardView] = useState(false);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [height]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = startYRef.current - e.clientY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeightRef.current + delta));
      onResize(newHeight);
    };
    const handleMouseUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [minHeight, maxHeight, onResize]);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div
      className="border-t border-yc-border bg-yc-bg-alt flex flex-col flex-shrink-0 overflow-hidden"
      style={{ height: isOpen ? `${height}px` : '44px' }}
    >
      {/* Draggable resize handle */}
      {isOpen && (
        <div
          className="h-1.5 bg-yc-border/50 hover:bg-yc-accent/30 cursor-row-resize flex-shrink-0 flex items-center justify-center transition-colors group"
          onMouseDown={handleMouseDown}
        >
          <GripHorizontal className="w-4 h-4 text-yc-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Header bar — always visible */}
      <div
        onClick={togglePanel}
        className="flex justify-between items-center px-6 py-2.5 bg-yc-bg-card cursor-pointer border-b border-yc-border select-none flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <Radio
            className={`w-3.5 h-3.5 ${simulation.isRunning ? 'text-emerald-500' : 'text-yc-text-muted'}`}
            style={{ animation: simulation.isRunning ? 'pulse 1.5s infinite' : 'none' }}
          />
          <span className="font-mono text-[11px] text-yc-text font-bold tracking-wider">
            SIMULATION ENGINE CONTROL ROOM
          </span>
          {simulation.isRunning && (
            <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 text-[8px] font-extrabold font-mono">
              LIVE (TICK {simulation.currentMetrics?.tick ?? 0})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); setDashboardView((v) => !v); }}
            className={`flex items-center gap-1.5 text-[10px] font-bold font-mono px-2.5 py-1 rounded-md border transition-colors ${
              dashboardView
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-500'
            }`}
            title={dashboardView ? 'Switch to control room' : 'Switch to observability dashboard'}
          >
            {dashboardView ? <BarChart3 className="w-3.5 h-3.5" /> : <LayoutDashboard className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{dashboardView ? 'Control Room' : 'Dashboard'}</span>
          </button>
          <SystemHealthBadge health={simulation.isRunning ? simulation.currentMetrics?.systemHealth : null} />
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-yc-text-muted" />
          ) : (
            <ChevronUp className="w-4 h-4 text-yc-text-muted" />
          )}
        </div>
      </div>

      {/* Body — shown when expanded */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto p-4 px-6">
          {dashboardView ? (
            <ObservabilityDashboard
              history={simulation.metricsHistory}
              currentMetrics={simulation.currentMetrics}
              isRunning={simulation.isRunning}
            />
          ) : (
            // Responsive grid: 1 col mobile, 2 col tablet, 4 col desktop
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Col 1: Controls */}
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[10px] text-yc-text-muted font-bold">01 // STATE SELECTOR</span>
              <SimulationControls
                isRunning={simulation.isRunning}
                scenario={simulation.scenario}
                onStart={simulation.start}
                onStop={simulation.stop}
                onReset={simulation.reset}
                onScenarioChange={simulation.updateScenario}
              />
              <div className="bg-yc-bg-card border border-yc-border rounded-lg p-3 flex-1 flex flex-col gap-1.5">
                <span className="font-mono text-[9px] text-yc-text-muted font-bold">SYSTEM OUTLOOK</span>
                <p className="m-0 text-[11px] text-yc-text-secondary leading-relaxed">
                  {!simulation.isRunning
                    ? 'Ready to deploy traffic. Choose a scenario and click Start to measure performance throughput.'
                    : simulation.currentMetrics?.systemHealth === 'RED'
                      ? 'CRITICAL WARNING: The active traffic load is causing node failures and queue overflows.'
                      : simulation.currentMetrics?.systemHealth === 'YELLOW'
                        ? 'CAUTION: Cache hit rate decay or manual chaos is degrading latencies.'
                        : 'System operating normally within SLA budgets. All queues healthy.'
                  }
                </p>
              </div>
            </div>

            {/* Col 2: Traffic */}
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[10px] text-yc-text-muted font-bold">02 // THROUGHPUT MODIFIER</span>
              <TrafficSlider
                value={simulation.trafficQps}
                onChange={simulation.updateTraffic}
                disabled={!simulation.isRunning}
              />
              <div className="border border-dashed border-yc-border rounded-lg p-3 flex-1 flex flex-col justify-center items-center text-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yc-accent" />
                <p className="m-0 text-[10px] text-yc-text-muted leading-relaxed">
                  Adjusting QPS scales traffic inputs. Observe downstream impacts.
                </p>
              </div>
            </div>

            {/* Col 3: Metrics */}
            <div className="flex flex-col gap-3 min-w-0">
              <span className="font-mono text-[10px] text-yc-text-muted font-bold">03 // REAL-TIME TELEMETRY</span>
              <MetricsChart history={simulation.metricsHistory} />
              {/* Event Log Terminal */}
              <div className="h-20 bg-gray-950 border border-yc-border rounded-lg p-2 px-3 flex flex-col gap-1 overflow-y-auto font-mono">
                {simulation.eventsLog.length === 0 ? (
                  <span className="text-[10px] text-yc-text-muted">
                    [SYSTEM] Terminal idle. Awaiting simulation events...
                  </span>
                ) : (
                  simulation.eventsLog.map((event: any) => {
                    const color = event.severity === 'ERROR' ? 'text-red-400' : event.severity === 'WARNING' ? 'text-amber-400' : 'text-emerald-400';
                    return (
                      <div key={event.id} className="flex gap-2 text-[9px] leading-tight">
                        <span className="text-yc-text-muted flex-shrink-0">[{event.timestamp}]</span>
                        <span className={`${color} font-bold flex-shrink-0`}>[{event.type}]</span>
                        <span className="text-gray-400">{event.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Col 4: Chaos */}
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[10px] text-yc-text-muted font-bold">04 // FAULT INJECTION</span>
              <ChaosPanel
                nodes={nodes}
                nodeChaosModes={simulation.nodeChaosModes}
                onSetNodeChaos={simulation.setNodeChaos}
              />
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
