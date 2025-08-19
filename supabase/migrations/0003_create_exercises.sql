create table public.exercises (
  id uuid not null default gen_random_uuid (),
  exercise_name text not null,
  equipment text null,
  category text null,
  primary_muscles text[] null,
  secondary_muscles text[] null,
  force_type text null,
  level text null,
  mechanic text null,
  external_id text null,
  instructions text[] null,
  image_urls text[] null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint exercises_pkey primary key (id),
  constraint exercises_exercise_name_key unique (exercise_name)
) TABLESPACE pg_default;

create index IF not exists exercises_exercise_name_idx on public.exercises using btree (exercise_name) TABLESPACE pg_default;