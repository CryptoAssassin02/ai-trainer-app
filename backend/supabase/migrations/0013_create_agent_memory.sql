create table public.agent_memory (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  embedding public.vector(1536) null,
  content jsonb not null default '{}'::jsonb,
  type text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone not null default now(),
  agent_type text null,
  metadata jsonb null default '{}'::jsonb,
  is_archived boolean null default false,
  consolidated_into uuid null,
  archived_at timestamp with time zone null,
  workout_plan_id uuid null,
  workout_log_id uuid null,
  version integer null default 1,
  constraint agent_memory_pkey primary key (id),
  constraint agent_memory_consolidated_into_fkey foreign KEY (consolidated_into) references agent_memory (id),
  constraint agent_memory_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint agent_memory_workout_log_id_fkey foreign KEY (workout_log_id) references workout_logs (id) on delete CASCADE,
  constraint agent_memory_workout_plan_id_fkey foreign KEY (workout_plan_id) references workout_plans (id) on delete CASCADE,
  constraint agent_memory_agent_type_check check (
    (
      agent_type = any (
        array[
          'nutrition'::text,
          'workout'::text,
          'research'::text,
          'adjustment'::text,
          'system'::text,
          'feedback'::text
        ]
      )
    )
  ),
  constraint valid_embedding check (
    (
      (embedding is null)
      or (vector_dims (embedding) = 1536)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_agent_memory_agent_type on public.agent_memory using btree (agent_type) TABLESPACE pg_default;

create index IF not exists idx_agent_memory_created_at on public.agent_memory using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_agent_memory_is_archived on public.agent_memory using btree (is_archived) TABLESPACE pg_default;

create index IF not exists idx_agent_memory_embedding_hnsw on public.agent_memory using hnsw (embedding vector_cosine_ops) TABLESPACE pg_default;

create index IF not exists idx_agent_memory_user_id on public.agent_memory using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_agent_memory_type on public.agent_memory using btree (type) TABLESPACE pg_default;

create index IF not exists idx_agent_memory_content on public.agent_memory using gin (content jsonb_path_ops) TABLESPACE pg_default;

create index IF not exists idx_agent_memory_embedding on public.agent_memory using ivfflat (embedding vector_cosine_ops)
with
  (lists = '100') TABLESPACE pg_default;

create index IF not exists idx_agent_memory_workout_plan_id on public.agent_memory using btree (workout_plan_id) TABLESPACE pg_default
where
  (workout_plan_id is not null);

create index IF not exists idx_agent_memory_workout_log_id on public.agent_memory using btree (workout_log_id) TABLESPACE pg_default
where
  (workout_log_id is not null);

create index IF not exists idx_agent_memory_user_plan on public.agent_memory using btree (user_id, workout_plan_id) TABLESPACE pg_default
where
  (
    (user_id is not null)
    and (workout_plan_id is not null)
  );

create index IF not exists idx_agent_memory_agent_type_plan on public.agent_memory using btree (agent_type, workout_plan_id) TABLESPACE pg_default
where
  (
    (agent_type is not null)
    and (workout_plan_id is not null)
  );

create trigger update_agent_memory_updated_at BEFORE
update on agent_memory for EACH row
execute FUNCTION update_updated_at_column ();

create trigger increment_agent_memory_version BEFORE
update on agent_memory for EACH row
execute FUNCTION increment_version_on_update ();