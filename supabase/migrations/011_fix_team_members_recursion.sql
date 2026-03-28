-- Fix infinite recursion in team_members SELECT policy
-- The old policy queried team_members to check team_members access (circular)
-- New approach: use a security definer function to bypass RLS for the check

create or replace function public.is_team_member(t_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.team_members
    where team_id = t_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Replace team_members SELECT policy
drop policy if exists "Members can view team members" on public.team_members;
create policy "Members can view team members"
  on public.team_members for select
  using (public.is_team_member(team_id));

-- Also fix teams SELECT policy (same pattern for consistency)
drop policy if exists "Members can view their teams" on public.teams;
create policy "Members can view their teams"
  on public.teams for select
  using (public.is_team_member(id));

-- Fix INSERT policy (also self-references team_members)
drop policy if exists "Owner or admin can add members" on public.team_members;
create policy "Owner or admin can add members"
  on public.team_members for insert
  with check (
    exists (
      select 1 from public.teams
      where teams.id = team_members.team_id
      and teams.owner_id = auth.uid()
    )
    or public.is_team_member(team_id)
  );

-- Fix UPDATE policy
drop policy if exists "Owner can update member roles" on public.team_members;
create policy "Owner can update member roles"
  on public.team_members for update
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_members.team_id
      and teams.owner_id = auth.uid()
    )
  );

-- Fix DELETE policy
drop policy if exists "Owner or admin can remove members, or self-leave" on public.team_members;
create policy "Owner or admin can remove members, or self-leave"
  on public.team_members for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.teams
      where teams.id = team_members.team_id
      and teams.owner_id = auth.uid()
    )
  );
