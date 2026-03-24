-- Enable Realtime for tasks and projects tables
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.projects;
