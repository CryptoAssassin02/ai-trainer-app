create table public.contraindications (
  id uuid not null default gen_random_uuid (),
  condition text not null,
  exercises_to_avoid text[] null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  notes text null,
  constraint contraindications_pkey primary key (id),
  constraint contraindications_condition_key unique (condition)
) TABLESPACE pg_default;