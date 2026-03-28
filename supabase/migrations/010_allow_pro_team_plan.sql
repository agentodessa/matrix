-- Update plan check constraint to allow 'pro_team'
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check check (plan in ('free', 'pro', 'pro_team'));
