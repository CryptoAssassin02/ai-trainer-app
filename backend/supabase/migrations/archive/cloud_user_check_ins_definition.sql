create table public.user_check_ins (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  date date not null,
  weight numeric null,
  body_fat_percentage numeric null,
  measurements jsonb null default '{}'::jsonb,
  mood text null,
  sleep_quality text null,
  energy_level integer null,
  stress_level integer null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_check_ins_pkey primary key (id),
  constraint user_check_ins_user_id_date_key unique (user_id, date),
  constraint user_check_ins_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint user_check_ins_sleep_quality_check check (
    (
      sleep_quality = any (
        array[
          'poor'::text,
          'fair'::text,
          'good'::text,
          'excellent'::text
        ]
      )
    )
  ),
  constraint user_check_ins_stress_level_check check (
    (
      (stress_level >= 1)
      and (stress_level <= 10)
    )
  ),
  constraint user_check_ins_body_fat_percentage_check check (
    (
      (body_fat_percentage >= (1)::numeric)
      and (body_fat_percentage <= (50)::numeric)
    )
  ),
  constraint user_check_ins_weight_check check ((weight > (0)::numeric)),
  constraint user_check_ins_energy_level_check check (
    (
      (energy_level >= 1)
      and (energy_level <= 10)
    )
  ),
  constraint user_check_ins_mood_check check (
    (
      mood = any (
        array[
          'poor'::text,
          'fair'::text,
          'good'::text,
          'excellent'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_user_check_ins_user_date on public.user_check_ins using btree (user_id, date) TABLESPACE pg_default;

create index IF not exists user_check_ins_user_id_idx on public.user_check_ins using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_user_check_ins_user_id on public.user_check_ins using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_user_check_ins_date on public.user_check_ins using btree (date) TABLESPACE pg_default;

create trigger trigger_update_user_check_ins_updated_at BEFORE
update on user_check_ins for EACH row
execute FUNCTION update_user_check_ins_updated_at ();

create trigger update_user_check_ins_updated_at BEFORE
update on user_check_ins for EACH row
execute FUNCTION update_updated_at_column ();