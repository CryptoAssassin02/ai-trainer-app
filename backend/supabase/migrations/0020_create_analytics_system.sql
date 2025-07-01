-- Analytics System Core Table and Infrastructure
-- Following established migration patterns for user_analytics_aggregates

create table public.user_analytics_aggregates (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  
  -- Time dimensions for efficient querying
  date date not null,
  week_start date not null,
  month_start date not null,
  
  -- Physical metrics (aggregated from user_check_ins)
  avg_weight numeric null,
  weight_change numeric null default 0,
  avg_body_fat_percentage numeric null,
  body_fat_change numeric null default 0,
  measurements_summary jsonb null default '{}'::jsonb,
  
  -- Workout performance metrics (aggregated from workout_logs)
  workouts_completed integer null default 0,
  total_exercises integer null default 0,
  avg_difficulty numeric null,
  avg_energy numeric null,
  avg_satisfaction numeric null,
  volume_progression jsonb null default '{}'::jsonb,
  
  -- Wellness trends (aggregated from user_check_ins)
  avg_mood_score numeric null,
  avg_sleep_score numeric null,
  avg_energy_level numeric null,
  avg_stress_level numeric null,
  wellness_trend_score numeric null,
  
  -- AI insights placeholder (will be populated by analytics agent)
  ai_insights jsonb null default '{}'::jsonb,
  pattern_insights jsonb null default '{}'::jsonb,
  goal_predictions jsonb null default '{}'::jsonb,
  
  -- Consistency tracking
  workout_consistency_score numeric null default 0,
  nutrition_consistency_score numeric null default 0,
  overall_adherence_score numeric null default 0,
  
  -- Metadata
  data_quality_score numeric null default 1.0,
  last_calculated timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  
  -- Primary key and constraints
  constraint user_analytics_aggregates_pkey primary key (id),
  constraint user_analytics_aggregates_user_date_unique unique (user_id, date),
  constraint user_analytics_aggregates_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  
  -- Data validation constraints
  constraint user_analytics_aggregates_weight_check check ((avg_weight > (0)::numeric and avg_weight < (1000)::numeric) or avg_weight is null),
  constraint user_analytics_aggregates_body_fat_check check ((avg_body_fat_percentage >= (1)::numeric and avg_body_fat_percentage <= (50)::numeric) or avg_body_fat_percentage is null),
  constraint user_analytics_aggregates_difficulty_check check ((avg_difficulty >= 1 and avg_difficulty <= 10) or avg_difficulty is null),
  constraint user_analytics_aggregates_energy_check check ((avg_energy >= 1 and avg_energy <= 10) or avg_energy is null),
  constraint user_analytics_aggregates_satisfaction_check check ((avg_satisfaction >= 1 and avg_satisfaction <= 10) or avg_satisfaction is null),
  constraint user_analytics_aggregates_mood_check check ((avg_mood_score >= 1 and avg_mood_score <= 10) or avg_mood_score is null),
  constraint user_analytics_aggregates_sleep_check check ((avg_sleep_score >= 1 and avg_sleep_score <= 10) or avg_sleep_score is null),
  constraint user_analytics_aggregates_energy_level_check check ((avg_energy_level >= 1 and avg_energy_level <= 10) or avg_energy_level is null),
  constraint user_analytics_aggregates_stress_check check ((avg_stress_level >= 1 and avg_stress_level <= 10) or avg_stress_level is null),
  constraint user_analytics_aggregates_quality_check check ((data_quality_score >= 0 and data_quality_score <= 1) or data_quality_score is null),
  constraint user_analytics_aggregates_consistency_check check ((workout_consistency_score >= 0 and workout_consistency_score <= 1) or workout_consistency_score is null),
  constraint user_analytics_aggregates_nutrition_consistency_check check ((nutrition_consistency_score >= 0 and nutrition_consistency_score <= 1) or nutrition_consistency_score is null),
  constraint user_analytics_aggregates_adherence_check check ((overall_adherence_score >= 0 and overall_adherence_score <= 1) or overall_adherence_score is null)
) tablespace pg_default;

-- Performance-optimized indexes following established patterns
create index if not exists idx_user_analytics_aggregates_user_id on public.user_analytics_aggregates using btree (user_id) tablespace pg_default;
create index if not exists idx_user_analytics_aggregates_date on public.user_analytics_aggregates using btree (date) tablespace pg_default;
create index if not exists idx_user_analytics_aggregates_user_date on public.user_analytics_aggregates using btree (user_id, date) tablespace pg_default;
create index if not exists idx_user_analytics_aggregates_week_start on public.user_analytics_aggregates using btree (user_id, week_start) tablespace pg_default;
create index if not exists idx_user_analytics_aggregates_month_start on public.user_analytics_aggregates using btree (user_id, month_start) tablespace pg_default;
create index if not exists idx_user_analytics_aggregates_last_calculated on public.user_analytics_aggregates using btree (last_calculated) tablespace pg_default;

-- Updated_at trigger following established pattern
create trigger update_user_analytics_aggregates_updated_at before
update on user_analytics_aggregates for each row
execute function public.update_updated_at_column();

-- Enable Row Level Security following established patterns
alter table public.user_analytics_aggregates enable row level security;

-- Drop existing policies if they exist to avoid conflicts
drop policy if exists "Users can view their own analytics" on public.user_analytics_aggregates;
drop policy if exists "Users can insert their own analytics" on public.user_analytics_aggregates;
drop policy if exists "Users can update their own analytics" on public.user_analytics_aggregates;
drop policy if exists "Users can delete their own analytics" on public.user_analytics_aggregates;
drop policy if exists "Service role can manage all analytics" on public.user_analytics_aggregates;

-- Create comprehensive RLS policies for user_analytics_aggregates
create policy "Users can view their own analytics" on public.user_analytics_aggregates
  for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own analytics" on public.user_analytics_aggregates
  for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own analytics" on public.user_analytics_aggregates
  for update 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own analytics" on public.user_analytics_aggregates
  for delete 
  using (auth.uid() = user_id);

-- Service role policy for system operations
create policy "Service role can manage all analytics" on public.user_analytics_aggregates
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role'); 