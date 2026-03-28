-- Teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_id uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

alter table public.teams enable row level security;

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

-- Deferred: teams SELECT policy that references team_members
create policy "Members can view their teams"
  on public.teams for select
  using (exists (
    select 1 from public.team_members
    where team_members.team_id = teams.id
    and team_members.user_id = auth.uid()
  ));

create policy "Members can view team members"
  on public.team_members for select
  using (exists (
    select 1 from public.team_members as my
    where my.team_id = team_members.team_id
    and my.user_id = auth.uid()
  ));

create policy "Owner or admin can add members"
  on public.team_members for insert
  with check (
    -- Team owner can always add (needed for initial owner insert)
    exists (
      select 1 from public.teams
      where teams.id = team_members.team_id
      and teams.owner_id = auth.uid()
    )
    -- Existing owner/admin can add members
    or exists (
      select 1 from public.team_members as my
      where my.team_id = team_members.team_id
      and my.user_id = auth.uid()
      and my.role in ('owner', 'admin')
    )
  );

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
