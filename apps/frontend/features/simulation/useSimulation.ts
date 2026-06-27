'use client';

import { useEffect } from 'react';
import { useSimulationStore } from './simulationStore';

export function useSimulation(nodes: any[] = [], edges: any[] = []) {
  const {
    isRunning,
    trafficQps,
    scenario,
    failedNodes,
    nodeChaosModes,
    metricsHistory,
    currentMetrics,
    eventsLog,
    startSimulation,
    stopSimulation,
    updateTraffic,
    updateScenario,
    toggleNodeFailure,
    setNodeChaos,
    resetSimulation,
    // FIX: Expose health tracking
    workerError,
    isPaused,
    lastTickAt,
    startupPhase,
  } = useSimulationStore();

  const addEvent = useSimulationStore((s) => s.addEvent);
  const updateGraph = useSimulationStore((s) => s.updateGraph);

  // Sync node/edge changes with the worker if simulation is running
  useEffect(() => {
    if (isRunning) {
      updateGraph(nodes, edges);
    }
  }, [nodes, edges, isRunning, updateGraph]);

  // Auto-stop simulation on unmount
  useEffect(() => {
    return () => {
      stopSimulation();
    };
  }, [stopSimulation]);

  return {
    isRunning,
    trafficQps,
    scenario,
    failedNodes,
    nodeChaosModes,
    metricsHistory,
    currentMetrics,
    eventsLog,
    // FIX: Expose health tracking to UI
    workerError,
    isPaused,
    lastTickAt,
    startupPhase,
    addEvent,
    start: () => startSimulation(nodes, edges),
    stop: stopSimulation,
    updateTraffic,
    updateScenario,
    toggleNodeFailure,
    setNodeChaos,
    reset: resetSimulation
  };
}
