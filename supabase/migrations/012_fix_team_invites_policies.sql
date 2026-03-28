-- Fix team_invites policies:
-- 1. Use is_team_member() to avoid recursion through team_members RLS
-- 2. Use auth.jwt() for email check instead of auth.users table

-- SELECT: team members can view, OR invitee can view their own invites
drop policy if exists "Team members or invitee can view invites" on public.team_invites;
create policy "Team members or invitee can view invites"
  on public.team_invites for select
  using (
    public.is_team_member(team_id)
    or email = (auth.jwt() ->> 'email')
  );

-- INSERT: use is_team_member + check role via security definer
drop policy if exists "Owner or admin can create invites" on public.team_invites;
create policy "Owner or admin can create invites"
  on public.team_invites for insert
  with check (
    exists (
      select 1 from public.teams
      where teams.id = team_invites.team_id
      and teams.owner_id = auth.uid()
    )
    or public.is_team_member(team_id)
  );

-- UPDATE: invitee can accept/decline their own invite
drop policy if exists "Invitee can update own invite" on public.team_invites;
create policy "Invitee can update own invite"
  on public.team_invites for update
  using (email = (auth.jwt() ->> 'email'));

-- DELETE: owner or admin can revoke invites
drop policy if exists "Owner or admin can delete invites" on public.team_invites;
create policy "Owner or admin can delete invites"
  on public.team_invites for delete
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_invites.team_id
      and teams.owner_id = auth.uid()
    )
    or public.is_team_member(team_id)
  );
