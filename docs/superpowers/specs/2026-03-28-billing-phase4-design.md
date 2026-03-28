# Shared Boards — Phase 4: Pro Team Billing

## Overview

Add a Pro Team plan tier that replaces individual Pro. Owner pays $4.99/mo base + $2.99 per additional team member. Members get Pro features only within the team workspace, not in their personal workspace. Full billing UI wired to mock payment backend.

**Phased Roadmap:**

1. Phase 1 — Teams & Membership (done)
2. Phase 2 — Shared Data Layer (done)
3. Phase 3 — Permissions (done)
4. **Phase 4 — Pro Team Billing** (this spec)

## Key Decisions

- **Pro Team replaces Pro** — one subscription, not stacked. $4.99 base + $2.99/seat
- **Members get Pro in team workspace only** — calendar, cloud sync, unlimited projects work in team workspace. Personal workspace stays Free unless member pays individually
- **Seat = team member excluding owner** — owner is included in base price
- **Full billing UI with mock backend** — ready to swap in Stripe later
- **Auto-calculated seats** — seat count derived from team_members count minus owner

## Plan & Pricing

|                             | Free | Pro                   | Pro Team                 |
| --------------------------- | ---- | --------------------- | ------------------------ |
| Price                       | $0   | $4.99/mo or $39.99/yr | $4.99/mo + $2.99/seat/mo |
| Personal cloud sync         | no   | yes                   | yes                      |
| Personal calendar           | no   | yes                   | yes                      |
| Unlimited personal projects | no   | yes                   | yes                      |
| Team workspaces             | no   | no                    | yes                      |
| Team calendar/sync          | no   | no                    | yes                      |

Annual pricing for Pro Team: $39.99/yr base + $2.99/seat/mo (seats always monthly).

## Data Model Changes

### Modify `subscriptions` table

Add columns:

- `seat_count` INTEGER NOT NULL DEFAULT 0 — number of paid seats (members excluding owner)
- `seat_price` NUMERIC NOT NULL DEFAULT 2.99 — price per seat per month

### Update `src/types/user.ts`

```typescript
export type Plan = "free" | "pro" | "pro_team";

export const PRICING = {
  monthly: 4.99,
  annual: 39.99,
  seat: 2.99,
} as const;
```

## Billing Logic

### Seat Count Calculation

When members are added or removed from a team, the owner's `subscriptions.seat_count` is updated:

```
seat_count = (total team_members) - 1  // exclude owner
```

This happens in `teams-store.ts` mutations: after `inviteByEmail`/`acceptInvite`/`joinByCode` success (increment) and `removeMember`/`leaveTeam` success (decrement).

Alternatively, a Supabase trigger on `team_members` INSERT/DELETE could auto-update the seat count. Prefer the trigger approach — it's authoritative and can't be skipped.

### Payment Calculation

```
total = base_price + (seat_count × seat_price)
```

For monthly: `$4.99 + (seats × $2.99)`
For annual base + monthly seats: `$39.99/yr + (seats × $2.99/mo)`

### `mock-payment.ts` Update

`processPayment` receives the total amount. No changes needed to the mock — the amount calculation happens in the subscription store before calling payment.

## Feature Gating Changes

### `@/lib/features.ts`

Add `teamWorkspace` to pro-gated features. Update `isFeatureAvailable`:

```typescript
const PRO_FEATURES = {
  calendarFullView: true,
  cloudSync: true,
  unlimitedProjects: true,
};

const PRO_TEAM_FEATURES = {
  ...PRO_FEATURES,
  teamWorkspace: true,
};
```

`isFeatureAvailable(feature, plan)`:

- `"free"` — only free features
- `"pro"` — PRO_FEATURES
- `"pro_team"` — PRO_TEAM_FEATURES

### Team Creation Gating

Team creation (in `app/team.tsx`) requires Pro Team plan. If user is on Free or Pro, show upgrade prompt instead of create form.

### Workspace-Level Pro Features

When a member views a Pro Team workspace, they get Pro features even if their personal plan is Free. This is checked by looking at the team owner's subscription, not the member's own.

Add to workspace context or a new hook: `useWorkspaceProStatus()` that returns whether the active workspace has Pro features:

- Personal workspace: check user's own subscription
- Team workspace: check the team owner's subscription plan === "pro_team"

## Paywall Changes

### Three-Tier Display

Update paywall to show three plan cards:

1. **Free** — current features list
2. **Pro** ($4.99/mo) — personal Pro features
3. **Pro Team** ($4.99/mo + $2.99/seat) — everything in Pro + team workspaces

### Seat Pricing Breakdown

When Pro Team is selected, show:

- Base: $4.99/mo
- Seats: N × $2.99/mo = $X.XX/mo
- Total: $X.XX/mo

Seat count shown as current team member count (or 0 if no team yet).

### Upgrade/Downgrade Flows

- **Free → Pro**: existing flow, no changes
- **Free → Pro Team**: new flow, same payment mock
- **Pro → Pro Team**: upgrade prompt with seat pricing. One-tap upgrade since base price is same
- **Pro Team → Pro**: downgrade warning — team members will lose access to team workspaces. Confirmation required.

## Settings Changes

### `SubscriptionSection`

Show plan-specific info:

- Free: "Upgrade to Pro" (existing)
- Pro: "Pro Plan" + "Upgrade to Pro Team" link
- Pro Team: "Pro Team" + seat count + monthly seat cost

### Team Detail Screen

For owner: show billing summary at the top:

- "N members × $2.99/mo = $X.XX/mo"
- Link to paywall for plan management

## UI Translations

New keys: "Pro Team", "per seat", "seats", plan descriptions, upgrade/downgrade prompts, billing summary text.

## What's NOT Included

- Real Stripe/Apple Pay integration (still mocked)
- Invoicing / billing history
- Prorated seat changes mid-cycle
- Team-level annual seat pricing
- Seat limits / maximum team size
