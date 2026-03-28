# Permissions (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce role-based access control — owner/admin have full access, members can edit any task but only delete their own, and cannot manage projects.

**Architecture:** New RLS helper function `exists_as_owner_or_admin()`, updated DELETE/INSERT policies on tasks/projects. New `useWorkspaceRole()` hook for UI gating. Three component changes to hide restricted actions.

**Tech Stack:** Supabase (RLS policies), React (context hook), TypeScript

---

## File Structure

| Action | Path                                      | Purpose                          |
| ------ | ----------------------------------------- | -------------------------------- |
| Create | `supabase/migrations/008_permissions.sql` | RLS helper + updated policies    |
| Modify | `src/lib/workspace-context.tsx`           | Add `useWorkspaceRole()` hook    |
| Modify | `src/components/TaskItem.tsx`             | Add delete button, gate by role  |
| Modify | `app/projects.tsx`                        | Gate create/delete by role       |
| Modify | `app/(tabs)/add.tsx`                      | Gate project manage link by role |

---

### Task 1: Database migration — permissions RLS

**Files:**

- Create: `supabase/migrations/008_permissions.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Helper: check if user is owner or admin in a workspace
-- Returns true for personal workspaces (owner has full access)
create or replace function public.exists_as_owner_or_admin(ws_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.workspaces w
    join public.team_members tm on tm.team_id = w.team_id
    where w.id = ws_id
    and w.type = 'team'
    and tm.user_id = auth.uid()
    and tm.role in ('owner', 'admin')
  ) or exists (
    select 1 from public.workspaces w
    where w.id = ws_id
    and w.type = 'personal'
    and w.owner_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Tasks: members can only delete their own tasks
drop policy if exists "Workspace members can delete tasks" on public.tasks;
create policy "Owner/admin delete any, members delete own"
  on public.tasks for delete
  using (
    public.is_workspace_member(workspace_id)
    and (
      created_by = auth.uid()
      or public.exists_as_owner_or_admin(workspace_id)
    )
  );

-- Projects: only owner/admin can create
drop policy if exists "Workspace members can insert projects" on public.projects;
create policy "Owner/admin can create projects"
  on public.projects for insert
  with check (
    public.is_workspace_member(workspace_id)
    and public.exists_as_owner_or_admin(workspace_id)
    and created_by = auth.uid()
  );

-- Projects: only owner/admin can delete
drop policy if exists "Workspace members can delete projects" on public.projects;
create policy "Owner/admin can delete projects"
  on public.projects for delete
  using (
    public.is_workspace_member(workspace_id)
    and public.exists_as_owner_or_admin(workspace_id)
  );
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/008_permissions.sql
git commit -m "feat: add role-based RLS policies for tasks and projects"
```

---

### Task 2: Add `useWorkspaceRole` hook

**Files:**

- Modify: `src/lib/workspace-context.tsx`

- [ ] **Step 1: Add the hook**

Read the current file. Then add a new exported hook after `useWorkspace`:

```typescript
export const useWorkspaceRole = (): "personal" | "owner" | "admin" | "member" => {
  const { workspaceType } = useWorkspace();
  const { user } = useAuth();
  const { teams } = useTeams();
  const [teamWorkspaces, setTeamWorkspaces] = useState<Workspace[]>([]);
```

Wait — the workspace context already has `teamWorkspaces` and the active workspace info internally. The cleanest approach: expose `role` directly from the context value instead of a separate hook.

Add `role` to `WorkspaceContextValue`:

```typescript
interface WorkspaceContextValue {
  workspaceId: string | null;
  workspaceName: string;
  workspaceType: "personal" | "team";
  workspaceRole: "personal" | "owner" | "admin" | "member";
  workspaces: { id: string; name: string; type: "personal" | "team" }[];
  setWorkspace: (id: string) => void;
}
```

Update the default context:

```typescript
workspaceRole: "personal",
```

Inside `WorkspaceProvider`, import `useTeamMembers` from `@/lib/teams-store`. Compute the role:

```typescript
const activeTeamId = teamWorkspaces.find((tw) => tw.id === active?.id)?.team_id ?? null;
const { members } = useTeamMembers(active?.type === "team" ? activeTeamId : null);
const myRole = useMemo(() => {
  if (!active || active.type === "personal") return "personal" as const;
  const me = members.find((m) => m.user_id === userId);
  return (me?.role ?? "member") as "owner" | "admin" | "member";
}, [active, members, userId]);
```

Add to the value object:

```typescript
workspaceRole: myRole,
```

Also export a convenience hook:

```typescript
export const useWorkspaceRole = () => useContext(WorkspaceContext).workspaceRole;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/workspace-context.tsx
git commit -m "feat: add workspaceRole to context and useWorkspaceRole hook"
```

---

### Task 3: Gate task deletion in TaskItem

**Files:**

- Modify: `src/components/TaskItem.tsx`

- [ ] **Step 1: Add delete button with role gating**

Read the current file. Add these imports:

```typescript
import { useWorkspaceRole } from "@/lib/workspace-context";
import { useAuth } from "@/lib/auth-store";
```

Add a new prop for delete:

```typescript
interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}
```

Inside the component:

```typescript
const role = useWorkspaceRole();
const { user } = useAuth();
const canDelete =
  role === "personal" || role === "owner" || role === "admin" || task.created_by === user?.id;
```

In the bottom row (the `View` with `flex-row items-center justify-between`), add a delete button BEFORE the Done/Undo button, only when `canDelete && onDelete`:

```tsx
<View className="flex-row items-center gap-2">
  {canDelete && onDelete && (
    <Pressable
      onPress={() => onDelete(task.id)}
      className="rounded-full bg-btn-surface px-3 py-1.5"
    >
      <Text className="font-body text-xs font-semibold text-urgent">{t("Delete")}</Text>
    </Pressable>
  )}
  <Pressable onPress={() => onToggle(task.id)} className="rounded-full bg-btn-surface px-3 py-1.5">
    <Text className="font-body text-xs font-semibold text-heading">
      {isCompleted ? t("Undo") : t("Done")}
    </Text>
  </Pressable>
</View>
```

Replace the existing single Pressable (the Done/Undo button) with this wrapped View containing both buttons.

Note: `onDelete` is optional — existing callers that don't pass it won't show the delete button. This is backward compatible.

- [ ] **Step 2: Commit**

```bash
git add src/components/TaskItem.tsx
git commit -m "feat: add role-gated delete button to TaskItem"
```

---

### Task 4: Gate project management by role

**Files:**

- Modify: `app/projects.tsx`

- [ ] **Step 1: Add role check to projects screen**

Read the current file. Add import:

```typescript
import { useWorkspaceRole } from "@/lib/workspace-context";
```

Inside `ProjectsScreen`, add:

```typescript
const role = useWorkspaceRole();
const canManageProjects = role === "personal" || role === "owner" || role === "admin";
```

Wrap the "New Project" creation section in a conditional:

```tsx
{canManageProjects ? (
  // existing create section (atLimit check + input + create button)
) : (
  <View className="bg-bg-card rounded-lg py-6 items-center">
    <Text className="font-body text-sm text-meta">{t("Only admins can manage projects")}</Text>
  </View>
)}
```

For the project list, conditionally show the "Remove" button:

```tsx
{
  canManageProjects && (
    <Pressable
      className="rounded-full bg-btn-surface px-3 py-1.5 active:opacity-70"
      onPress={() => handleDelete(project)}
    >
      <Text className="font-body text-xs font-semibold text-urgent">{t("Remove")}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/projects.tsx
git commit -m "feat: gate project create/delete by workspace role"
```

---

### Task 5: Gate project manage link in Add Task screen

**Files:**

- Modify: `app/(tabs)/add.tsx`

- [ ] **Step 1: Hide manage link for members**

Read the current file. Add import:

```typescript
import { useWorkspaceRole } from "@/lib/workspace-context";
```

Inside `AddTaskScreen`, add:

```typescript
const role = useWorkspaceRole();
const canManageProjects = role === "personal" || role === "owner" || role === "admin";
```

In the Project section, wrap the "Manage" link in a conditional:

```tsx
{
  canManageProjects && (
    <Pressable className="active:opacity-70" onPress={() => router.push("/projects")}>
      <Text className="font-body text-xs font-bold text-slate">{t("Manage")}</Text>
    </Pressable>
  );
}
```

Also wrap the "No projects yet — tap to create one" empty state:

```tsx
{projects.length === 0 ? (
  canManageProjects ? (
    <Pressable
      className="border border-dashed border-border rounded-lg py-4 items-center active:opacity-70"
      onPress={() => router.push("/projects")}
    >
      <Text className="font-body text-sm text-meta">
        {t("No projects yet — tap to create one")}
      </Text>
    </Pressable>
  ) : null
) : (
  // existing project pills ScrollView
)}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/add.tsx
git commit -m "feat: hide project management for members in Add Task screen"
```

---

### Task 6: Extract translations and verify build

**Files:**

- Modify: `src/locales/{en,es,fr,ru}.json`

- [ ] **Step 1: Run extraction**

```bash
npm run i18n:extract
```

- [ ] **Step 2: Fill empty translations**

New key to translate: "Only admins can manage projects"

- ES: "Solo los administradores pueden gestionar proyectos"
- FR: "Seuls les administrateurs peuvent gérer les projets"
- RU: "Только администраторы могут управлять проектами"

- [ ] **Step 3: Verify build**

```bash
npx expo export --platform ios
```

Expected: Successful export.

- [ ] **Step 4: Commit**

```bash
git add src/locales/
git commit -m "feat: Permissions Phase 3 complete — role-based access control"
```
