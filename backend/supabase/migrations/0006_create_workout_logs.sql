create table public.workout_logs (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  plan_id uuid null,
  date date not null,
  completed boolean null default true,
  exercises_completed jsonb not null default '{}'::jsonb,
  overall_difficulty integer null,
  energy_level integer null,
  satisfaction integer null,
  feedback text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint workout_logs_pkey primary key (id),
  constraint workout_logs_plan_id_fkey foreign KEY (plan_id) references workout_plans (id) on delete set null,
  constraint workout_logs_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint workout_logs_energy_level_check check (
    (
      (energy_level >= 1)
      and (energy_level <= 10)
    )
  ),
  constraint workout_logs_overall_difficulty_check check (
    (
      (overall_difficulty >= 1)
      and (overall_difficulty <= 10)
    )
  ),
  constraint workout_logs_satisfaction_check check (
    (
      (satisfaction >= 1)
      and (satisfaction <= 10)
    )
  )
) TABLESPACE pg_default;

create index IF not exists workout_logs_user_id_idx on public.workout_logs using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_workout_logs_user_id on public.workout_logs using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_workout_logs_plan_id on public.workout_logs using btree (plan_id) TABLESPACE pg_default;

create index IF not exists idx_workout_logs_date on public.workout_logs using btree (date) TABLESPACE pg_default;

create index IF not exists idx_workout_logs_user_date on public.workout_logs using btree (user_id, date) TABLESPACE pg_default;

create trigger update_workout_logs_updated_at BEFORE
update on workout_logs for EACH row
execute FUNCTION public.update_updated_at_column ();