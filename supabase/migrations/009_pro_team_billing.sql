-- Add seat columns to subscriptions
alter table public.subscriptions add column if not exists seat_count integer not null default 0;
alter table public.subscriptions add column if not exists seat_price numeric not null default 2.99;

-- Trigger: auto-update seat_count when team_members changes
create or replace function public.update_seat_count()
returns trigger as $$
declare
  v_team_id uuid;
  v_owner_id uuid;
  v_count integer;
begin
  if tg_op = 'DELETE' then
    v_team_id := old.team_id;
  else
    v_team_id := new.team_id;
  end if;

  select owner_id into v_owner_id from public.teams where id = v_team_id;
  if v_owner_id is null then return coalesce(new, old); end if;

  select count(*) into v_count
  from public.team_members
  where team_id = v_team_id and user_id != v_owner_id;

  update public.subscriptions
  set seat_count = v_count
  where user_id = v_owner_id and plan = 'pro_team';

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger on_team_member_change_update_seats
  after insert or delete on public.team_members
  for each row execute function public.update_seat_count();
