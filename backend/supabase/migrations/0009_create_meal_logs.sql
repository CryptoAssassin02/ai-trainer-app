create table public.meal_logs (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  nutrition_plan_id uuid null,
  meal_type text null,
  foods jsonb null,
  macros_consumed jsonb null,
  calories double precision null,
  logged_at timestamp without time zone null default now(),
  feedback text null,
  updated_at timestamp without time zone null default now(),
  constraint meal_logs_pkey primary key (id),
  constraint meal_logs_nutrition_plan_id_fkey foreign KEY (nutrition_plan_id) references nutrition_plans (id),
  constraint meal_logs_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_meal_logs_user_id on public.meal_logs using btree (user_id) TABLESPACE pg_default;

create trigger update_meal_logs_updated_at BEFORE
update on meal_logs for EACH row
execute FUNCTION public.update_updated_at_column ();