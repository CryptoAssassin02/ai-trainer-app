create table public.analytics_events (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  event_type text not null,
  timestamp timestamp with time zone null default now(),
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  agent_type text null,
  constraint analytics_events_pkey primary key (id),
  constraint analytics_events_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_analytics_events_user_id on public.analytics_events using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_analytics_events_type on public.analytics_events using btree (event_type) TABLESPACE pg_default;

create index IF not exists idx_analytics_events_timestamp on public.analytics_events using btree ("timestamp") TABLESPACE pg_default;

create index IF not exists idx_analytics_events_metadata on public.analytics_events using gin (metadata jsonb_path_ops) TABLESPACE pg_default;

create index IF not exists analytics_events_user_id_idx on public.analytics_events using btree (user_id) TABLESPACE pg_default;

create index IF not exists analytics_events_event_type_idx on public.analytics_events using btree (event_type) TABLESPACE pg_default;

create trigger update_analytics_events_updated_at BEFORE
update on analytics_events for EACH row
execute FUNCTION update_updated_at_column ();