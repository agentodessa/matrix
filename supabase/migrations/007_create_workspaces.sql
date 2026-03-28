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
