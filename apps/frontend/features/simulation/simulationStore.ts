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
  metricsHistory: any[];
  currentMetrics: any | null;
  eventsLog: SimulationEvent[];
  bridge: SimulationWorkerBridge | null;

  startSimulation: (nodes: any[], edges: any[]) => void;
  stopSimulation: () => void;
  updateTraffic: (qps: number) => void;
  updateScenario: (scen: string) => void;
  toggleNodeFailure: (nodeId: string) => void;
  resetSimulation: () => void;
  addEvent: (type: string, message: string, severity?: 'INFO' | 'WARNING' | 'ERROR') => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  isRunning: false,
  trafficQps: 1000,
  scenario: 'steady',
  failedNodes: [],
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

    currentBridge.init(nodes, edges, state.trafficQps, state.scenario, state.failedNodes);
    
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
    const { bridge, addEvent } = get();
    set({ trafficQps: qps });
    addEvent('CONFIG', `Input traffic adjusted to ${qps.toLocaleString()} QPS`, 'INFO');
    if (bridge) {
      bridge.updateParams(qps, undefined, undefined);
    }
  },

  updateScenario: (scen) => {
    const { bridge, addEvent } = get();
    set({ scenario: scen });
    addEvent('SCENARIO', `Profile switched to: ${scen.toUpperCase()}`, 'WARNING');
    if (bridge) {
      bridge.updateParams(undefined, scen, undefined);
    }
  },

  toggleNodeFailure: (nodeId) => {
    const { bridge, failedNodes, addEvent } = get();
    const isFailed = failedNodes.includes(nodeId);
    const updated = isFailed 
      ? failedNodes.filter(id => id !== nodeId)
      : [...failedNodes, nodeId];

    if (isFailed) {
      addEvent('CHAOS', `Node healed: ${nodeId}`, 'INFO');
    } else {
      addEvent('CHAOS', `CRITICAL: Injected failure into node ${nodeId}`, 'ERROR');
    }

    set({ failedNodes: updated });
    if (bridge) {
      bridge.updateParams(undefined, undefined, updated);
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
      eventsLog: []
    });
  }
}));
