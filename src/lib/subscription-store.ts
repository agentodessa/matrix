import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { Plan, BillingCycle, Subscription, PRICING } from "../types/user";
import { processPayment, PaymentMethod } from "./mock-payment";
import { useAuth } from "./auth-store";

/* ── Helpers ── */

const getPlan = (sub: Subscription | null): Plan => {
  if (sub && sub.plan === "pro" && sub.status === "active") {
    if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) return "free";
    return "pro";
  }
  return "free";
};

const mapRow = (row: Record<string, unknown>): Subscription => {
  return {
    plan: (row.plan as string) === "pro" ? "pro" : "free",
    billingCycle: (row.billing_cycle as BillingCycle) ?? "monthly",
    startDate: (row.start_date as string) ?? "",
    expiresAt: (row.expires_at as string) ?? "",
    status: (row.status as Subscription["status"]) ?? "active",
  };
};

async function fetchSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return mapRow(data);
}

/* ── Hook ── */

export const useSubscription = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data: sub = null } = useQuery<Subscription | null>({
    queryKey: ["subscription", userId],
    queryFn: () => fetchSubscription(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes — subscriptions rarely change
    gcTime: 1000 * 60 * 30,
  });

  const plan = getPlan(sub);

  const subscribeMutation = useMutation({
    mutationFn: async ({ billingCycle, paymentMethod }: { billingCycle: BillingCycle; paymentMethod: PaymentMethod }) => {
      if (!userId) throw new Error("Not authenticated");

      const amount = billingCycle === "monthly" ? PRICING.monthly : PRICING.annual;
      const result = await processPayment(amount, paymentMethod);
      if (!result.success) throw new Error(result.error ?? "Payment failed");

      const now = new Date();
      const expiresAt = new Date(now);
      if (billingCycle === "monthly") expiresAt.setMonth(expiresAt.getMonth() + 1);
      else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { error } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan: "pro",
          billing_cycle: billingCycle,
          status: "active",
          start_date: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          stripe_subscription_id: result.transactionId,
        }, { onConflict: "user_id" });

      if (error) throw new Error(error.message);

      return {
        plan: "pro" as const,
        billingCycle,
        startDate: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: "active" as const,
      };
    },
    onSuccess: (newSub) => {
      qc.setQueryData(["subscription", userId], newSub);
      // Invalidate tasks/projects so they switch to cloud mode
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.setQueryData<Subscription | null>(["subscription", userId], (old) =>
        old ? { ...old, status: "cancelled" } : null
      );
    },
  });

  return {
    subscription: sub,
    plan,
    isPro: plan === "pro",

    subscribe: async (billingCycle: BillingCycle, paymentMethod: PaymentMethod) => {
      try {
        await subscribeMutation.mutateAsync({ billingCycle, paymentMethod });
        return { success: true, error: null };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Failed" };
      }
    },

    cancelSubscription: async () => {
      try { await cancelMutation.mutateAsync(); } catch {}
    },

    restorePurchase: async () => {
      await qc.invalidateQueries({ queryKey: ["subscription"] });
      if (!userId) return { success: false };
      const fresh = await fetchSubscription(userId);
      if (fresh && fresh.plan === "pro" && fresh.status === "active") {
        qc.setQueryData(["subscription", userId], fresh);
        return { success: true };
      }
      return { success: false };
    },
  };
};
