create table public.workout_plans (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name text not null,
  description text null,
  plan_data jsonb not null default '{}'::jsonb,
  ai_generated boolean null default false,
  status text null default 'draft'::text,
  difficulty_level text null,
  estimated_duration integer null,
  schedule_frequency text null,
  tags text[] null default '{}'::text[],
  goals text[] null default '{}'::text[],
  equipment_required text[] null default '{}'::text[],
  ai_reasoning jsonb null default '{}'::jsonb,
  version integer null default 1,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  advanced_splits jsonb null,
  constraint workout_plans_pkey primary key (id),
  constraint workout_plans_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint workout_plans_difficulty_level_check check (
    (
      difficulty_level = any (
        array[
          'beginner'::text,
          'intermediate'::text,
          'advanced'::text
        ]
      )
    )
  ),
  constraint workout_plans_estimated_duration_check check ((estimated_duration > 0)),
  constraint workout_plans_schedule_frequency_check check (
    (
      schedule_frequency = any (
        array[
          'daily'::text,
          'weekly'::text,
          'monthly'::text,
          'custom'::text
        ]
      )
    )
  ),
  constraint workout_plans_status_check check (
    (
      status = any (
        array['draft'::text, 'active'::text, 'archived'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_workout_plans_user_id on public.workout_plans using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_workout_plans_status on public.workout_plans using btree (status) TABLESPACE pg_default;

create index IF not exists idx_workout_plans_tags on public.workout_plans using gin (tags) TABLESPACE pg_default;

create trigger trigger_update_workout_plans_updated_at BEFORE
update on workout_plans for EACH row
execute FUNCTION update_workout_plans_updated_at ();

create trigger update_workout_plans_updated_at BEFORE
update on workout_plans for EACH row
execute FUNCTION update_updated_at_column ();