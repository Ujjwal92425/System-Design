'use client';

import { create } from 'zustand';
import { SimulationWorkerBridge } from './workerBridge';

interface SimulationEvent {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
}

const METRICS_HISTORY_CAP = 120;

function filterSimNodes(nodes: any[]) {
  return nodes.filter((n) => {
    const nodeType = n.data?.nodeType || n.type;
    return nodeType !== 'NOTE' && nodeType !== 'GROUP';
  });
}

// FIX: Expanded entry point types — now includes API_GATEWAY, REVERSE_PROXY, CDN
// and LOAD_BALANCER as valid traffic origins. Previously only WEB_SERVER/CLIENT
// types were accepted, which caused the simulation to silently refuse to start
// for valid architectures that start with a gateway or CDN.
const ENTRY_POINT_TYPES = new Set([
  'WEB_SERVER', 'CLIENT', 'BROWSER', 'MOBILE_APP', 'DESKTOP_APP',
  'API_GATEWAY', 'REVERSE_PROXY', 'CDN', 'LOAD_BALANCER',
]);

function hasEntryPoint(nodes: any[]) {
  return filterSimNodes(nodes).some((n) => {
    const t = (n.data?.nodeType || n.type).toUpperCase();
    return ENTRY_POINT_TYPES.has(t);
  });
}

interface SimulationState {
  isRunning: boolean;
  trafficQps: number;
  scenario: string;
  failedNodes: string[];
  nodeChaosModes: Record<string, string>;
  metricsHistory: any[];
  currentMetrics: any | null;
  eventsLog: SimulationEvent[];
  bridge: SimulationWorkerBridge | null;
  // FIX: Added health/timeout tracking
  workerError: string | null;
  isPaused: boolean;
  lastTickAt: number | null;
  startupPhase: 'idle' | 'starting' | 'running' | 'error';

  startSimulation: (nodes: any[], edges: any[]) => void;
  stopSimulation: () => void;
  updateTraffic: (qps: number) => void;
  updateScenario: (scen: string) => void;
  toggleNodeFailure: (nodeId: string) => void;
  setNodeChaos: (nodeId: string, mode: string) => void;
  updateGraph: (nodes: any[], edges: any[]) => void;
  resetSimulation: () => void;
  addEvent: (type: string, message: string, severity?: 'INFO' | 'WARNING' | 'ERROR') => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  isRunning: false,
  trafficQps: 1000,
  scenario: 'constant',
  failedNodes: [],
  nodeChaosModes: {},
  metricsHistory: [],
  currentMetrics: null,
  eventsLog: [],
  bridge: null,
  // FIX: Added health/timeout tracking fields
  workerError: null,
  isPaused: false,
  lastTickAt: null,
  startupPhase: 'idle',

  addEvent: (type, message, severity = 'INFO') => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newEvent: SimulationEvent = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: timeStr,
      type,
      message,
      severity
    };
    set((state) => ({
      eventsLog: [newEvent, ...state.eventsLog].slice(0, 50) // Limit to last 50 events
    }));
  },

  startSimulation: (nodes, edges) => {
    const state = get();
    const simNodes = filterSimNodes(nodes);

    if (simNodes.length === 0) {
      get().addEvent('SYSTEM', 'No architecture nodes found. Add components to the canvas first.', 'ERROR');
      return;
    }
    if (!hasEntryPoint(nodes)) {
      get().addEvent('SYSTEM', 'No entry point found. Add a Web Server or Client node.', 'ERROR');
      return;
    }

    let currentBridge = state.bridge;

    if (!currentBridge) {
      currentBridge = new SimulationWorkerBridge();

      // FIX: Wire error/paused callbacks so worker crashes surface in the UI
      currentBridge.onError((error: any) => {
        const msg = error.message || 'Unknown worker error';
        get().addEvent('WORKER', `Simulation worker error: ${msg}`, 'ERROR');
        set({ workerError: msg, isRunning: false, startupPhase: 'error', isPaused: true });
      });

      currentBridge.onPaused((reason: any) => {
        const msg = reason?.reason || 'Simulation paused due to error';
        get().addEvent('WORKER', msg, 'ERROR');
        set({ isPaused: true, startupPhase: 'error' });
      });

      set({ bridge: currentBridge });
    }

    // Reset state before starting
    set({
      eventsLog: [],
      workerError: null,
      isPaused: false,
      lastTickAt: null,
      startupPhase: 'starting',
    });
    const addEventFn = get().addEvent;
    addEventFn('SYSTEM', 'Simulation started. Monitoring graph nodes...', 'INFO');

    currentBridge.init(simNodes, edges, state.trafficQps, state.scenario, state.failedNodes, state.nodeChaosModes);
    
    currentBridge.start((metrics) => {
      set((prev) => {
        // Record last tick time for health monitoring
        const now = Date.now();

        // Forward worker-generated events (OOM, GC, HPA, etc.) to the event log
        if (metrics.events?.length) {
          metrics.events.forEach((evt: any) => {
            const sev = evt.severity === 'ERROR' ? 'ERROR' : evt.severity === 'WARNING' ? 'WARNING' : 'INFO';
            addEventFn(evt.type || 'ALERT', evt.message, sev);
          });
        }

        const history = [...prev.metricsHistory, metrics];
        if (history.length > METRICS_HISTORY_CAP) history.shift();
        
        // Auto-check metrics for alerts
        const prevMetrics = prev.currentMetrics;
        if (prevMetrics && prevMetrics.systemHealth !== metrics.systemHealth) {
          const sev = metrics.systemHealth === 'RED' ? 'ERROR' : metrics.systemHealth === 'YELLOW' ? 'WARNING' : 'INFO';
          addEventFn('HEALTH', `System health transition: ${prevMetrics.systemHealth} ➜ ${metrics.systemHealth}`, sev);
        }

        // Check node specific warnings
        metrics.nodes.forEach((node: any) => {
          const prevNode = prevMetrics?.nodes?.find((n: any) => n.id === node.id);
          
          if (node.errorRate > 30 && (!prevNode || prevNode.errorRate <= 30)) {
            addEventFn('ALERT', `${node.label} error rate critical: ${node.errorRate}%`, 'ERROR');
          }
          if (node.cpu > 90 && (!prevNode || prevNode.cpu <= 90)) {
            addEventFn('ALERT', `${node.label} CPU capacity saturated (utilization > 90%)`, 'WARNING');
          }
        });
        
        return {
          currentMetrics: metrics,
          metricsHistory: history,
          lastTickAt: now,
          startupPhase: 'running',
        };
      });
    }, () => {
      addEventFn('SYSTEM', 'Simulation completed after 300 ticks.', 'INFO');
      set({ isRunning: false, startupPhase: 'idle' });
    });

    set({ isRunning: true });
  },

  stopSimulation: () => {
    const { bridge, addEvent } = get();
    if (bridge) {
      bridge.stop();
    }
    addEvent('SYSTEM', 'Simulation stopped by user', 'INFO');
    set({ isRunning: false });
  },

  updateTraffic: (qps) => {
    const { bridge, addEvent, nodeChaosModes, isRunning } = get();
    set({ trafficQps: qps });
    if (isRunning) {
      addEvent('CONFIG', `Input traffic adjusted to ${qps.toLocaleString()} QPS`, 'INFO');
      bridge?.updateParams(qps, undefined, undefined, nodeChaosModes);
    }
  },

  updateScenario: (scen) => {
    const { bridge, addEvent, nodeChaosModes, isRunning, trafficQps } = get();
    set({ scenario: scen });
    if (isRunning) {
      addEvent('SCENARIO', `Load profile: ${scen.toUpperCase()} (base ${trafficQps.toLocaleString()} QPS)`, 'INFO');
      bridge?.updateParams(undefined, scen, undefined, nodeChaosModes);
    }
  },

  setNodeChaos: (nodeId, mode) => {
    const { bridge, nodeChaosModes, addEvent } = get();
    const isActive = mode !== 'none';
    const updated = { ...nodeChaosModes };
    if (isActive) {
      updated[nodeId] = mode;
    } else {
      delete updated[nodeId];
    }
    const updatedFailed = Object.entries(updated)
      .filter(([, m]) => m === 'KILL')
      .map(([id]) => id);

    if (isActive) {
      addEvent('CHAOS', `Injected ${mode} fault into node ${nodeId}`, 'ERROR');
    } else {
      addEvent('CHAOS', `Node healed: ${nodeId}`, 'INFO');
    }

    set({ nodeChaosModes: updated, failedNodes: updatedFailed });
    if (bridge) {
      bridge.updateParams(undefined, undefined, updatedFailed, updated);
    }
  },

  toggleNodeFailure: (nodeId) => {
    const { nodeChaosModes, addEvent } = get();
    const currentMode = nodeChaosModes[nodeId];
    get().setNodeChaos(nodeId, currentMode ? 'none' : 'KILL');
  },

  updateGraph: (nodes: any[], edges: any[]) => {
    const { bridge } = get();
    if (bridge) {
      bridge.updateGraph(filterSimNodes(nodes), edges);
    }
  },

  resetSimulation: () => {
    const { bridge } = get();
    if (bridge) {
      bridge.stop();
    }
    set({
      isRunning: false,
      metricsHistory: [],
      currentMetrics: null,
      failedNodes: [],
      nodeChaosModes: {},
      eventsLog: [],
      // FIX: Reset health tracking fields
      workerError: null,
      isPaused: false,
      lastTickAt: null,
      startupPhase: 'idle',
    });
  }
}));
