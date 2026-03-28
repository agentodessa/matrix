export type Plan = "free" | "pro" | "pro_team";
export type BillingCycle = "monthly" | "annual";
export type SubscriptionStatus = "active" | "expired" | "cancelled";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Subscription {
  plan: Plan;
  billingCycle: BillingCycle;
  startDate: string;
  expiresAt: string;
  status: SubscriptionStatus;
  seatCount: number;
  seatPrice: number;
}

export const PRICING = {
  monthly: 4.99,
  annual: 39.99,
  seat: 2.99,
} as const;
