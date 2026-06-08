import { Plan } from '../enums/plan.enum';

export const PLAN_LIMITS = {
  [Plan.FREE]: {
    maxDesigns: 3,
    aiCredits: 10,
    collaboration: false,
    exportFormats: ['png']
  },
  [Plan.PRO]: {
    maxDesigns: 50,
    aiCredits: 200,
    collaboration: true,
    exportFormats: ['png', 'svg', 'pdf']
  },
  [Plan.TEAM]: {
    maxDesigns: 500,
    aiCredits: 1000,
    collaboration: true,
    exportFormats: ['png', 'svg', 'pdf']
  }
};
