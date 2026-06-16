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
  scenario: 'steady',
  failedNodes: [],
  nodeChaosModes: {},
  metricsHistory: [],
  currentMetrics: null,
  eventsLog: [],
  bridge: null,

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
    let currentBridge = state.bridge;

    if (!currentBridge) {
      currentBridge = new SimulationWorkerBridge();
      set({ bridge: currentBridge });
    }

    // Reset log and add start event
    set({ eventsLog: [] });
    const addEventFn = get().addEvent;
    addEventFn('SYSTEM', 'Simulation started. Monitoring graph nodes...', 'INFO');

    currentBridge.init(nodes, edges, state.trafficQps, state.scenario, state.failedNodes, state.nodeChaosModes);
    
    currentBridge.start((metrics) => {
      set((prev) => {
        const history = [...prev.metricsHistory, metrics];
        if (history.length > 30) history.shift();
        
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
          metricsHistory: history
        };
      });
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
    const { bridge, addEvent, nodeChaosModes } = get();
    set({ trafficQps: qps });
    addEvent('CONFIG', `Input traffic adjusted to ${qps.toLocaleString()} QPS`, 'INFO');
    if (bridge) {
      bridge.updateParams(qps, undefined, undefined, nodeChaosModes);
    }
  },

  updateScenario: (scen) => {
    const { bridge, addEvent, nodeChaosModes } = get();
    set({ scenario: scen });
    addEvent('SCENARIO', `Profile switched to: ${scen.toUpperCase()}`, 'WARNING');
    if (bridge) {
      bridge.updateParams(undefined, scen, undefined, nodeChaosModes);
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
      bridge.updateGraph(nodes, edges);
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
      eventsLog: []
    });
  }
}));
