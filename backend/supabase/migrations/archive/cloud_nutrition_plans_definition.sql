create table public.nutrition_plans (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  bmr numeric null,
  tdee numeric null,
  macros jsonb null,
  meal_plan jsonb null,
  food_suggestions jsonb null,
  explanations text null,
  status text null default 'active'::text,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  calorie_adjustment integer null,
  constraint nutrition_plans_pkey primary key (id),
  constraint nutrition_plans_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_nutrition_plans_user_id on public.nutrition_plans using btree (user_id) TABLESPACE pg_default;

create trigger trigger_update_nutrition_plans_updated_at BEFORE
update on nutrition_plans for EACH row
execute FUNCTION update_nutrition_plans_updated_at ();