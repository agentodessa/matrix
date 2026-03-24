-- Tasks table
create table if not exists public.tasks (
  id text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  urgency text not null check (urgency in ('urgent', 'routine')),
  importance text not null check (importance in ('high', 'casual')),
  status text not null default 'active' check (status in ('active', 'completed')),
  deadline text,
  delegate text,
  time_estimate text,
  project text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz default now(),
  primary key (id, user_id)
);

alter table public.tasks enable row level security;

create policy "Users can read own tasks"
  on public.tasks for select using (auth.uid() = user_id);
create policy "Users can insert own tasks"
  on public.tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks"
  on public.tasks for update using (auth.uid() = user_id);
create policy "Users can delete own tasks"
  on public.tasks for delete using (auth.uid() = user_id);

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.handle_updated_at();

-- Projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now(),
  unique (user_id, name)
);

alter table public.projects enable row level security;

create policy "Users can read own projects"
  on public.projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects"
  on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can delete own projects"
  on public.projects for delete using (auth.uid() = user_id);
