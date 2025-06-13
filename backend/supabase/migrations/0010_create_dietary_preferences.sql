create table public.dietary_preferences (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  diet_type text null,
  allergies text[] null,
  meal_frequency integer null,
  time_constraints text null,
  performance_goals text null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  restrictions jsonb null default '{}'::jsonb,
  constraint dietary_preferences_pkey primary key (id),
  constraint dietary_preferences_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_dietary_preferences_user_id on public.dietary_preferences using btree (user_id) TABLESPACE pg_default;

create trigger update_dietary_preferences_updated_at BEFORE
update on dietary_preferences for EACH row
execute FUNCTION public.update_updated_at_column ();