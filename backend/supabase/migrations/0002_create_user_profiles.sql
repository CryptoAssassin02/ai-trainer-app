create table public.user_profiles (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  name text null,
  age integer null,
  gender text null,
  height numeric null,
  weight numeric null,
  experience_level text null,
  fitness_goals text[] null default '{}'::text[],
  equipment text[] null default '{}'::text[],
  medical_conditions text null,
  unit_preference text null default 'metric'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_profiles_pkey primary key (id),
  constraint user_profiles_user_id_key unique (user_id),
  constraint user_profiles_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint user_profiles_unit_preference_check check (
    (
      unit_preference = any (array['metric'::text, 'imperial'::text])
    )
  ),
  constraint user_profiles_age_check check (
    (
      (age >= 13)
      and (age <= 120)
    )
  ),
  constraint user_profiles_weight_check check ((weight > (0)::numeric)),
  constraint user_profiles_experience_level_check check (
    (
      experience_level = any (
        array[
          'beginner'::text,
          'intermediate'::text,
          'advanced'::text
        ]
      )
    )
  ),
  constraint user_profiles_height_check check ((height > (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_user_id on public.user_profiles using btree (user_id) TABLESPACE pg_default;

create trigger update_user_profiles_updated_at BEFORE
update on user_profiles for EACH row
execute FUNCTION public.update_updated_at_column ();