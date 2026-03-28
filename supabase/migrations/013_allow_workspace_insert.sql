-- Allow authenticated users to create team workspaces
-- Personal workspaces are created via trigger, but team workspaces
-- are created by the app when a team is created
create policy "Authenticated users can create team workspaces"
  on public.workspaces for insert
  with check (
    auth.uid() is not null
    and type = 'team'
    and team_id is not null
  );
