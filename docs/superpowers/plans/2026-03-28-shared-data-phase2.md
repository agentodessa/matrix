# Shared Data Layer (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce workspace abstraction so tasks/projects are owned by workspaces (personal or team), with a header-mounted switcher to flip between them.

**Architecture:** New `workspaces` table with auto-create triggers. Migrate existing tasks/projects from `user_id` to `workspace_id`. New `WorkspaceProvider` React Context for active workspace. Modify task/project stores to filter by `workspace_id`. Add `WorkspacePill` to Header for switching.

**Tech Stack:** Supabase (migration, RLS, triggers), React Context, React Query, AsyncStorage

---

## File Structure

| Action | Path                                            | Purpose                                        |
| ------ | ----------------------------------------------- | ---------------------------------------------- |
| Create | `supabase/migrations/007_create_workspaces.sql` | Workspaces table, triggers, migration, new RLS |
| Create | `src/lib/workspace-context.tsx`                 | WorkspaceProvider + useWorkspace hook          |
| Create | `src/components/WorkspacePill.tsx`              | Header workspace switcher pill                 |
| Modify | `src/types/task.ts`                             | Add workspace_id, created_by to Task interface |
| Modify | `src/lib/store.ts`                              | Filter by workspace_id instead of user_id      |
| Modify | `src/lib/projects-store.ts`                     | Filter by workspace_id instead of user_id      |
| Modify | `src/lib/teams-store.ts`                        | Create workspace when creating team            |
| Modify | `src/lib/realtime-sync.ts`                      | Subscribe by workspace_id                      |
| Modify | `src/components/Header.tsx`                     | Add WorkspacePill                              |
| Modify | `app/_layout.tsx`                               | Wrap with WorkspaceProvider                    |

---

### Task 1: Database migration — workspaces table, data migration, new RLS

**Files:**

- Create: `supabase/migrations/007_create_workspaces.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- ============================================================
-- 1. Create workspaces table
-- ============================================================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('personal', 'team')),
  owner_id uuid references auth.users(id),
  team_id uuid references public.teams(id) on delete cascade unique,
  created_at timestamptz default now()
);

alter table public.workspaces enable row level security;

-- Helper: check if a user is a member of a workspace
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.workspaces w
    where w.id = ws_id
    and (
      (w.type = 'personal' and w.owner_id = auth.uid())
      or (w.type = 'team' and exists (
        select 1 from public.team_members tm
        where tm.team_id = w.team_id
        and tm.user_id = auth.uid()
      ))
    )
  );
end;
$$ language plpgsql security definer;

-- Workspace RLS
create policy "Users can view their workspaces"
  on public.workspaces for select
  using (public.is_workspace_member(id));

-- ============================================================
-- 2. Auto-create personal workspace for new users
-- ============================================================

create or replace function public.create_personal_workspace()
returns trigger as $$
begin
  insert into public.workspaces (type, owner_id)
  values ('personal', new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_workspace
  after insert on auth.users
  for each row execute function public.create_personal_workspace();

-- ============================================================
-- 3. Backfill: create personal workspaces for existing users
-- ============================================================

insert into public.workspaces (type, owner_id)
select 'personal', id from auth.users
where id not in (select owner_id from public.workspaces where type = 'personal' and owner_id is not null);

-- Create team workspaces for existing teams
insert into public.workspaces (type, team_id)
select 'team', id from public.teams
where id not in (select team_id from public.workspaces where type = 'team' and team_id is not null);

-- ============================================================
-- 4. Add workspace_id and created_by to tasks
-- ============================================================

alter table public.tasks add column workspace_id uuid references public.workspaces(id);
alter table public.tasks add column created_by uuid references auth.users(id);

-- Populate from existing user_id
update public.tasks set
  workspace_id = (select w.id from public.workspaces w where w.type = 'personal' and w.owner_id = tasks.user_id),
  created_by = user_id;

-- Make NOT NULL
alter table public.tasks alter column workspace_id set not null;
alter table public.tasks alter column created_by set not null;

-- Drop old primary key, create new one
alter table public.tasks drop constraint tasks_pkey;
alter table public.tasks add primary key (id, workspace_id);

-- Drop old user_id column
alter table public.tasks drop column user_id;

-- ============================================================
-- 5. Add workspace_id and created_by to projects
-- ============================================================

alter table public.projects add column workspace_id uuid references public.workspaces(id);
alter table public.projects add column created_by uuid references auth.users(id);

-- Populate from existing user_id
update public.projects set
  workspace_id = (select w.id from public.workspaces w where w.type = 'personal' and w.owner_id = projects.user_id),
  created_by = user_id;

-- Make NOT NULL
alter table public.projects alter column workspace_id set not null;
alter table public.projects alter column created_by set not null;

-- Drop old constraints
alter table public.projects drop constraint if exists projects_user_id_name_key;

-- Add new unique constraint
alter table public.projects add constraint projects_workspace_name_key unique (workspace_id, name);

-- Drop old user_id column
alter table public.projects drop column user_id;

-- ============================================================
-- 6. Replace RLS policies on tasks
-- ============================================================

drop policy if exists "Users can read own tasks" on public.tasks;
drop policy if exists "Users can insert own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;

create policy "Workspace members can read tasks"
  on public.tasks for select using (public.is_workspace_member(workspace_id));
create policy "Workspace members can insert tasks"
  on public.tasks for insert with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "Workspace members can update tasks"
  on public.tasks for update using (public.is_workspace_member(workspace_id));
create policy "Workspace members can delete tasks"
  on public.tasks for delete using (public.is_workspace_member(workspace_id));

-- ============================================================
-- 7. Replace RLS policies on projects
-- ============================================================

drop policy if exists "Users can read own projects" on public.projects;
drop policy if exists "Users can insert own projects" on public.projects;
drop policy if exists "Users can delete own projects" on public.projects;

create policy "Workspace members can read projects"
  on public.projects for select using (public.is_workspace_member(workspace_id));
create policy "Workspace members can insert projects"
  on public.projects for insert with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "Workspace members can delete projects"
  on public.projects for delete using (public.is_workspace_member(workspace_id));

-- ============================================================
-- 8. Enable realtime on workspaces
-- ============================================================

alter publication supabase_realtime add table public.workspaces;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/007_create_workspaces.sql
git commit -m "feat: add workspaces table, migrate tasks/projects from user_id to workspace_id"
```

---

### Task 2: Update Task type and add Workspace type

**Files:**

- Modify: `src/types/task.ts`

- [ ] **Step 1: Update the Task interface**

Replace `user_id` references. The Task interface currently has no `user_id` field (it's only used in the remote row mapping). Add `workspace_id` and `created_by`:

In `src/types/task.ts`, add to the `Task` interface (after `completed_at`):

```typescript
  workspace_id?: string;
  created_by?: string;
```

These are optional because local-only tasks (free users) won't have them.

- [ ] **Step 2: Create Workspace type**

Add to a new file `src/types/workspace.ts`:

```typescript
export type WorkspaceType = "personal" | "team";

export interface Workspace {
  id: string;
  type: WorkspaceType;
  owner_id: string | null;
  team_id: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/task.ts src/types/workspace.ts
git commit -m "feat: add workspace_id and created_by to Task type, add Workspace type"
```

---

### Task 3: Create WorkspaceProvider context

**Files:**

- Create: `src/lib/workspace-context.tsx`

- [ ] **Step 1: Create the workspace context**

```tsx
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth-store";
import { useTeams } from "@/lib/teams-store";
import { supabase } from "@/lib/supabase";
import type { Workspace } from "@/types/workspace";

interface WorkspaceContextValue {
  workspaceId: string | null;
  workspaceName: string;
  workspaceType: "personal" | "team";
  workspaces: { id: string; name: string; type: "personal" | "team" }[];
  setWorkspace: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaceId: null,
  workspaceName: "Personal",
  workspaceType: "personal",
  workspaces: [],
  setWorkspace: () => {},
});

const STORAGE_KEY = "@executive_workspace";

export const useWorkspace = () => useContext(WorkspaceContext);

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { teams } = useTeams();
  const [personalWs, setPersonalWs] = useState<Workspace | null>(null);
  const [teamWorkspaces, setTeamWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Load personal workspace
  useEffect(() => {
    if (!user) {
      setPersonalWs(null);
      setTeamWorkspaces([]);
      return;
    }

    const load = async () => {
      const { data } = await supabase
        .from("workspaces")
        .select("*")
        .eq("type", "personal")
        .eq("owner_id", user.id)
        .single();
      if (data) setPersonalWs(data as Workspace);
    };
    load();
  }, [user]);

  // Load team workspaces
  useEffect(() => {
    if (teams.length === 0) {
      setTeamWorkspaces([]);
      return;
    }

    const load = async () => {
      const teamIds = teams.map((t) => t.id);
      const { data } = await supabase
        .from("workspaces")
        .select("*")
        .eq("type", "team")
        .in("team_id", teamIds);
      if (data) setTeamWorkspaces(data as Workspace[]);
    };
    load();
  }, [teams]);

  // Restore saved workspace
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setActiveId(saved);
    });
  }, []);

  // Default to personal workspace if active is invalid
  const allWorkspaces = useMemo(() => {
    const list: { id: string; name: string; type: "personal" | "team" }[] = [];
    if (personalWs) {
      list.push({ id: personalWs.id, name: "Personal", type: "personal" });
    }
    for (const tw of teamWorkspaces) {
      const team = teams.find((t) => t.id === tw.team_id);
      if (team) list.push({ id: tw.id, name: team.name, type: "team" });
    }
    return list;
  }, [personalWs, teamWorkspaces, teams]);

  const active = allWorkspaces.find((w) => w.id === activeId) ?? allWorkspaces[0] ?? null;

  const setWorkspace = (id: string) => {
    setActiveId(id);
    AsyncStorage.setItem(STORAGE_KEY, id);
  };

  const value: WorkspaceContextValue = {
    workspaceId: active?.id ?? null,
    workspaceName: active?.name ?? "Personal",
    workspaceType: active?.type ?? "personal",
    workspaces: allWorkspaces,
    setWorkspace,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/workspace-context.tsx
git commit -m "feat: add WorkspaceProvider context with workspace switching"
```

---

### Task 4: Create WorkspacePill component

**Files:**

- Create: `src/components/WorkspacePill.tsx`

- [ ] **Step 1: Create the pill component**

Tappable pill that shows current workspace name. Tapping opens an Alert-based picker (simple for Phase 2; can upgrade to bottom sheet later).

```tsx
import { Text, Pressable, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/lib/workspace-context";

export const WorkspacePill = () => {
  const { t } = useTranslation();
  const { workspaceName, workspaces, setWorkspace, workspaceId } = useWorkspace();

  if (workspaces.length <= 1) return null;

  const handlePress = () => {
    const buttons = workspaces.map((ws) => ({
      text: ws.type === "personal" ? t("Personal") : ws.name,
      onPress: () => setWorkspace(ws.id),
      style: ws.id === workspaceId ? ("cancel" as const) : ("default" as const),
    }));
    buttons.push({ text: t("Cancel"), onPress: () => {}, style: "cancel" as const });
    Alert.alert(t("Switch Workspace"), undefined, buttons);
  };

  const displayName =
    workspaces.find((w) => w.id === workspaceId)?.type === "personal"
      ? t("Personal")
      : workspaceName;

  return (
    <Pressable
      className="bg-btn-surface rounded-full px-3 py-1.5 active:opacity-70 border border-border"
      onPress={handlePress}
    >
      <Text className="font-body text-[10px] font-bold text-heading" numberOfLines={1}>
        {displayName.length > 12 ? displayName.slice(0, 12) + "…" : displayName}
      </Text>
    </Pressable>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WorkspacePill.tsx
git commit -m "feat: add WorkspacePill component for workspace switching"
```

---

### Task 5: Wire WorkspaceProvider and WorkspacePill into the app

**Files:**

- Modify: `app/_layout.tsx`
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Wrap app with WorkspaceProvider**

In `app/_layout.tsx`, add import and wrap `AppContent` inside the provider:

```typescript
import { WorkspaceProvider } from "@/lib/workspace-context";
```

Change `RootLayout` to:

```tsx
export default function RootLayout() {
  return (
    <QueryProvider>
      <WorkspaceProvider>
        <AppContent />
      </WorkspaceProvider>
    </QueryProvider>
  );
}
```

- [ ] **Step 2: Add WorkspacePill to Header**

In `src/components/Header.tsx`, add import:

```typescript
import { WorkspacePill } from "@/components/WorkspacePill";
```

In the JSX, replace the `<SyncPill status={syncStatus} />` with both pills:

```tsx
<View className="flex-row items-center gap-2">
  <WorkspacePill />
  <SyncPill status={syncStatus} />
</View>
```

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx src/components/Header.tsx
git commit -m "feat: wire WorkspaceProvider and WorkspacePill into app layout and header"
```

---

### Task 6: Update task store to use workspace_id

**Files:**

- Modify: `src/lib/store.ts`

- [ ] **Step 1: Update remote helpers**

Read the current file first. Then make these changes:

**`fetchRemoteTasks`**: Change parameter from `userId: string` to `workspaceId: string`. Change query from `.eq("user_id", userId)` to `.eq("workspace_id", workspaceId)`.

**`mapRemoteTask`**: Add `workspace_id` and `created_by` mapping:

```typescript
workspace_id: (r.workspace_id as string) ?? undefined,
created_by: (r.created_by as string) ?? undefined,
```

**`toRemoteRow`**: Change parameter from `(task: Task, userId: string)` to `(task: Task, workspaceId: string, createdBy: string)`. Replace `user_id: userId` with `workspace_id: workspaceId, created_by: createdBy`.

**`useCloudTasks`**: Change parameter from `userId: string` to `workspaceId: string, userId: string`. Update:

- Query key from `["tasks", userId]` to `["tasks", workspaceId]`
- `fetchRemoteTasks(workspaceId)` instead of `fetchRemoteTasks(userId)`
- `toRemoteRow(newTask, workspaceId, userId)` instead of `toRemoteRow(newTask, userId)`
- All `.eq("user_id", userId)` in mutations to `.eq("workspace_id", workspaceId)`
- All `queryKey: ["tasks", userId]` to `queryKey: ["tasks", workspaceId]`

**`useTasks`**: Import `useWorkspace` from `@/lib/workspace-context`. Get `workspaceId` from it. Pass `workspaceId` to `useCloudTasks`:

```typescript
const { workspaceId } = useWorkspace();
const cloud = useCloudTasks(isPro && workspaceId ? workspaceId : "__none__", userId ?? "");
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat: update task store to filter by workspace_id"
```

---

### Task 7: Update projects store to use workspace_id

**Files:**

- Modify: `src/lib/projects-store.ts`

- [ ] **Step 1: Update remote helpers and hooks**

Same pattern as Task 6:

**`fetchRemoteProjects`**: Change parameter to `workspaceId: string`. Change `.eq("user_id", userId)` to `.eq("workspace_id", workspaceId)`.

**`useCloudProjects`**: Change parameter to `workspaceId: string, userId: string`. Update:

- Query key from `["projects", userId]` to `["projects", workspaceId]`
- Insert mutation: `{ workspace_id: workspaceId, created_by: userId, name }` instead of `{ user_id: userId, name }`
- Delete mutation: `.eq("workspace_id", workspaceId)` instead of `.eq("user_id", userId)`
- All query key references

**`useProjects`**: Import `useWorkspace`. Get `workspaceId`. Pass to `useCloudProjects`:

```typescript
const { workspaceId } = useWorkspace();
const cloud = useCloudProjects(isPro && workspaceId ? workspaceId : "__none__", userId ?? "");
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/projects-store.ts
git commit -m "feat: update projects store to filter by workspace_id"
```

---

### Task 8: Create team workspace on team creation

**Files:**

- Modify: `src/lib/teams-store.ts`

- [ ] **Step 1: Update createTeam mutation**

Read the current `createTeam` mutation in `teams-store.ts`. After the team + owner membership inserts, add workspace creation:

```typescript
// Create team workspace
const { error: wsErr } = await supabase
  .from("workspaces")
  .insert({ type: "team", team_id: team.id });
if (wsErr) throw wsErr;
```

Add this after the `team_members` insert, before the `return team` line.

Also invalidate workspaces queries in `onSuccess`:

```typescript
qc.invalidateQueries({ queryKey: ["teams"] });
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/teams-store.ts
git commit -m "feat: create team workspace when creating a team"
```

---

### Task 9: Update realtime sync for workspace-based subscriptions

**Files:**

- Modify: `src/lib/realtime-sync.ts`

- [ ] **Step 1: Update task/project channel to filter by workspace_id**

Read the current file. The existing Pro channel subscribes to `tasks` and `projects` filtered by `user_id`. Change the filter to use `workspace_id`.

This requires knowing the active workspace ID at subscription time. Since `useRealtimeSync` is a hook, import `useWorkspace`:

```typescript
import { useWorkspace } from "@/lib/workspace-context";
```

Inside `useRealtimeSync`, get the workspace ID:

```typescript
const { workspaceId } = useWorkspace();
```

Change the tasks/projects channel filters from `user_id=eq.${userId}` to `workspace_id=eq.${workspaceId}`.

Re-subscribe when `workspaceId` changes — add it to the dependency array or handle re-setup.

For the invalidation function, change query keys from `["tasks", userId]` to use `workspaceId`:

```typescript
queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/realtime-sync.ts
git commit -m "feat: update realtime sync to subscribe by workspace_id"
```

---

### Task 10: Extract translations and fill locale files

**Files:**

- Modify: `src/locales/en.json`, `es.json`, `fr.json`, `ru.json`

- [ ] **Step 1: Run extraction**

```bash
npm run i18n:extract
```

- [ ] **Step 2: Fill empty translations**

New keys to translate: "Personal", "Switch Workspace", "Cancel" (may already exist).

Check for empty values and fill them in ES/FR/RU.

- [ ] **Step 3: Commit**

```bash
git add src/locales/
git commit -m "feat: add workspace-related translations"
```

---

### Task 11: Verify build

- [ ] **Step 1: Bundle iOS**

```bash
npx expo export --platform ios
```

Expected: Successful export with no errors.

- [ ] **Step 2: Verify workspace switching flow**

```bash
npx expo start --clear
```

Verify:

- App loads with personal workspace active
- WorkspacePill appears in header when user has teams
- Tapping pill shows workspace list
- Switching workspace changes the tasks/projects displayed
- Creating a team also creates a workspace
- New tasks in team workspace are visible to all team members

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: Shared Data Layer Phase 2 complete"
```
