'use client';

import { useEffect } from 'react';
import { useSimulationStore } from './simulationStore';

export function useSimulation(nodes: any[] = [], edges: any[] = []) {
  const {
    isRunning,
    trafficQps,
    scenario,
    failedNodes,
    metricsHistory,
    currentMetrics,
    startSimulation,
    stopSimulation,
    updateTraffic,
    updateScenario,
    toggleNodeFailure,
    resetSimulation
  } = useSimulationStore();

  // Sync node changes or failures with the worker if it's running
  useEffect(() => {
    return () => {
      // Auto-stop simulation on unmount
      stopSimulation();
    };
  }, [stopSimulation]);

  return {
    isRunning,
    trafficQps,
    scenario,
    failedNodes,
    metricsHistory,
    currentMetrics,
    start: () => startSimulation(nodes, edges),
    stop: stopSimulation,
    updateTraffic,
    updateScenario,
    toggleNodeFailure,
    reset: resetSimulation
  };
}
