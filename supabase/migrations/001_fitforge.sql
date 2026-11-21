-- FitForge: apply once with the Supabase SQL editor or Supabase CLI.
-- Personal aggregate is deliberately atomic: a completed workout and its logs
-- cannot partially save. PostgreSQL JSONB retains exact historical rep ranges.
begin;
create table public.exercises (
  id text primary key,
  name text not null,
  primary_muscle text not null,
  equipment text[] not null default '{}',
  guide jsonb not null
);
alter table public.exercises enable row level security;
create policy "Authenticated catalogue reads" on public.exercises for select to authenticated using (true);
grant select on public.exercises to authenticated;
revoke all on public.exercises from anon;

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object' and state->>'version' = '1'),
  updated_at timestamptz not null default now(),
  constraint state_size_limit check (octet_length(state::text) <= 20000000)
);
alter table public.user_preferences enable row level security;
create policy "Own preferences read" on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own preferences insert" on public.user_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own preferences update" on public.user_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own preferences delete" on public.user_preferences for delete to authenticated using ((select auth.uid()) = user_id);
grant select,insert,update,delete on public.user_preferences to authenticated;
revoke all on public.user_preferences from anon;

-- Security-invoker views expose relational reporting surfaces without duplicating
-- the authoritative state. They inherit underlying per-user RLS on PostgreSQL 15+.
create view public.profiles with (security_invoker=true) as
 select user_id, state->>'name' as name, state->>'experience' as experience, state->'goals' as goals from public.user_preferences;
create view public.equipment with (security_invoker=true) as
 select user_id, item->>'id' as id, item as configuration from public.user_preferences cross join lateral jsonb_array_elements(state->'equipment') item;
create view public.workout_plans with (security_invoker=true) as
 select user_id, item->>'id' as id, item->>'name' as name, item as plan from public.user_preferences cross join lateral jsonb_array_elements(state->'plans') item;
create view public.workout_days with (security_invoker=true) as
 select user_id,id as plan_id,(plan->>'day')::int as weekday,(plan->>'minutes')::int as target_minutes from public.workout_plans;
create view public.planned_exercises with (security_invoker=true) as
 select user_id,id as plan_id,item->>'id' as id,item as prescription from public.workout_plans cross join lateral jsonb_array_elements(plan->'exercises') item;
create view public.workout_sessions with (security_invoker=true) as
 select user_id,item->>'id' as id,item->>'date' as local_date,item->>'status' as status,item as session from public.user_preferences cross join lateral jsonb_array_elements(state->'sessions') item;
create view public.exercise_logs with (security_invoker=true) as
 select user_id,id as session_id,status,item->>'id' as id,item as log from public.workout_sessions cross join lateral jsonb_array_elements(session->'logs') item;
create view public.body_measurements with (security_invoker=true) as
 select user_id,item->>'id' as id,item as measurement from public.user_preferences cross join lateral jsonb_array_elements(state->'measurements') item;
create view public.personal_records with (security_invoker=true) as
 select distinct on (user_id,log->>'exerciseId') user_id,log->>'exerciseId' as exercise_id,log->>'unit' as unit,(log->>'weight')::numeric as weight,(log->>'reps')::integer as reps
 from public.exercise_logs where status='completed' and log->>'unit' <> 'bodyweight' and log->>'reps' is not null
 order by user_id,log->>'exerciseId',(log->>'weight')::numeric desc,(log->>'reps')::integer desc;
grant select on public.profiles,public.equipment,public.workout_plans,public.workout_days,public.planned_exercises,public.workout_sessions,public.exercise_logs,public.body_measurements,public.personal_records to authenticated;
commit;
