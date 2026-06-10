'use client';

import { useState } from 'react';
import { SimulationControls } from '../../simulation/SimulationControls';
import { TrafficSlider } from '../../simulation/TrafficSlider';
import { MetricsChart } from '../../simulation/MetricsChart';
import { SystemHealthBadge } from '../../simulation/SystemHealthBadge';
import { ChaosPanel } from '../../simulation/ChaosPanel';
import { Play, Sparkles, AlertCircle, ChevronDown, ChevronUp, Radio } from 'lucide-react';

interface SimulationPanelProps {
  nodes: any[];
  edges: any[];
  simulation: {
    isRunning: boolean;
    trafficQps: number;
    scenario: string;
    failedNodes: string[];
    metricsHistory: any[];
    currentMetrics: any | null;
    eventsLog: any[];
    start: () => void;
    stop: () => void;
    updateTraffic: (qps: number) => void;
    updateScenario: (scen: string) => void;
    toggleNodeFailure: (nodeId: string) => void;
    reset: () => void;
  };
}

export function SimulationPanel({ nodes, edges, simulation }: SimulationPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'height 250ms ease',
      height: isOpen ? '360px' : '44px',
      overflow: 'hidden',
      zIndex: 10
    }}>
      
      {/* Header bar to expand/collapse panel */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 24px',
          background: 'var(--bg-elevated)',
          cursor: 'pointer',
          borderBottom: isOpen ? '1px solid var(--border)' : 'none',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio style={{
            width: '14px',
            height: '14px',
            color: simulation.isRunning ? '#36C98E' : 'var(--text-muted)',
            animation: simulation.isRunning ? 'pulse 1.5s infinite' : 'none'
          }} />
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0.04em' }}>
            SIMULATION ENGINE CONTROL ROOM
          </span>
          {simulation.isRunning && (
            <span style={{
              display: 'inline-flex',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(54,201,142,0.1)',
              color: '#36C98E',
              fontSize: '8px',
              fontWeight: 800
            }} className="mono animate-pulse">
              LIVE (TICK {simulation.currentMetrics?.tick ?? 0})
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <SystemHealthBadge health={simulation.isRunning ? simulation.currentMetrics?.systemHealth : null} />
          {isOpen ? <ChevronDown style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} /> : <ChevronUp style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {/* Main panel layout */}
      {isOpen && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '320px 260px 1fr 300px',
          gap: '16px',
          padding: '16px 24px',
          flex: 1,
          overflow: 'hidden'
        }}>
          
          {/* Col 1: Playback Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
              01 // STATE SELECTOR
            </span>
            <SimulationControls
              isRunning={simulation.isRunning}
              scenario={simulation.scenario}
              onStart={simulation.start}
              onStop={simulation.stop}
              onReset={simulation.reset}
              onScenarioChange={simulation.updateScenario}
            />
            
            {/* System Overview status message */}
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>
                SYSTEM OUTLOOK
              </span>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {!simulation.isRunning 
                  ? 'Ready to deploy traffic. Choose a scenario and click Start to measure performance throughput.'
                  : simulation.currentMetrics?.systemHealth === 'RED'
                    ? 'CRITICAL WARNING: The active traffic load is causing node failures and queue overflows. System degradation has hit severe thresholds.'
                    : simulation.currentMetrics?.systemHealth === 'YELLOW'
                      ? 'CAUTION: Cache hit rate decay or manual chaos is degrading latencies. Check downstream nodes for bottlenecks.'
                      : 'System operating normally within SLA budgets. All queues healthy and processing at normal latencies.'
                }
              </p>
            </div>
          </div>

          {/* Col 2: Load Knobs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
              02 // THROUGHPUT MODIFIER
            </span>
            <TrafficSlider
              value={simulation.trafficQps}
              onChange={simulation.updateTraffic}
              disabled={!simulation.isRunning}
            />
            <div style={{
              border: '1px dashed var(--border)',
              borderRadius: '8px',
              padding: '12px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              gap: '6px'
            }}>
              <Sparkles style={{ width: '16px', height: '16px', color: 'var(--accent-amber)' }} />
              <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                Adjusting QPS scales traffic inputs. Observe downstream impacts on CPUs and Databases.
              </p>
            </div>
          </div>

          {/* Col 3: Charts & Live Events Terminal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
              03 // REAL-TIME TELEMETRY & EVENT LOG
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflow: 'hidden' }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                <MetricsChart history={simulation.metricsHistory} />
              </div>
              
              {/* Event Log Terminal */}
              <div style={{
                height: '90px',
                background: '#05070B',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                overflowY: 'auto',
                fontFamily: 'var(--font-mono, monospace)'
              }}>
                {simulation.eventsLog.length === 0 ? (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    [SYSTEM] Terminal idle. Awaiting simulation events...
                  </span>
                ) : (
                  simulation.eventsLog.map((event: any) => {
                    const color = event.severity === 'ERROR' ? '#F87171' : event.severity === 'WARNING' ? '#E8A045' : '#36C98E';
                    return (
                      <div key={event.id} style={{ display: 'flex', gap: '8px', fontSize: '9px', lineHeight: '1.2' }}>
                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>[{event.timestamp}]</span>
                        <span style={{ color, fontWeight: 700, flexShrink: 0 }}>[{event.type}]</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{event.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Col 4: Chaos Engineering Console */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
              04 // FAULT INJECTION
            </span>
            <ChaosPanel
              nodes={nodes}
              failedNodes={simulation.failedNodes}
              onToggleFailure={simulation.toggleNodeFailure}
            />
          </div>

        </div>
      )}

      {/* Global CSS animations helper */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.9); }
        }
      `}</style>

    </div>
  );
}
