import { create } from 'zustand';
export const useSimulationStore = create((set) => ({ running: false }));
