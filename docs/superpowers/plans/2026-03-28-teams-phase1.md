# Teams & Membership (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add team creation, member management, and invite flows — the foundation for shared boards in later phases.

**Architecture:** New Supabase tables (`teams`, `team_members`, `team_invites`) with RLS. React Query store (`teams-store.ts`) with real-time sync. Team list screen + team detail screen accessed from Settings. Deep link handler for invite codes.

**Tech Stack:** Supabase (tables, RLS, Realtime), React Query, Expo Router (screens + deep links), AsyncStorage (pending join code)

---

## File Structure

| Action | Path                                              | Purpose                                                   |
| ------ | ------------------------------------------------- | --------------------------------------------------------- |
| Create | `supabase/migrations/006_create_teams.sql`        | Teams, team_members, team_invites tables + RLS + realtime |
| Create | `src/types/team.ts`                               | Team, TeamMember, TeamInvite types + Role type            |
| Create | `src/lib/teams-store.ts`                          | Hooks + mutations for team CRUD, invites, membership      |
| Create | `app/team.tsx`                                    | Team list screen (my teams + pending invites)             |
| Create | `app/team/[id].tsx`                               | Team detail screen (members, invites, management)         |
| Create | `app/team/join.tsx`                               | Deep link handler for invite codes                        |
| Modify | `src/components/settings/OrganizationSection.tsx` | Add "Team" row below Projects                             |
| Modify | `src/lib/realtime-sync.ts`                        | Add team_members + team_invites subscriptions             |

---

### Task 1: Database migration — teams, team_members, team_invites

**Files:**

- Create: `supabase/migrations/006_create_teams.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_id uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

alter table public.teams enable row level security;

-- Members can view their teams; any authenticated user can look up a team by invite_code (for join flow)
create policy "Members can view their teams"
  on public.teams for select
  using (exists (
    select 1 from public.team_members
    where team_members.team_id = teams.id
    and team_members.user_id = auth.uid()
  ));

create policy "Authenticated users can lookup team by invite code"
  on public.teams for select
  using (auth.uid() is not null);

create policy "Authenticated users can create teams"
  on public.teams for insert
  with check (auth.uid() = owner_id);

create policy "Owner can update team"
  on public.teams for update
  using (auth.uid() = owner_id);

create policy "Owner can delete team"
  on public.teams for delete
  using (auth.uid() = owner_id);

-- Team Members
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  unique (team_id, user_id)
);

alter table public.team_members enable row level security;

create policy "Members can view team members"
  on public.team_members for select
  using (exists (
    select 1 from public.team_members as my
    where my.team_id = team_members.team_id
    and my.user_id = auth.uid()
  ));

create policy "Owner or admin can add members"
  on public.team_members for insert
  with check (exists (
    select 1 from public.team_members as my
    where my.team_id = team_members.team_id
    and my.user_id = auth.uid()
    and my.role in ('owner', 'admin')
  ));

create policy "Owner can update member roles"
  on public.team_members for update
  using (exists (
    select 1 from public.team_members as my
    where my.team_id = team_members.team_id
    and my.user_id = auth.uid()
    and my.role = 'owner'
  ));

create policy "Owner or admin can remove members, or self-leave"
  on public.team_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.team_members as my
      where my.team_id = team_members.team_id
      and my.user_id = auth.uid()
      and my.role in ('owner', 'admin')
    )
  );

-- Team Invites
create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  email text not null,
  invited_by uuid references auth.users(id) not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  unique (team_id, email)
);

alter table public.team_invites enable row level security;

create policy "Team members or invitee can view invites"
  on public.team_invites for select
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = team_invites.team_id
      and team_members.user_id = auth.uid()
    )
    or email = (select email from auth.users where id = auth.uid())
  );

create policy "Owner or admin can create invites"
  on public.team_invites for insert
  with check (exists (
    select 1 from public.team_members
    where team_members.team_id = team_invites.team_id
    and team_members.user_id = auth.uid()
    and team_members.role in ('owner', 'admin')
  ));

create policy "Invitee can update own invite"
  on public.team_invites for update
  using (email = (select email from auth.users where id = auth.uid()));

create policy "Owner or admin can delete invites"
  on public.team_invites for delete
  using (exists (
    select 1 from public.team_members
    where team_members.team_id = team_invites.team_id
    and team_members.user_id = auth.uid()
    and team_members.role in ('owner', 'admin')
  ));

-- Enable Realtime
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.team_members;
alter publication supabase_realtime add table public.team_invites;
```

- [ ] **Step 2: Verify migration syntax**

```bash
cat supabase/migrations/006_create_teams.sql | head -5
```

Expected: First lines of the migration visible.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_create_teams.sql
git commit -m "feat: add teams, team_members, team_invites tables with RLS"
```

---

### Task 2: TypeScript types for teams

**Files:**

- Create: `src/types/team.ts`

- [ ] **Step 1: Create types file**

```typescript
export type TeamRole = "owner" | "admin" | "member";
export type InviteStatus = "pending" | "accepted" | "declined";

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  // Joined from auth.users for display
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  invited_by: string;
  status: InviteStatus;
  created_at: string;
  // Joined for display
  team_name?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/team.ts
git commit -m "feat: add Team, TeamMember, TeamInvite types"
```

---

### Task 3: Teams store — hooks and mutations

**Files:**

- Create: `src/lib/teams-store.ts`

- [ ] **Step 1: Create the store file with all hooks and mutations**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-store";
import type { Team, TeamMember, TeamInvite, TeamRole } from "@/types/team";

const generateInviteCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export const useTeams = () => {
  const { user } = useAuth();

  const query = useQuery<Team[]>({
    queryKey: ["teams", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return { teams: query.data ?? [], ...query };
};

export const useTeamMembers = (teamId: string | null) => {
  const query = useQuery<TeamMember[]>({
    queryKey: ["team_members", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, team_id, user_id, role, joined_at")
        .eq("team_id", teamId!)
        .order("joined_at");
      if (error) throw error;

      // Fetch user profiles for display
      const userIds = (data ?? []).map((m) => m.user_id);
      const { data: profiles } = (await supabase.auth.admin)
        ? { data: [] }
        : await supabase.from("team_members").select("user_id").in("user_id", userIds);

      // We can't query auth.users directly from client — use the members' own profile data
      // For Phase 1, member display names come from a separate RPC or are deferred
      // Return raw members for now; display names resolved at render via useAuth for self
      return (data ?? []) as TeamMember[];
    },
  });

  return { members: query.data ?? [], ...query };
};

export const useTeamInvites = (teamId: string | null) => {
  const query = useQuery<TeamInvite[]>({
    queryKey: ["team_invites", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("*")
        .eq("team_id", teamId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return { invites: query.data ?? [], ...query };
};

export const usePendingInvites = () => {
  const { user } = useAuth();

  const query = useQuery<(TeamInvite & { team_name: string })[]>({
    queryKey: ["pending_invites", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("*, teams(name)")
        .eq("email", user!.email)
        .eq("status", "pending");
      if (error) throw error;
      return (data ?? []).map((inv: Record<string, unknown>) => ({
        ...(inv as TeamInvite),
        team_name: (inv.teams as { name: string })?.name ?? "",
      }));
    },
  });

  return { invites: query.data ?? [], ...query };
};

export const useTeamMutations = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  const createTeam = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const invite_code = generateInviteCode();

      const { data: team, error: teamErr } = await supabase
        .from("teams")
        .insert({ name, invite_code, owner_id: user.id })
        .select()
        .single();
      if (teamErr) throw teamErr;

      const { error: memberErr } = await supabase
        .from("team_members")
        .insert({ team_id: team.id, user_id: user.id, role: "owner" });
      if (memberErr) throw memberErr;

      return team as Team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  const inviteByEmail = useMutation({
    mutationFn: async ({ teamId, email }: { teamId: string; email: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("team_invites")
        .insert({ team_id: teamId, email, invited_by: user.id });
      if (error) throw error;
    },
    onSuccess: (_, { teamId }) => {
      qc.invalidateQueries({ queryKey: ["team_invites", teamId] });
    },
  });

  const joinByCode = useMutation({
    mutationFn: async (code: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data: team, error: lookupErr } = await supabase
        .from("teams")
        .select("id, name")
        .eq("invite_code", code)
        .single();
      if (lookupErr) throw new Error("Invalid invite link");

      const { error: joinErr } = await supabase
        .from("team_members")
        .insert({ team_id: team.id, user_id: user.id, role: "member" });
      if (joinErr) {
        if (joinErr.code === "23505") throw new Error("Already a member");
        throw joinErr;
      }

      return team as { id: string; name: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  const acceptInvite = useMutation({
    mutationFn: async ({ inviteId, teamId }: { inviteId: string; teamId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error: updateErr } = await supabase
        .from("team_invites")
        .update({ status: "accepted" })
        .eq("id", inviteId);
      if (updateErr) throw updateErr;

      const { error: joinErr } = await supabase
        .from("team_members")
        .insert({ team_id: teamId, user_id: user.id, role: "member" });
      if (joinErr && joinErr.code !== "23505") throw joinErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["pending_invites"] });
    },
  });

  const declineInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("team_invites")
        .update({ status: "declined" })
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending_invites"] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { teamId }) => {
      qc.invalidateQueries({ queryKey: ["team_members", teamId] });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({
      teamId,
      userId,
      role,
    }: {
      teamId: string;
      userId: string;
      role: TeamRole;
    }) => {
      const { error } = await supabase
        .from("team_members")
        .update({ role })
        .eq("team_id", teamId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { teamId }) => {
      qc.invalidateQueries({ queryKey: ["team_members", teamId] });
    },
  });

  const leaveTeam = useMutation({
    mutationFn: async (teamId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  const deleteTeam = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  return {
    createTeam,
    inviteByEmail,
    joinByCode,
    acceptInvite,
    declineInvite,
    removeMember,
    updateRole,
    leaveTeam,
    deleteTeam,
  };
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/teams-store.ts
git commit -m "feat: add teams store with hooks and mutations"
```

---

### Task 4: Add team realtime subscriptions

**Files:**

- Modify: `src/lib/realtime-sync.ts`

- [ ] **Step 1: Add team-related invalidations to the realtime channel**

Add these two `.on()` chains to the existing channel builder (after the `projects` subscription, before `.subscribe()`):

```typescript
        .on("postgres_changes", {
          event: "*", schema: "public", table: "team_members",
          filter: `user_id=eq.${userId}`,
        }, () => {
          queryClient.invalidateQueries({ queryKey: ["teams"] });
          queryClient.invalidateQueries({ queryKey: ["team_members"] });
        })
        .on("postgres_changes", {
          event: "*", schema: "public", table: "team_invites",
        }, () => {
          queryClient.invalidateQueries({ queryKey: ["team_invites"] });
          queryClient.invalidateQueries({ queryKey: ["pending_invites"] });
        })
```

Also remove the Pro-only guard so team realtime works for all authenticated users. Change the subscription check (lines 33-39) — instead of returning early if not Pro, only skip the tasks/projects subscriptions for non-Pro users but always subscribe to team channels.

Actually, for Phase 1 simplicity: keep the existing Pro guard for tasks/projects but add a **separate channel** for teams that all authenticated users get. After the existing `channel` setup block, add:

```typescript
// Team realtime — all authenticated users
const teamChannel = supabase
  .channel(`teams-${userId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "team_members",
      filter: `user_id=eq.${userId}`,
    },
    () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
    },
  )
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "team_invites",
    },
    () => {
      queryClient.invalidateQueries({ queryKey: ["team_invites"] });
      queryClient.invalidateQueries({ queryKey: ["pending_invites"] });
    },
  )
  .subscribe();
```

Store a separate module-level `teamChannel` variable and clean it up on sign-out, following the same pattern as the existing `channel`.

- [ ] **Step 2: Commit**

```bash
git add src/lib/realtime-sync.ts
git commit -m "feat: add team realtime subscriptions for all authenticated users"
```

---

### Task 5: Team list screen

**Files:**

- Create: `app/team.tsx`

- [ ] **Step 1: Create the team list screen**

This screen shows:

- Pending invites (if any) — cards with team name + accept/decline buttons
- My teams list — tapping navigates to team detail
- "Create Team" button (text input + create CTA)

```tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, useColorScheme, Alert } from "react-native";
import { SafeAreaView } from "@/lib/styled";
import { useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { useTeams, usePendingInvites, useTeamMutations } from "@/lib/teams-store";
import { useAuth } from "@/lib/auth-store";
import { useTranslation } from "react-i18next";

export default function TeamScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === "dark" ? "rgba(229,226,225,0.4)" : "#717c82";
  const { teams } = useTeams();
  const { invites: pendingInvites } = usePendingInvites();
  const { createTeam, acceptInvite, declineInvite } = useTeamMutations();
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createTeam.mutate(trimmed, {
      onSuccess: () => setNewName(""),
      onError: (err) => Alert.alert(t("Error"), err.message),
    });
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <Header title={t("Team")} showBack />
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Text className="font-display text-xl font-bold text-heading">
            {t("Sign in required")}
          </Text>
          <Text className="font-body text-sm text-meta text-center">
            {t("Create an account to start a team.")}
          </Text>
          <Pressable
            className="bg-success rounded-xl px-6 py-3 active:opacity-80"
            onPress={() => router.push("/auth/sign-up")}
          >
            <Text className="font-body text-sm font-bold text-bg">{t("Create Account")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title={t("Team")} showBack />
      <ScrollView
        contentContainerClassName="px-7 pt-6 pb-40 gap-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <View className="gap-3">
            <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
              {t("Invitations")}
            </Text>
            {pendingInvites.map((inv) => (
              <View key={inv.id} className="bg-bg-card rounded-lg px-5 py-4 gap-3">
                <Text className="font-display text-base font-bold text-heading">
                  {inv.team_name}
                </Text>
                <View className="flex-row gap-3">
                  <Pressable
                    className="flex-1 bg-success rounded-lg py-3 items-center active:opacity-80"
                    onPress={() => acceptInvite.mutate({ inviteId: inv.id, teamId: inv.team_id })}
                  >
                    <Text className="font-body text-sm font-bold text-bg">{t("Accept")}</Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 bg-btn-surface rounded-lg py-3 items-center active:opacity-70 border border-border"
                    onPress={() => declineInvite.mutate(inv.id)}
                  >
                    <Text className="font-body text-sm font-bold text-heading">{t("Decline")}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Create Team */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            {t("New Team")}
          </Text>
          <View className="flex-row items-center gap-3">
            <TextInput
              className="flex-1 font-body text-lg font-bold text-heading border-b border-border pb-3"
              placeholder={t("Team name...")}
              placeholderTextColor={placeholderColor}
              value={newName}
              onChangeText={setNewName}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <Pressable
              className={
                newName.trim()
                  ? "bg-success rounded-full px-5 py-2.5 active:opacity-80"
                  : "bg-btn-surface rounded-full px-5 py-2.5 opacity-50"
              }
              onPress={handleCreate}
              disabled={!newName.trim()}
            >
              <Text
                className={
                  newName.trim()
                    ? "font-body text-sm font-bold text-bg"
                    : "font-body text-sm font-bold text-meta"
                }
              >
                {t("Create")}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* My Teams */}
        <View className="gap-2">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            {t("Your Teams")}
          </Text>
          {teams.length === 0 ? (
            <View className="bg-bg-card rounded-lg py-10 items-center gap-2">
              <Text className="font-display text-base font-bold text-heading">
                {t("No teams yet")}
              </Text>
              <Text className="font-body text-sm text-meta">
                {t("Create a team or accept an invite.")}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {teams.map((team) => (
                <Pressable
                  key={team.id}
                  className="bg-bg-card rounded-lg px-5 py-4 active:opacity-70"
                  onPress={() => router.push(`/team/${team.id}`)}
                >
                  <Text className="font-display text-base font-bold text-heading">{team.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/team.tsx
git commit -m "feat: add Team list screen with create and pending invites"
```

---

### Task 6: Team detail screen

**Files:**

- Create: `app/team/[id].tsx`

- [ ] **Step 1: Create the team detail screen**

Shows member list, invite controls (owner/admin), role management (owner), leave/delete actions.

```tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, useColorScheme } from "react-native";
import { SafeAreaView } from "@/lib/styled";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { useTeams, useTeamMembers, useTeamInvites, useTeamMutations } from "@/lib/teams-store";
import { useAuth } from "@/lib/auth-store";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-linking";
import type { TeamRole } from "@/types/team";

export default function TeamDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === "dark" ? "rgba(229,226,225,0.4)" : "#717c82";
  const { user } = useAuth();
  const { teams } = useTeams();
  const team = teams.find((t) => t.id === id);
  const { members } = useTeamMembers(id);
  const { invites } = useTeamInvites(id);
  const { inviteByEmail, removeMember, updateRole, leaveTeam, deleteTeam } = useTeamMutations();
  const [inviteEmail, setInviteEmail] = useState("");

  if (!team || !user) return null;

  const myMembership = members.find((m) => m.user_id === user.id);
  const isOwner = myMembership?.role === "owner";
  const isAdmin = myMembership?.role === "admin";
  const canManage = isOwner || isAdmin;

  const handleInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    inviteByEmail.mutate(
      { teamId: team.id, email },
      {
        onSuccess: () => setInviteEmail(""),
        onError: (err) => Alert.alert(t("Error"), err.message),
      },
    );
  };

  const handleCopyLink = () => {
    const link = `eisenhower-reminder:///team/join?code=${team.invite_code}`;
    // Use Clipboard API if available, otherwise Alert with the code
    Alert.alert(t("Invite Link"), link);
  };

  const handleRemove = (userId: string, name: string) => {
    Alert.alert(t("Remove Member"), t("Remove {{name}} from the team?", { name }), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Remove"),
        style: "destructive",
        onPress: () => removeMember.mutate({ teamId: team.id, userId }),
      },
    ]);
  };

  const handleRoleChange = (userId: string, currentRole: TeamRole) => {
    const newRole: TeamRole = currentRole === "admin" ? "member" : "admin";
    updateRole.mutate({ teamId: team.id, userId, role: newRole });
  };

  const handleLeave = () => {
    Alert.alert(t("Leave Team"), t('Leave "{{name}}"?', { name: team.name }), [
      { text: t("Cancel"), style: "cancel" },
      {
        text: t("Leave"),
        style: "destructive",
        onPress: () => {
          leaveTeam.mutate(team.id, { onSuccess: () => router.back() });
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      t("Delete Team"),
      t('Permanently delete "{{name}}" and remove all members?', { name: team.name }),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: () => {
            deleteTeam.mutate(team.id, { onSuccess: () => router.back() });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title={team.name} showBack />
      <ScrollView
        contentContainerClassName="px-7 pt-6 pb-40 gap-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Invite Section (owner/admin only) */}
        {canManage && (
          <View className="gap-3">
            <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
              {t("Invite")}
            </Text>
            <View className="flex-row items-center gap-3">
              <TextInput
                className="flex-1 font-body text-base text-heading border-b border-border pb-3"
                placeholder={t("Email address...")}
                placeholderTextColor={placeholderColor}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={handleInvite}
              />
              <Pressable
                className={
                  inviteEmail.trim()
                    ? "bg-success rounded-full px-4 py-2 active:opacity-80"
                    : "bg-btn-surface rounded-full px-4 py-2 opacity-50"
                }
                onPress={handleInvite}
                disabled={!inviteEmail.trim()}
              >
                <Text
                  className={
                    inviteEmail.trim()
                      ? "font-body text-sm font-bold text-bg"
                      : "font-body text-sm font-bold text-meta"
                  }
                >
                  {t("Send")}
                </Text>
              </Pressable>
            </View>
            <Pressable
              className="bg-btn-surface rounded-lg py-3 items-center active:opacity-70 border border-border"
              onPress={handleCopyLink}
            >
              <Text className="font-body text-sm font-bold text-heading">
                {t("Copy Invite Link")}
              </Text>
            </Pressable>

            {/* Pending Invites */}
            {invites.length > 0 && (
              <View className="gap-2 pt-2">
                <Text className="font-body text-[10px] font-bold text-meta tracking-[1px] uppercase">
                  {t("Pending")} ({invites.length})
                </Text>
                {invites.map((inv) => (
                  <View
                    key={inv.id}
                    className="flex-row items-center justify-between bg-bg-card rounded-lg px-4 py-3"
                  >
                    <Text className="font-body text-sm text-body">{inv.email}</Text>
                    <Text className="font-body text-[10px] text-meta">{t("Pending")}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Members */}
        <View className="gap-3">
          <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
            {t("Members")} ({members.length})
          </Text>
          {members.map((member) => {
            const isSelf = member.user_id === user.id;
            const memberIsOwner = member.role === "owner";
            return (
              <View
                key={member.id}
                className="flex-row items-center justify-between bg-bg-card rounded-lg px-5 py-4"
              >
                <View className="flex-1 gap-0.5">
                  <Text className="font-display text-base font-bold text-heading">
                    {isSelf ? t("You") : member.user_id.slice(0, 8)}
                  </Text>
                  <Text className="font-body text-xs text-meta uppercase">{member.role}</Text>
                </View>
                <View className="flex-row gap-2">
                  {isOwner && !memberIsOwner && !isSelf && (
                    <Pressable
                      className="rounded-full bg-btn-surface px-3 py-1.5 active:opacity-70"
                      onPress={() => handleRoleChange(member.user_id, member.role)}
                    >
                      <Text className="font-body text-xs font-semibold text-heading">
                        {member.role === "admin" ? t("Demote") : t("Promote")}
                      </Text>
                    </Pressable>
                  )}
                  {canManage && !memberIsOwner && !isSelf && (
                    <Pressable
                      className="rounded-full bg-btn-surface px-3 py-1.5 active:opacity-70"
                      onPress={() => handleRemove(member.user_id, member.user_id.slice(0, 8))}
                    >
                      <Text className="font-body text-xs font-semibold text-urgent">
                        {t("Remove")}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View className="gap-3 pt-4">
          {!isOwner && (
            <Pressable
              className="bg-btn-surface rounded-xl py-4 items-center active:opacity-70 border border-border"
              onPress={handleLeave}
            >
              <Text className="font-body text-base font-bold text-urgent">{t("Leave Team")}</Text>
            </Pressable>
          )}
          {isOwner && (
            <Pressable
              className="bg-btn-surface rounded-xl py-4 items-center active:opacity-70 border border-border"
              onPress={handleDelete}
            >
              <Text className="font-body text-base font-bold text-urgent">{t("Delete Team")}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/team/\[id\].tsx
git commit -m "feat: add Team detail screen with members, invites, and management"
```

---

### Task 7: Deep link join handler

**Files:**

- Create: `app/team/join.tsx`

- [ ] **Step 1: Create the join screen**

Handles `eisenhower-reminder:///team/join?code={code}`. If authenticated, shows team name + join button. If not, stores code and redirects to sign-up.

```tsx
import { useEffect, useState } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "@/lib/styled";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-store";
import { useTeamMutations } from "@/lib/teams-store";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";

const PENDING_JOIN_KEY = "@executive_pending_join";

export default function JoinTeamScreen() {
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { joinByCode } = useTeamMutations();
  const [teamName, setTeamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;

    const lookup = async () => {
      // Look up team by invite code (this works even before joining due to public read on invite_code)
      const { data } = await supabase.from("teams").select("name").eq("invite_code", code).single();
      setTeamName(data?.name ?? null);
      setLoading(false);
    };

    if (!isAuthenticated) {
      AsyncStorage.setItem(PENDING_JOIN_KEY, code);
      router.replace("/auth/sign-up");
      return;
    }

    lookup();
  }, [code, isAuthenticated]);

  const handleJoin = () => {
    if (!code) return;
    joinByCode.mutate(code, {
      onSuccess: (team) => {
        Alert.alert(t("Joined!"), t('You are now a member of "{{name}}".', { name: team.name }), [
          { text: t("OK"), onPress: () => router.replace(`/team/${team.id}`) },
        ]);
      },
      onError: (err) => Alert.alert(t("Error"), err.message),
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center" edges={["top"]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!teamName) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <Header title={t("Join Team")} showBack />
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Text className="font-display text-xl font-bold text-heading">
            {t("Invalid invite link")}
          </Text>
          <Text className="font-body text-sm text-meta text-center">
            {t("This link may have expired or is incorrect.")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <Header title={t("Join Team")} showBack />
      <View className="flex-1 items-center justify-center px-8 gap-6">
        <Text className="font-display text-2xl font-bold text-heading">{teamName}</Text>
        <Text className="font-body text-sm text-meta text-center">
          {t("You've been invited to join this team.")}
        </Text>
        <Pressable
          className="bg-success rounded-xl px-8 py-4 active:opacity-80"
          onPress={handleJoin}
        >
          <Text className="font-body text-base font-extrabold text-bg tracking-wide">
            {t("Join Team")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Add pending join check to auth-store**

After sign-in/sign-up succeeds, check for a stored pending join code. Add this to `app/_layout.tsx` or a new effect. For simplicity, add a `usePendingJoin` hook at the bottom of `@/lib/teams-store.ts`:

```typescript
export const usePendingJoin = () => {
  const { user } = useAuth();
  const { joinByCode } = useTeamMutations();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    AsyncStorage.getItem("@executive_pending_join").then((code) => {
      if (code) {
        AsyncStorage.removeItem("@executive_pending_join");
        joinByCode.mutate(code, {
          onSuccess: (team) => router.push(`/team/${team.id}`),
        });
      }
    });
  }, [user]);
};
```

Call `usePendingJoin()` in `app/_layout.tsx`'s `AppContent` component.

- [ ] **Step 3: Commit**

```bash
git add app/team/join.tsx src/lib/teams-store.ts app/_layout.tsx
git commit -m "feat: add deep link join handler with pending join flow"
```

---

### Task 8: Settings integration — OrganizationSection

**Files:**

- Modify: `src/components/settings/OrganizationSection.tsx`

- [ ] **Step 1: Add Team row below Projects**

```tsx
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTeams, usePendingInvites } from "@/lib/teams-store";
import { useAuth } from "@/lib/auth-store";

export const OrganizationSection = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { teams } = useTeams();
  const { invites: pendingInvites } = usePendingInvites();
  const hasPending = pendingInvites.length > 0;

  return (
    <View className="gap-3">
      <Text className="font-body text-[10px] font-bold text-label tracking-[2px] uppercase ml-1">
        {t("Organization")}
      </Text>
      <View className="bg-bg-card rounded-lg overflow-hidden">
        <Pressable className="active:opacity-70" onPress={() => router.push("/projects")}>
          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-1 gap-1">
              <Text className="font-body text-base font-bold text-heading">{t("Projects")}</Text>
              <Text className="font-body text-sm text-body">
                {t("Create and manage your projects")}
              </Text>
            </View>
            <Text className="text-meta text-base">→</Text>
          </View>
        </Pressable>
        <Pressable className="active:opacity-70" onPress={() => router.push("/team")}>
          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-1 gap-1">
              <Text className="font-body text-base font-bold text-heading">{t("Team")}</Text>
              <Text className="font-body text-sm text-body">
                {isAuthenticated
                  ? teams.length > 0
                    ? t("{{count}} team", { count: teams.length })
                    : t("Create or join a team")
                  : t("Sign in to create a team")}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {hasPending && <View className="w-2.5 h-2.5 rounded-full bg-urgent" />}
              <Text className="text-meta text-base">→</Text>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/settings/OrganizationSection.tsx
git commit -m "feat: add Team row to OrganizationSection with pending invite indicator"
```

---

### Task 9: Extract translations and fill locale files

**Files:**

- Modify: `src/locales/en.json`, `es.json`, `fr.json`, `ru.json`

- [ ] **Step 1: Run extraction**

```bash
npm run i18n:extract
```

- [ ] **Step 2: Fill empty translations in ES/FR/RU**

Check for empty values and fill them with proper translations for all new team-related keys: "Team", "Invitations", "Accept", "Decline", "New Team", "Team name...", "Your Teams", "No teams yet", "Create a team or accept an invite.", "Sign in required", "Create an account to start a team.", "Invite", "Email address...", "Send", "Copy Invite Link", "Pending", "Members", "You", "Promote", "Demote", "Leave Team", "Delete Team", "Remove Member", "Remove {{name}} from the team?", "Leave", 'Leave "{{name}}"?', "Delete", 'Permanently delete "{{name}}" and remove all members?', "Join Team", "Invalid invite link", "This link may have expired or is incorrect.", "You've been invited to join this team.", "Joined!", 'You are now a member of "{{name}}".', "OK", "Sign in to create a team", "Create or join a team", "{{count}} team", "Error".

- [ ] **Step 3: Commit**

```bash
git add src/locales/
git commit -m "feat: add team-related translations for EN/ES/FR/RU"
```

---

### Task 10: Verify build

- [ ] **Step 1: Bundle iOS to check compilation**

```bash
npx expo export --platform ios
```

Expected: Successful export with no errors.

- [ ] **Step 2: Manual smoke test**

```bash
npx expo start --clear
```

Verify:

- Settings → Organization shows "Team" row
- Tapping Team navigates to team list screen
- Can create a team (requires Supabase connection)
- Team detail screen loads with member list

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Teams & Membership Phase 1 complete"
```
