import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Plan, BillingCycle, Subscription, PRICING } from "../types/user";
import { processPayment, PaymentMethod } from "./mock-payment";

const STORAGE_KEY = "@executive_subscription";

let globalSubscription: Subscription | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

async function loadSubscription(): Promise<Subscription | null> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    const sub: Subscription = JSON.parse(json);
    // Check expiry
    if (new Date(sub.expiresAt) < new Date()) {
      sub.status = "expired";
    }
    return sub;
  } catch {
    return null;
  }
}

async function saveSubscription(sub: Subscription | null) {
  try {
    if (sub) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

function getPlan(sub: Subscription | null): Plan {
  if (sub && sub.status === "active" && new Date(sub.expiresAt) > new Date()) {
    return "pro";
  }
  return "free";
}

export function useSubscription() {
  const [, forceUpdate] = useState(0);
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listenerRef.current = listener;
    listeners.add(listener);

    if (!initialized) {
      initialized = true;
      loadSubscription().then((loaded) => {
        globalSubscription = loaded;
        notify();
      });
    }

    return () => {
      if (listenerRef.current) listeners.delete(listenerRef.current);
    };
  }, []);

  const plan = getPlan(globalSubscription);

  return {
    subscription: globalSubscription,
    plan,
    isPro: plan === "pro",

    subscribe: async (billingCycle: BillingCycle, paymentMethod: PaymentMethod) => {
      const amount = billingCycle === "monthly" ? PRICING.monthly : PRICING.annual;
      const result = await processPayment(amount, paymentMethod);

      if (!result.success) {
        return { success: false, error: result.error ?? "Payment failed" };
      }

      const now = new Date();
      const expiresAt = new Date(now);
      if (billingCycle === "monthly") {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      const sub: Subscription = {
        plan: "pro",
        billingCycle,
        startDate: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: "active",
      };

      globalSubscription = sub;
      await saveSubscription(sub);
      notify();
      return { success: true, error: null };
    },

    cancelSubscription: async () => {
      if (globalSubscription) {
        globalSubscription = { ...globalSubscription, status: "cancelled" };
        await saveSubscription(globalSubscription);
        notify();
      }
    },

    restorePurchase: async () => {
      const sub = await loadSubscription();
      if (sub && sub.status === "active" && new Date(sub.expiresAt) > new Date()) {
        globalSubscription = sub;
        notify();
        return { success: true };
      }
      return { success: false };
    },
  };
}
