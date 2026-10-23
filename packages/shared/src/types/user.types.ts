import { Role } from '../enums/roles.enum';
import { Plan } from '../enums/plan.enum';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: Role;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL';
  expiresAt?: Date;
  aiCreditsUsed: number;
  aiCreditsLimit: number;
}
