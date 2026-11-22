-- STELLUN Academy: one generated study plan per learner per day.
-- Run once in the Supabase SQL editor (project Stellun). Safe to run again.
--
-- The server writes these rows with the service role, so learners cannot write
-- them directly. Learners may read only their own rows (used for the history check).

create table if not exists public.academy_daily_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  mix text[] not null default '{}',
  rest_day boolean not null default false,
  source text not null default 'model',
  plan jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, plan_date)
);

alter table public.academy_daily_plans enable row level security;

drop policy if exists "own daily plans are readable" on public.academy_daily_plans;
create policy "own daily plans are readable"
  on public.academy_daily_plans for select to authenticated
  using (auth.uid() = user_id);
