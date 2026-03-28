# Shared Boards — Phase 2: Shared Data Layer

## Overview

Introduce a `workspaces` abstraction so tasks and projects are owned by workspaces, not users directly. Every user gets a personal workspace; every team gets one workspace. A header-mounted workspace switcher lets users flip context. All screens (matrix, tasks, calendar, add) filter by the active workspace.

**Phased Roadmap:**

1. Phase 1 — Teams & Membership (done)
2. **Phase 2 — Shared Data Layer** (this spec)
3. Phase 3 — Permissions (role-based access control on operations)
4. Phase 4 — Pro Team Billing ($4.99 base + $2.99/member, owner-pays)

## Key Decisions

- **Workspace abstraction** — tasks/projects reference `workspace_id` instead of `user_id`
- **One team = one workspace** — 1:1 relationship via UNIQUE constraint
- **Auto-migrate** — existing personal tasks/projects migrated to each user's personal workspace in SQL
- **Track creator** — `created_by` column on tasks/projects for accountability
- **Personal workspace trigger** — new users auto-get a workspace via database trigger (same pattern as subscriptions)

## Data Model

### New `workspaces` table

| Column       | Type        | Constraints                                                      |
| ------------ | ----------- | ---------------------------------------------------------------- |
| `id`         | UUID        | PK, default `gen_random_uuid()`                                  |
| `type`       | TEXT        | NOT NULL, CHECK `type IN ('personal', 'team')`                   |
| `owner_id`   | UUID        | FK → `auth.users`, nullable (set for personal, null for team)    |
| `team_id`    | UUID        | FK → `teams`, nullable, UNIQUE (set for team, null for personal) |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()`                                                  |

Constraints:

- Personal workspaces: `owner_id IS NOT NULL AND team_id IS NULL`
- Team workspaces: `team_id IS NOT NULL AND owner_id IS NULL`
- Each user has exactly one personal workspace (UNIQUE on `owner_id` where `type = 'personal'`)
- Each team has exactly one workspace (UNIQUE on `team_id`)

### Modified `tasks` table

| Change | Column         | Type | Notes                                       |
| ------ | -------------- | ---- | ------------------------------------------- |
| Add    | `workspace_id` | UUID | FK → workspaces, NOT NULL (after migration) |
| Add    | `created_by`   | UUID | FK → auth.users, NOT NULL (after migration) |
| Drop   | `user_id`      | —    | Replaced by workspace_id + created_by       |

Primary key changes from `(id, user_id)` to `(id, workspace_id)`.

### Modified `projects` table

| Change | Column         | Type | Notes                                       |
| ------ | -------------- | ---- | ------------------------------------------- |
| Add    | `workspace_id` | UUID | FK → workspaces, NOT NULL (after migration) |
| Add    | `created_by`   | UUID | FK → auth.users, NOT NULL (after migration) |
| Drop   | `user_id`      | —    | Replaced by workspace_id + created_by       |

Unique constraint changes from `(user_id, name)` to `(workspace_id, name)`.

## Migration Strategy

Single migration script `007_create_workspaces.sql`:

1. Create `workspaces` table
2. Create personal workspace trigger for new users
3. Backfill: create a personal workspace for every existing user who has tasks or projects
4. Add `workspace_id` and `created_by` columns (nullable initially)
5. Populate `workspace_id` from user's personal workspace, `created_by = user_id`
6. Make columns NOT NULL
7. Drop old `user_id` columns and old primary key/unique constraints
8. Create new primary key `(id, workspace_id)` on tasks and new unique `(workspace_id, name)` on projects
9. Drop old RLS policies, create new ones
10. Enable realtime on workspaces

## RLS Policies

### Helper function

```sql
CREATE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = ws_id
    AND (
      (w.type = 'personal' AND w.owner_id = auth.uid())
      OR (w.type = 'team' AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = w.team_id
        AND tm.user_id = auth.uid()
      ))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `workspaces`

- **SELECT**: `is_workspace_member(id)`
- **INSERT**: via trigger only (no client inserts)
- **UPDATE**: never
- **DELETE**: never

### `tasks` (new policies)

- **SELECT**: `is_workspace_member(workspace_id)`
- **INSERT**: `is_workspace_member(workspace_id) AND created_by = auth.uid()`
- **UPDATE**: `is_workspace_member(workspace_id)`
- **DELETE**: `is_workspace_member(workspace_id)`

### `projects` (new policies)

- **SELECT**: `is_workspace_member(workspace_id)`
- **INSERT**: `is_workspace_member(workspace_id) AND created_by = auth.uid()`
- **DELETE**: `is_workspace_member(workspace_id)`

## Auto-Create Triggers

### Personal workspace (new users)

```sql
CREATE TRIGGER on_auth_user_created_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_personal_workspace();
```

### Team workspace (when team is created)

Add to `teams-store.ts` `createTeam` mutation: after inserting the team, insert a workspace with `type='team'` and `team_id`.

## Workspace Switcher UI

### Component: `WorkspacePill` (new, in `@/components/WorkspacePill.tsx`)

- Positioned in the Header, right side, before SyncPill
- Shows abbreviated workspace name (truncated to ~12 chars)
- Personal workspace shows "Personal"
- Team workspace shows team name
- Tapping opens a bottom sheet / modal with the full list

### Workspace Picker (bottom sheet or modal)

- "Personal" row (always first, with a user icon)
- Team rows (with team icon/initial)
- Active workspace highlighted
- Tapping a row switches workspace and dismisses

### State: `WorkspaceProvider` (new, in `@/lib/workspace-context.tsx`)

- React Context providing `{ workspaceId, workspaceName, workspaceType, setWorkspace }`
- Wraps the app in root layout
- Active workspace persisted to AsyncStorage (`@executive_workspace`)
- On mount: loads saved workspace ID, validates it still exists (user might have left a team), falls back to personal
- Provides the workspace list via `useTeams()` + personal workspace lookup

## Store Layer Changes

### `@/lib/store.ts` — useTasks()

- Cloud queries filter by `.eq("workspace_id", workspaceId)` instead of `.eq("user_id", userId)`
- `addTask()` sets `workspace_id` from current workspace context and `created_by` from auth user
- Local (free) mode: filter AsyncStorage tasks by `workspace_id` (personal workspace only — free users don't have teams)

### `@/lib/projects-store.ts` — useProjects()

- Same pattern: filter by `workspace_id`
- `addProject()` sets `workspace_id` and `created_by`

### `@/lib/teams-store.ts` — createTeam()

- After creating team + owner membership, also create a workspace with `type='team'` and `team_id`

### `@/lib/realtime-sync.ts`

- Tasks/projects channel filters by `workspace_id` of the active workspace instead of `user_id`
- Re-subscribe when active workspace changes

## Affected Screens

All screens already read from `useTasks()` and `useProjects()` — once those hooks filter by workspace, the screens automatically show the right data. No screen-level changes needed except:

- `app/_layout.tsx` — wrap with `WorkspaceProvider`
- `@/components/Header.tsx` — add `WorkspacePill` before `SyncPill`
- `app/(tabs)/add.tsx` — `addTask` call needs no change (store handles workspace_id internally)

## Translations

New keys: "Personal", "Switch Workspace", workspace-related UI text. Run `npm run i18n:extract` after implementation.

## What's NOT Included

- Multiple workspaces per team
- Workspace settings/customization
- Workspace-level notifications
- Role-based CRUD restrictions (Phase 3)
- Billing (Phase 4)
