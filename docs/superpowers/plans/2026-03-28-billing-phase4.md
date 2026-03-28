# Pro Team Billing (Phase 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Pro Team plan tier ($4.99/mo + $2.99/seat) with full billing UI, seat auto-calculation, feature gating for team workspaces, and upgrade/downgrade flows.

**Architecture:** Extend subscriptions table with seat columns. Add `"pro_team"` plan type. Update feature gating to handle three tiers + workspace-level Pro status. Rebuild paywall with three-tier comparison. Gate team creation behind Pro Team plan.

**Tech Stack:** Supabase (migration, trigger), React Query, mock-payment.ts

---

## File Structure

| Action | Path                                              | Purpose                                               |
| ------ | ------------------------------------------------- | ----------------------------------------------------- |
| Create | `supabase/migrations/009_pro_team_billing.sql`    | Add seat columns + auto-update trigger                |
| Modify | `src/types/user.ts`                               | Add `"pro_team"` plan, seat pricing                   |
| Modify | `src/lib/features.ts`                             | Three-tier feature gating + `teamWorkspace` feature   |
| Modify | `src/lib/subscription-store.ts`                   | Pro Team subscribe flow with seat count               |
| Modify | `src/lib/workspace-context.tsx`                   | Add `useWorkspaceProStatus()` for workspace-level Pro |
| Modify | `app/paywall.tsx`                                 | Three-tier plan display with seat pricing             |
| Modify | `src/components/settings/SubscriptionSection.tsx` | Show Pro Team info with seats                         |
| Modify | `app/team.tsx`                                    | Gate team creation behind Pro Team plan               |

---

### Task 1: Database migration — seat columns and trigger

**Files:**

- Create: `supabase/migrations/009_pro_team_billing.sql`

- [ ] **Step 1: Create migration**

```sql
-- Add seat columns to subscriptions
alter table public.subscriptions add column if not exists seat_count integer not null default 0;
alter table public.subscriptions add column if not exists seat_price numeric not null default 2.99;

-- Trigger: auto-update seat_count when team_members changes
create or replace function public.update_seat_count()
returns trigger as $$
declare
  v_team_id uuid;
  v_owner_id uuid;
  v_count integer;
begin
  -- Get the team_id from the affected row
  if tg_op = 'DELETE' then
    v_team_id := old.team_id;
  else
    v_team_id := new.team_id;
  end if;

  -- Get the team owner
  select owner_id into v_owner_id from public.teams where id = v_team_id;
  if v_owner_id is null then return coalesce(new, old); end if;

  -- Count members excluding owner
  select count(*) into v_count
  from public.team_members
  where team_id = v_team_id and user_id != v_owner_id;

  -- Update owner's subscription seat_count
  update public.subscriptions
  set seat_count = v_count
  where user_id = v_owner_id and plan = 'pro_team';

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger on_team_member_change_update_seats
  after insert or delete on public.team_members
  for each row execute function public.update_seat_count();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/009_pro_team_billing.sql
git commit -m "feat: add seat_count/seat_price columns and auto-update trigger"
```

---

### Task 2: Update types and pricing

**Files:**

- Modify: `src/types/user.ts`

- [ ] **Step 1: Update Plan type and PRICING**

Read the file. Then change:

```typescript
export type Plan = "free" | "pro" | "pro_team";
```

Update PRICING:

```typescript
export const PRICING = {
  monthly: 4.99,
  annual: 39.99,
  seat: 2.99,
} as const;
```

Add seat fields to `Subscription` interface:

```typescript
export interface Subscription {
  plan: Plan;
  billingCycle: BillingCycle;
  startDate: string;
  expiresAt: string;
  status: SubscriptionStatus;
  seatCount: number;
  seatPrice: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/user.ts
git commit -m "feat: add pro_team plan type with seat pricing"
```

---

### Task 3: Update feature gating

**Files:**

- Modify: `src/lib/features.ts`

- [ ] **Step 1: Add three-tier gating**

Read the file. Replace with:

```typescript
import { Plan } from "@/types/user";

const PRO_FEATURES = {
  calendarFullView: true,
  cloudSync: true,
  unlimitedProjects: true,
} as const;

const PRO_TEAM_FEATURES = {
  ...PRO_FEATURES,
  teamWorkspace: true,
} as const;

export type Feature = keyof typeof PRO_TEAM_FEATURES;

export const FREE_PROJECT_LIMIT = 2;

export const isFeatureAvailable = (feature: Feature, plan: Plan): boolean => {
  if (plan === "pro_team") return feature in PRO_TEAM_FEATURES;
  if (plan === "pro") return feature in PRO_FEATURES;
  return !(feature in PRO_TEAM_FEATURES);
};

export const canCreateProject = (projectCount: number, plan: Plan): boolean => {
  if (plan === "pro" || plan === "pro_team") return true;
  return projectCount < FREE_PROJECT_LIMIT;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/features.ts
git commit -m "feat: add three-tier feature gating with teamWorkspace feature"
```

---

### Task 4: Update subscription store

**Files:**

- Modify: `src/lib/subscription-store.ts`

- [ ] **Step 1: Update store for Pro Team**

Read the file. Make these changes:

**`getPlan`**: Handle `"pro_team"`:

```typescript
const getPlan = (sub: Subscription | null): Plan => {
  if (!sub || sub.status !== "active") return "free";
  if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) return "free";
  if (sub.plan === "pro_team") return "pro_team";
  if (sub.plan === "pro") return "pro";
  return "free";
};
```

**`mapRow`**: Handle `"pro_team"` and seat fields:

```typescript
const mapRow = (row: Record<string, unknown>): Subscription => {
  const plan = row.plan as string;
  return {
    plan: plan === "pro_team" ? "pro_team" : plan === "pro" ? "pro" : "free",
    billingCycle: (row.billing_cycle as BillingCycle) ?? "monthly",
    startDate: (row.start_date as string) ?? "",
    expiresAt: (row.expires_at as string) ?? "",
    status: (row.status as Subscription["status"]) ?? "active",
    seatCount: (row.seat_count as number) ?? 0,
    seatPrice: (row.seat_price as number) ?? 2.99,
  };
};
```

**`subscribeMutation`**: Add `planType` parameter, calculate total with seats:

```typescript
mutationFn: async ({ billingCycle, paymentMethod, planType }: { billingCycle: BillingCycle; paymentMethod: PaymentMethod; planType: "pro" | "pro_team" }) => {
  if (!userId) throw new Error("Not authenticated");

  const baseAmount = billingCycle === "monthly" ? PRICING.monthly : PRICING.annual;
  // For pro_team, seat charges are calculated but not added to initial payment
  // Seats are billed separately (seats are always monthly)
  const amount = baseAmount;
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
      plan: planType,
      billing_cycle: billingCycle,
      status: "active",
      start_date: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      stripe_subscription_id: result.transactionId,
    }, { onConflict: "user_id" });

  if (error) throw new Error(error.message);
  ...
```

Update the `subscribe` function signature:

```typescript
subscribe: async (billingCycle: BillingCycle, paymentMethod: PaymentMethod, planType: "pro" | "pro_team" = "pro") => {
  try {
    await subscribeMutation.mutateAsync({ billingCycle, paymentMethod, planType });
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
},
```

Update `isPro` to include pro_team:

```typescript
isPro: plan === "pro" || plan === "pro_team",
isProTeam: plan === "pro_team",
```

Update `restorePurchase` to check for both plans:

```typescript
if (fresh && (fresh.plan === "pro" || fresh.plan === "pro_team") && fresh.status === "active") {
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/subscription-store.ts
git commit -m "feat: update subscription store for Pro Team plan with seat support"
```

---

### Task 5: Add workspace-level Pro status

**Files:**

- Modify: `src/lib/workspace-context.tsx`

- [ ] **Step 1: Add useWorkspaceProStatus hook**

Read the file. This hook determines if the active workspace has Pro features:

- Personal workspace: check user's own subscription
- Team workspace: always has Pro features (owner pays for Pro Team)

Add a new exported hook after `useWorkspaceRole`:

```typescript
export const useWorkspaceProStatus = () => {
  const { workspaceType } = useWorkspace();
  // Team workspaces always have Pro features (owner has Pro Team)
  // Personal workspaces check user's own subscription via useSubscription
  return workspaceType === "team" ? true : null; // null = defer to user's own plan
};
```

This returns `true` for team workspaces (Pro features enabled) or `null` for personal (caller checks their own plan).

Actually, simpler approach: just export `workspaceType` (already available via `useWorkspace`) and let callers check. The `ProGate` component and `useProStatus` already handle personal plan checks. We just need team workspaces to bypass the Pro gate.

Update `src/lib/use-pro-status.ts` instead — read it first and add workspace awareness:

Read `src/lib/use-pro-status.ts`. If the active workspace is `"team"`, treat as Pro regardless of the user's personal plan.

Import `useWorkspace` and check:

```typescript
const { workspaceType } = useWorkspace();
// Team workspaces always have Pro features
if (workspaceType === "team") return { userId, isPro: true };
```

Add this before the existing Pro check logic.

- [ ] **Step 2: Commit**

```bash
git add src/lib/use-pro-status.ts
git commit -m "feat: team workspaces bypass Pro gate for members"
```

---

### Task 6: Update paywall with three-tier display

**Files:**

- Modify: `app/paywall.tsx`

- [ ] **Step 1: Rebuild paywall with three plans**

Read the current file. Major changes:

1. Add `isProTeam` from `useSubscription()`
2. Add `selectedPlan` state: `"pro" | "pro_team"`
3. Add Pro Team features list:

```typescript
const FEATURES_TEAM = [
  t("Everything in Pro"),
  t("Team workspaces"),
  t("Shared task boards"),
  t("Team calendar"),
];
```

4. Add seat pricing display when Pro Team is selected:

```typescript
const seatCount = sub?.seatCount ?? 0;
const seatTotal = seatCount * PRICING.seat;
const totalMonthly = selectedPlan === "pro_team" ? PRICING.monthly + seatTotal : price;
```

5. Show three plan cards: Free, Pro, Pro Team (Pro Team has seat pricing line)

6. If already on Pro, show "Upgrade to Pro Team" option
7. If already on Pro Team, show current plan with seat count

8. Update `handleSubscribe` to pass `selectedPlan`:

```typescript
const result = await subscribe(billingCycle, method, selectedPlan);
```

9. Add downgrade flow: Pro Team → Pro with confirmation warning about team access loss

The paywall is complex — provide the full updated JSX in the implementation. Key sections:

- isPro && !isProTeam view: show upgrade to Pro Team option
- isProTeam view: show current plan with seat info
- Default view: three-tier comparison with plan selector

- [ ] **Step 2: Commit**

```bash
git add app/paywall.tsx
git commit -m "feat: rebuild paywall with three-tier Pro Team display"
```

---

### Task 7: Update SubscriptionSection

**Files:**

- Modify: `src/components/settings/SubscriptionSection.tsx`

- [ ] **Step 1: Show Pro Team info**

Read the current file. Update to handle three states:

```typescript
import { useSubscription } from "@/lib/subscription-store";
import { PRICING } from "@/types/user";
```

Get `isProTeam` and `subscription` from `useSubscription()`.

Show:

- Free: "Upgrade to Pro" (existing)
- Pro: "Pro Plan" subtitle + "Upgrade to Pro Team" as secondary text
- Pro Team: "Pro Team" subtitle with seat count: "N seats × $2.99/mo"

```tsx
<Text className="font-body text-base font-bold text-heading">
  {isProTeam ? t("Pro Team") : isPro ? t("Pro Plan") : t("Upgrade to Pro")}
</Text>
<Text className="font-body text-sm text-body">
  {isProTeam
    ? t("{{count}} seats × ${{price}}/mo", { count: subscription?.seatCount ?? 0, price: PRICING.seat.toFixed(2) })
    : isPro
    ? t("Upgrade to Pro Team for shared boards")
    : t("Calendar, cloud sync, and more — $4.99/mo")}
</Text>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/settings/SubscriptionSection.tsx
git commit -m "feat: show Pro Team plan info with seat count in Settings"
```

---

### Task 8: Gate team creation behind Pro Team

**Files:**

- Modify: `app/team.tsx`

- [ ] **Step 1: Add Pro Team gating to team creation**

Read the current file. Add:

```typescript
import { useSubscription } from "@/lib/subscription-store";
```

Inside `TeamScreen`:

```typescript
const { isProTeam } = useSubscription();
```

Wrap the "Create Team" section: if not on Pro Team, show an upgrade prompt instead of the create form:

```tsx
{isProTeam ? (
  // existing create team section (input + button)
) : (
  <View className="gap-3">
    <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
      {t("New Team")}
    </Text>
    <View className="bg-bg-card rounded-lg p-5 gap-3">
      <Text className="font-body text-sm font-bold text-heading">{t("Pro Team required")}</Text>
      <Text className="font-body text-sm text-body">{t("Upgrade to Pro Team to create and manage teams.")}</Text>
      <Pressable
        className="bg-success rounded-lg py-3 items-center active:opacity-80"
        onPress={() => router.push("/paywall")}
      >
        <Text className="font-body text-sm font-bold text-bg">{t("Upgrade to Pro Team")}</Text>
      </Pressable>
    </View>
  </View>
)}
```

Note: accepting invites and joining existing teams should still work for non-Pro-Team users (they're members, not owners). Only team CREATION requires Pro Team.

- [ ] **Step 2: Commit**

```bash
git add app/team.tsx
git commit -m "feat: gate team creation behind Pro Team plan"
```

---

### Task 9: Extract translations and verify build

**Files:**

- Modify: `src/locales/{en,es,fr,ru}.json`

- [ ] **Step 1: Run extraction**

```bash
npm run i18n:extract
```

- [ ] **Step 2: Fill empty translations**

New keys to translate:

- "Pro Team"
- "Everything in Pro"
- "Team workspaces"
- "Shared task boards"
- "Team calendar"
- "Upgrade to Pro Team"
- "Upgrade to Pro Team for shared boards"
- "Pro Team required"
- "Upgrade to Pro Team to create and manage teams."
- "{{count}} seats × ${{price}}/mo"
- "per seat/mo"
- Any other new keys found in extraction

- [ ] **Step 3: Verify build**

```bash
npx expo export --platform ios
```

- [ ] **Step 4: Commit**

```bash
git add src/locales/ app/paywall.tsx
git commit -m "feat: Pro Team Billing Phase 4 complete"
```
