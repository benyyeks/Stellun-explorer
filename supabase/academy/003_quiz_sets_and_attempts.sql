-- STELLUN Academy: the daily quiz set and the quiz attempts.
-- Run once in the Supabase SQL editor (project Stellun, after 002). Safe to run again.
--
-- academy_daily_quizzes holds the answer key, so learners have NO read policy on it.
-- Only the server (service role) reads or writes it.
-- academy_quiz_attempts holds each attempt. Learners may read their own attempts.

create table if not exists public.academy_daily_quizzes (
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_date date not null,
  questions jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, quiz_date)
);

alter table public.academy_daily_quizzes enable row level security;

create table if not exists public.academy_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_date date not null,
  score integer not null,
  total integer not null,
  results jsonb not null,
  explanations jsonb,
  created_at timestamptz not null default now()
);

create index if not exists academy_quiz_attempts_user_date
  on public.academy_quiz_attempts (user_id, quiz_date desc);

alter table public.academy_quiz_attempts enable row level security;

drop policy if exists "own quiz attempts are readable" on public.academy_quiz_attempts;
create policy "own quiz attempts are readable"
  on public.academy_quiz_attempts for select to authenticated
  using (auth.uid() = user_id);
