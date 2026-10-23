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
import { ErrorBoundary } from '../../simulation/ErrorBoundary';
import {
  ChevronDown, ChevronUp, Radio, GripHorizontal,
  LayoutDashboard, BarChart3, Sliders, Activity, Zap, Terminal,
  Loader2, AlertTriangle, Download, X
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
    workerError: string | null;
    isPaused: boolean;
    startupPhase: 'idle' | 'starting' | 'running' | 'error';
    latencyBudget?: any;
    isSteadyState?: boolean;
    injectChaos?: any;
    clearChaos?: any;
    events?: any;
    clearEvents?: any;
  };
  height?: number;
  onResize?: (newHeight: number) => void;
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
  if (simulation.workerError) {
    return `Worker error: ${simulation.workerError}. Press Reset to dismiss.`;
  }
  if (simulation.isPaused) {
    return 'Simulation paused due to an error. Press Reset to restart.';
  }
  if (!simulation.isRunning) {
    return 'Configure traffic and load profile, then press Start to run the simulation.';
  }
  if (simulation.startupPhase === 'starting') {
    return 'Initializing simulation tick loop. First metrics arriving in ~1 second...';
  }
  if (!simulation.currentMetrics) {
    return 'Waiting for initial metrics from worker...';
  }
  const health = simulation.currentMetrics?.systemHealth;
  if (health === 'RED') return 'Critical: nodes are failing or queues are overflowing. Check the Metrics tab or inject healing via Chaos.';
  if (health === 'YELLOW') return 'Degraded: elevated latency or errors detected. Review node table for hotspots.';
  return 'All systems within SLA. Traffic flowing normally through the architecture.';
}

function exportReport(simulation: SimulationPanelProps['simulation']) {
  const report = {
    exportedAt: new Date().toISOString(),
    scenario: simulation.scenario,
    trafficQps: simulation.trafficQps,
    isRunning: simulation.isRunning,
    tick: simulation.currentMetrics?.tick ?? 0,
    totalEvents: simulation.eventsLog.length,
    currentMetrics: simulation.currentMetrics,
    metricsHistory: simulation.metricsHistory,
    eventsLog: simulation.eventsLog,
    nodeChaosModes: simulation.nodeChaosModes,
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `simulation-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SimulationPanel({
  nodes,
  simulation,
}: SimulationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dashboardView, setDashboardView] = useState(false);
  const [activeTab, setActiveTab] = useState<SimTab>('controls');
  const prevRunningRef = useRef(false);

  const archNodes = nodes.filter((n) => {
    const t = (n as any).type || n.data?.nodeType;
    return t !== 'NOTE' && t !== 'GROUP';
  });

  useEffect(() => {
    if (simulation.isRunning && !prevRunningRef.current) {
      setIsOpen(true);
      setActiveTab('metrics');
    }
    prevRunningRef.current = simulation.isRunning;
  }, [simulation.isRunning]);

  const showErrorBanner = simulation.workerError && simulation.isPaused;

  if (!isOpen) {
    // CHANGE: Added PostHog data-track for opening simulation console
    return (
      <div
        onClick={() => setIsOpen(true)}
        data-track="simulation:open_console"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md border border-yc-border shadow-xl hover:shadow-2xl rounded-full px-5 py-2.5 hover:border-yc-accent hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-3 cursor-pointer select-none text-[11px] font-bold font-mono tracking-wider text-yc-text"
      >
        <Radio
          className={`w-3.5 h-3.5 flex-shrink-0 ${
            simulation.isRunning ? 'text-emerald-500 animate-pulse' : 'text-yc-text-muted'
          }`}
        />
        <span>SIMULATION: {simulation.isRunning ? 'RUNNING' : 'OFFLINE'}</span>
        {simulation.isRunning && (
          <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 text-[8px] font-extrabold font-mono">
            TICK {simulation.currentMetrics?.tick ?? 0}
          </span>
        )}
        <SystemHealthBadge
          health={simulation.isRunning ? simulation.currentMetrics?.systemHealth : null}
        />
        <div className="w-px h-3 bg-yc-border" />
        <span className="text-[10px] text-yc-accent font-semibold">Open Console →</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:p-10 z-50 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

      <div className="relative bg-white border border-yc-border rounded-2xl max-w-5xl w-full h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {showErrorBanner && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-red-50 border-b border-red-200 text-red-700 text-[10px] font-mono z-10">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span className="flex-1 truncate">Worker error: {simulation.workerError}</span>
            <button
              onClick={(e) => { e.stopPropagation(); simulation.reset(); }}
              className="px-2 py-0.5 bg-red-100 hover:bg-red-200 rounded text-[9px] font-bold transition"
            >
              DISMISS
            </button>
          </div>
        )}

        <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-yc-border select-none flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Radio
              className={`w-4 h-4 flex-shrink-0 ${
                simulation.isRunning ? 'text-emerald-500 animate-pulse' : 'text-yc-text-muted'
              }`}
            />
            <span className="font-mono text-xs text-yc-text font-bold tracking-widest">
              SIMULATION ENGINE CONSOLE
            </span>
            {simulation.isRunning && (
              <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 text-[8px] font-extrabold font-mono">
                TICK {simulation.currentMetrics?.tick ?? 0}
              </span>
            )}
          </div>

            {/* CHANGE: Added PostHog data-track for view toggle and close */}
            <button
              onClick={() => setDashboardView((v) => !v)}
              data-track="simulation:toggle_view"
              data-track-view={dashboardView ? 'compact' : 'dashboard'}
              className={`flex items-center gap-1.5 text-[10px] font-bold font-mono px-3 py-1.5 rounded-md border transition-colors ${
                dashboardView
                  ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
              }`}
            >
              {dashboardView ? <BarChart3 className="w-3.5 h-3.5" /> : <LayoutDashboard className="w-3.5 h-3.5" />}
              <span>{dashboardView ? 'Compact View' : 'Full Dashboard'}</span>
            </button>

            <SystemHealthBadge
              health={simulation.isRunning ? simulation.currentMetrics?.systemHealth : null}
            />

            <button
              onClick={() => setIsOpen(false)}
              data-track="simulation:close_console"
              className="p-1.5 rounded-lg text-yc-text-muted hover:text-yc-text hover:bg-gray-100 transition border border-transparent hover:border-yc-border"
              title="Close panel"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {dashboardView ? (
            <div className="flex-1 overflow-y-auto p-6">
              <ObservabilityDashboard
                history={simulation.metricsHistory}
                currentMetrics={simulation.currentMetrics}
                isRunning={simulation.isRunning}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {simulation.isRunning && (
                <div className="px-6 pt-4 pb-3 flex-shrink-0 border-b border-yc-border/50 bg-white">
                  <SimulationKpiBar
                    currentMetrics={simulation.currentMetrics}
                    trafficQps={simulation.trafficQps}
                    scenario={simulation.scenario}
                  />
                </div>
              )}

              <div className="flex gap-0.5 px-6 pt-2 bg-white flex-shrink-0 border-b border-yc-border/50">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  const badge = tab.id === 'chaos'
                    ? Object.keys(simulation.nodeChaosModes).length
                    : tab.id === 'events'
                      ? simulation.eventsLog.length
                      : 0;

                  // CHANGE: Added PostHog data-track for simulation tab change
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      data-track="simulation:tab_change"
                      data-track-tab={tab.id}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg text-[10px] font-bold font-mono transition-colors ${
                        active
                          ? 'bg-white text-yc-accent border border-yc-border border-b-transparent -mb-px'
                          : 'text-yc-text-muted hover:text-yc-text'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                      {badge > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-yc-accent/10 text-yc-accent text-[8px] font-extrabold ml-1">
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-white">
                <ErrorBoundary
                  fallbackTitle="Simulation panel render error"
                  onReset={simulation.reset}
                >
                  {activeTab === 'controls' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-4">
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
                        <div className="bg-white border border-yc-border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-[9px] text-yc-text-muted font-bold">OUTLOOK</span>
                            {simulation.metricsHistory.length > 0 && (
                              {/* CHANGE: Added PostHog data-track for simulation report export */}
                              <button
                                onClick={(e) => { e.stopPropagation(); exportReport(simulation); }}
                                data-track="simulation:export_report"
                                className="flex items-center gap-1 text-[9px] font-bold font-mono px-2 py-1 bg-yc-accent text-white rounded hover:bg-yc-accent-hover transition"
                              >
                                <Download className="w-3 h-3" />
                                Export Report
                              </button>
                            )}
                          </div>
                          <p className="mt-1.5 m-0 text-xs text-yc-text-secondary leading-relaxed">
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
                    <div className="flex flex-col gap-6">
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
                    <div className="bg-gray-950 border border-yc-border rounded-lg p-4 min-h-[300px] max-h-full overflow-y-auto font-mono">
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
                </ErrorBoundary>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
