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
