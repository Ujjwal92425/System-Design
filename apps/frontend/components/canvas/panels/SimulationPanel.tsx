'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { SimulationControls } from '../../simulation/SimulationControls';
import { TrafficSlider } from '../../simulation/TrafficSlider';
import { ScenarioSelector } from '../../simulation/ScenarioSelector';
import { MetricsChart } from '../../simulation/MetricsChart';
import { SimulationKpiBar } from '../../simulation/SimulationKpiBar';
import { SimNodeTable } from '../../simulation/SimNodeTable';
import { SystemHealthBadge } from '../../simulation/SystemHealthBadge';
import { ChaosPanel } from '../../simulation/ChaosPanel';
import { ObservabilityDashboard } from '../../simulation/ObservabilityDashboard';
import {
  ChevronDown, ChevronUp, Radio, GripHorizontal,
  LayoutDashboard, BarChart3, Sliders, Activity, Zap, Terminal,
} from 'lucide-react';

type SimTab = 'controls' | 'metrics' | 'chaos' | 'events';

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
    setNodeChaos: (nodeId: string, mode: string) => void;
    reset: () => void;
  };
  height: number;
  onResize: (newHeight: number) => void;
  minHeight?: number;
  maxHeight?: number;
}

const TABS: { id: SimTab; label: string; icon: typeof Sliders }[] = [
  { id: 'controls', label: 'Controls', icon: Sliders },
  { id: 'metrics', label: 'Metrics', icon: Activity },
  { id: 'chaos', label: 'Chaos', icon: Zap },
  { id: 'events', label: 'Events', icon: Terminal },
];

function getOutlookText(simulation: SimulationPanelProps['simulation']) {
  if (!simulation.isRunning) {
    return 'Configure traffic and load profile, then press Start to run the simulation.';
  }
  const health = simulation.currentMetrics?.systemHealth;
  if (health === 'RED') return 'Critical: nodes are failing or queues are overflowing. Check the Metrics tab or inject healing via Chaos.';
  if (health === 'YELLOW') return 'Degraded: elevated latency or errors detected. Review node table for hotspots.';
  return 'All systems within SLA. Traffic flowing normally through the architecture.';
}

export function SimulationPanel({
  nodes,
  simulation,
  height,
  onResize,
  minHeight = 280,
  maxHeight = 700,
}: SimulationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dashboardView, setDashboardView] = useState(false);
  const [activeTab, setActiveTab] = useState<SimTab>('controls');
  const prevRunningRef = useRef(false);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const archNodes = nodes.filter((n) => {
    const t = n.data?.nodeType || n.type;
    return t !== 'NOTE' && t !== 'GROUP';
  });

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
      onResize(Math.min(maxHeight, Math.max(minHeight, startHeightRef.current + delta)));
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

  useEffect(() => {
    if (simulation.isRunning && !prevRunningRef.current) {
      setIsOpen(true);
      setActiveTab('metrics');
    }
    prevRunningRef.current = simulation.isRunning;
  }, [simulation.isRunning]);

  return (
    <div
      className="border-t border-yc-border bg-yc-bg-alt flex flex-col flex-shrink-0 overflow-hidden z-20"
      style={{ height: isOpen ? `${height}px` : '44px' }}
    >
      {isOpen && (
        <div
          className="h-1.5 bg-yc-border/50 hover:bg-yc-accent/30 cursor-row-resize flex-shrink-0 flex items-center justify-center transition-colors group"
          onMouseDown={handleMouseDown}
        >
          <GripHorizontal className="w-4 h-4 text-yc-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Header */}
      <div
        onClick={() => setIsOpen((v) => !v)}
        className="flex justify-between items-center px-4 py-2 bg-yc-bg-card cursor-pointer border-b border-yc-border select-none flex-shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Radio
            className={`w-3.5 h-3.5 flex-shrink-0 ${simulation.isRunning ? 'text-emerald-500 animate-pulse' : 'text-yc-text-muted'}`}
          />
          <span className="font-mono text-[11px] text-yc-text font-bold tracking-wider truncate">
            SIMULATION
          </span>
          {simulation.isRunning && (
            <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 text-[8px] font-extrabold font-mono flex-shrink-0">
              TICK {simulation.currentMetrics?.tick ?? 0}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setDashboardView((v) => !v); }}
            className={`flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-1 rounded-md border transition-colors ${
              dashboardView
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
            }`}
          >
            {dashboardView ? <BarChart3 className="w-3 h-3" /> : <LayoutDashboard className="w-3 h-3" />}
            <span className="hidden sm:inline">{dashboardView ? 'Compact' : 'Full'}</span>
          </button>
          <SystemHealthBadge
            health={simulation.isRunning ? simulation.currentMetrics?.systemHealth : null}
          />
          {isOpen ? <ChevronDown className="w-4 h-4 text-yc-text-muted" /> : <ChevronUp className="w-4 h-4 text-yc-text-muted" />}
        </div>
      </div>

      {isOpen && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {dashboardView ? (
            <div className="flex-1 overflow-y-auto p-4">
              <ObservabilityDashboard
                history={simulation.metricsHistory}
                currentMetrics={simulation.currentMetrics}
                isRunning={simulation.isRunning}
              />
            </div>
          ) : (
            <>
              {/* KPI strip — always visible when running */}
              {simulation.isRunning && (
                <div className="px-4 pt-3 pb-2 flex-shrink-0 border-b border-yc-border/50">
                  <SimulationKpiBar
                    currentMetrics={simulation.currentMetrics}
                    trafficQps={simulation.trafficQps}
                    scenario={simulation.scenario}
                  />
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-0.5 px-4 pt-2 flex-shrink-0 border-b border-yc-border/50">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  const badge = tab.id === 'chaos'
                    ? Object.keys(simulation.nodeChaosModes).length
                    : tab.id === 'events'
                      ? simulation.eventsLog.length
                      : 0;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-[10px] font-bold font-mono transition-colors ${
                        active
                          ? 'bg-yc-bg-card text-yc-accent border border-yc-border border-b-transparent -mb-px'
                          : 'text-yc-text-muted hover:text-yc-text'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {tab.label}
                      {badge > 0 && (
                        <span className="px-1 py-0.5 rounded-full bg-yc-accent/10 text-yc-accent text-[8px]">
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {activeTab === 'controls' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-3">
                      <SimulationControls
                        isRunning={simulation.isRunning}
                        onStart={simulation.start}
                        onStop={simulation.stop}
                        onReset={simulation.reset}
                      />
                      <ScenarioSelector
                        value={simulation.scenario}
                        onChange={simulation.updateScenario}
                        activeInputQps={simulation.currentMetrics?.inputQps}
                        baseQps={simulation.trafficQps}
                      />
                      <div className="bg-yc-bg-card border border-yc-border rounded-lg p-3">
                        <span className="font-mono text-[9px] text-yc-text-muted font-bold">OUTLOOK</span>
                        <p className="mt-1.5 m-0 text-[11px] text-yc-text-secondary leading-relaxed">
                          {getOutlookText(simulation)}
                        </p>
                      </div>
                    </div>
                    <TrafficSlider
                      value={simulation.trafficQps}
                      effectiveQps={simulation.currentMetrics?.inputQps}
                      isRunning={simulation.isRunning}
                      onChange={simulation.updateTraffic}
                    />
                  </div>
                )}

                {activeTab === 'metrics' && (
                  <div className="flex flex-col gap-3">
                    <MetricsChart history={simulation.metricsHistory} />
                    <div>
                      <span className="font-mono text-[9px] text-yc-text-muted font-bold mb-2 block">
                        PER-NODE BREAKDOWN
                      </span>
                      <SimNodeTable
                        nodes={simulation.currentMetrics?.nodes || []}
                        chaosModes={simulation.nodeChaosModes}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'chaos' && (
                  <ChaosPanel
                    nodes={archNodes}
                    nodeChaosModes={simulation.nodeChaosModes}
                    onSetNodeChaos={simulation.setNodeChaos}
                  />
                )}

                {activeTab === 'events' && (
                  <div className="bg-gray-950 border border-yc-border rounded-lg p-3 min-h-[200px] max-h-full overflow-y-auto font-mono">
                    {simulation.eventsLog.length === 0 ? (
                      <span className="text-[10px] text-gray-500">No events yet. Start a simulation to see the event stream.</span>
                    ) : (
                      simulation.eventsLog.map((event: any) => {
                        const color = event.severity === 'ERROR' ? 'text-red-400' : event.severity === 'WARNING' ? 'text-amber-400' : 'text-emerald-400';
                        return (
                          <div key={event.id} className="flex gap-2 text-[10px] leading-relaxed py-0.5">
                            <span className="text-gray-500 flex-shrink-0">[{event.timestamp}]</span>
                            <span className={`${color} font-bold flex-shrink-0`}>[{event.type}]</span>
                            <span className="text-gray-400">{event.message}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
