import { api } from '@/lib/api';

export const simulationService = {
  async updateProgress(runId: string, tick: number) {
    await api.patch(`/simulation/runs/${runId}/progress`, { tick });
  },

  async stopRun(runId: string) {
    await api.post(`/simulation/runs/${runId}/stop`);
  },
};
