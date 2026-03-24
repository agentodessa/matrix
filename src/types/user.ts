export type Plan = "free" | "pro";
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
}

export const PRICING = {
  monthly: 4.99,
  annual: 39.99, // ~$3.33/mo — save 33%
} as const;
