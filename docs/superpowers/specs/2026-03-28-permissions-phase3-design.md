# Shared Boards — Phase 3: Permissions

## Overview

Enforce role-based access control on task and project operations. Owner/admin have full access, members have restricted delete and no project management. Enforced at both RLS (authoritative) and UI (cosmetic) layers.

**Phased Roadmap:**

1. Phase 1 — Teams & Membership (done)
2. Phase 2 — Shared Data Layer (done)
3. **Phase 3 — Permissions** (this spec)
4. Phase 4 — Pro Team Billing ($4.99 base + $2.99/member, owner-pays)

## Permission Matrix

| Action                 | Owner | Admin           | Member   | Personal |
| ---------------------- | ----- | --------------- | -------- | -------- |
| Create tasks           | yes   | yes             | yes      | yes      |
| Edit/complete any task | yes   | yes             | yes      | yes      |
| Delete any task        | yes   | yes             | own only | yes      |
| Create projects        | yes   | yes             | no       | yes      |
| Delete projects        | yes   | yes             | no       | yes      |
| Invite members         | yes   | yes             | no       | —        |
| Remove members         | yes   | yes (not owner) | no       | —        |
| Change member roles    | yes   | no              | no       | —        |
| Delete team            | yes   | no              | no       | —        |

"Personal" column = personal workspace, always full access.

## Enforcement Layers

### 1. RLS Policies (server-side, authoritative)

New helper function:

```sql
CREATE FUNCTION exists_as_owner_or_admin(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces w
    JOIN public.team_members tm ON tm.team_id = w.team_id
    WHERE w.id = ws_id
    AND w.type = 'team'
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = ws_id
    AND w.type = 'personal'
    AND w.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Personal workspaces always return true (owner has full access).

#### Tasks — update DELETE policy only

Current (Phase 2): any workspace member can delete any task.
New: owner/admin can delete any task, members can only delete tasks where `created_by = auth.uid()`.

```sql
DROP POLICY "Workspace members can delete tasks" ON public.tasks;
CREATE POLICY "Owner/admin delete any, members delete own"
  ON public.tasks FOR DELETE
  USING (
    is_workspace_member(workspace_id)
    AND (
      created_by = auth.uid()
      OR exists_as_owner_or_admin(workspace_id)
    )
  );
```

SELECT, INSERT, UPDATE policies remain unchanged — all workspace members can read, create, and edit.

#### Projects — restrict INSERT and DELETE to owner/admin

```sql
DROP POLICY "Workspace members can insert projects" ON public.projects;
CREATE POLICY "Owner/admin can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    is_workspace_member(workspace_id)
    AND exists_as_owner_or_admin(workspace_id)
    AND created_by = auth.uid()
  );

DROP POLICY "Workspace members can delete projects" ON public.projects;
CREATE POLICY "Owner/admin can delete projects"
  ON public.projects FOR DELETE
  USING (
    is_workspace_member(workspace_id)
    AND exists_as_owner_or_admin(workspace_id)
  );
```

SELECT policy remains unchanged — all workspace members can read projects.

### 2. UI Gating (client-side, cosmetic)

New hook: `useWorkspaceRole()` added to `@/lib/workspace-context.tsx`.

Returns the current user's role in the active workspace:

- `"personal"` — personal workspace (full access)
- `"owner"` — team workspace, user is owner
- `"admin"` — team workspace, user is admin
- `"member"` — team workspace, user is member

Uses `useTeamMembers(teamId)` to look up the current user's role in the team that owns the active workspace.

#### UI Changes

**`src/components/TaskItem.tsx`** — add optional delete button:

- Currently only shows Done/Undo toggle
- Add a delete action (swipe or long-press or button)
- For team workspaces: hide delete for members on tasks where `created_by !== user.id`
- Done/Undo toggle remains visible for all members

**`app/projects.tsx`** — gate project creation and deletion:

- Hide "New Project" input and "Create" button for members in team workspaces
- Hide "Remove" button on project rows for members
- Show a subtle message: "Only admins can manage projects"

**`app/(tabs)/add.tsx`** — project picker:

- Members in team workspaces: hide the "Manage" link and "No projects yet — tap to create one" CTA
- Still show project selection pills if projects exist (members can assign tasks to existing projects)

**Team detail screen (`app/team/[id].tsx`)** — already gated from Phase 1 (invite/remove/role controls hidden for members). No changes needed.

## What's NOT Included

- Per-task permissions (e.g. task-level visibility)
- Custom roles beyond owner/admin/member
- Audit log of who did what
- Phase 4 billing
