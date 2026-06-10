'use client';

import { create } from 'zustand';
import { SimulationWorkerBridge } from './workerBridge';

interface SimulationState {
  isRunning: boolean;
  trafficQps: number;
  scenario: string;
  failedNodes: string[];
  metricsHistory: any[];
  currentMetrics: any | null;
  bridge: SimulationWorkerBridge | null;

  startSimulation: (nodes: any[], edges: any[]) => void;
  stopSimulation: () => void;
  updateTraffic: (qps: number) => void;
  updateScenario: (scen: string) => void;
  toggleNodeFailure: (nodeId: string) => void;
  resetSimulation: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  isRunning: false,
  trafficQps: 1000,
  scenario: 'steady',
  failedNodes: [],
  metricsHistory: [],
  currentMetrics: null,
  bridge: null,

  startSimulation: (nodes, edges) => {
    const state = get();
    let currentBridge = state.bridge;

    if (!currentBridge) {
      currentBridge = new SimulationWorkerBridge();
      set({ bridge: currentBridge });
    }

    currentBridge.init(nodes, edges, state.trafficQps, state.scenario, state.failedNodes);
    
    currentBridge.start((metrics) => {
      set((prev) => {
        const history = [...prev.metricsHistory, metrics];
        // Limit history size to 30 ticks for charts readability
        if (history.length > 30) history.shift();
        
        return {
          currentMetrics: metrics,
          metricsHistory: history
        };
      });
    });

    set({ isRunning: true });
  },

  stopSimulation: () => {
    const { bridge } = get();
    if (bridge) {
      bridge.stop();
    }
    set({ isRunning: false });
  },

  updateTraffic: (qps) => {
    const { bridge } = get();
    set({ trafficQps: qps });
    if (bridge) {
      bridge.updateParams(qps, undefined, undefined);
    }
  },

  updateScenario: (scen) => {
    const { bridge } = get();
    set({ scenario: scen });
    if (bridge) {
      bridge.updateParams(undefined, scen, undefined);
    }
  },

  toggleNodeFailure: (nodeId) => {
    const { bridge, failedNodes } = get();
    const isFailed = failedNodes.includes(nodeId);
    const updated = isFailed 
      ? failedNodes.filter(id => id !== nodeId)
      : [...failedNodes, nodeId];

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
      failedNodes: []
    });
  }
}));
