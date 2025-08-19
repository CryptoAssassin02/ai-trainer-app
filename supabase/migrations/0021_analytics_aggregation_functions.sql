-- Analytics Aggregation Functions
-- Following established function patterns for analytics system

-- Function to refresh user analytics aggregates for a specific user and date range
create or replace function public.refresh_user_analytics(
  target_user_id uuid,
  start_date date default current_date - interval '30 days',
  end_date date default current_date
)
returns void as $$
declare
  current_date_iter date;
  week_start_date date;
  month_start_date date;
  workout_stats record;
  checkin_stats record;
  meal_stats record;
begin
  -- Validate inputs
  if target_user_id is null then
    raise exception 'target_user_id cannot be null';
  end if;
  
  if start_date > end_date then
    raise exception 'start_date cannot be greater than end_date';
  end if;

  -- Loop through each date in the range
  current_date_iter := start_date;
  while current_date_iter <= end_date loop
    -- Calculate time dimensions
    week_start_date := date_trunc('week', current_date_iter)::date;
    month_start_date := date_trunc('month', current_date_iter)::date;
    
    -- Get workout statistics for the current date
    select 
      count(*) as workouts_completed,
      sum(array_length(string_to_array(trim(both '[]' from wl.exercises_completed::text), ','), 1)) as total_exercises,
      avg(wl.overall_difficulty) as avg_difficulty,
      avg(wl.energy_level) as avg_energy,
      avg(wl.satisfaction) as avg_satisfaction
    into workout_stats
    from workout_logs wl
    where wl.user_id = target_user_id 
      and wl.date = current_date_iter;
    
    -- Get check-in statistics for the current date
    select 
      avg(weight) as avg_weight,
      avg(body_fat_percentage) as avg_body_fat,
      avg(case 
        when mood = 'poor' then 1
        when mood = 'fair' then 3
        when mood = 'good' then 7
        when mood = 'excellent' then 10
        else null
      end) as mood_score,
      avg(case 
        when sleep_quality = 'poor' then 1
        when sleep_quality = 'fair' then 3
        when sleep_quality = 'good' then 7
        when sleep_quality = 'excellent' then 10
        else null
      end) as sleep_score,
      avg(energy_level) as avg_energy_level,
      avg(stress_level) as avg_stress_level,
      jsonb_agg(measurements) filter (where measurements is not null) as measurements
    into checkin_stats
    from user_check_ins uci
    where uci.user_id = target_user_id 
      and uci.date = current_date_iter;
    
    -- Get nutrition statistics for the current date
    select 
      count(*) as meals_logged,
      avg(calories) as avg_calories
    into meal_stats
    from meal_logs ml
    where ml.user_id = target_user_id 
      and ml.logged_at::date = current_date_iter;
    
    -- Insert or update analytics aggregate
    insert into user_analytics_aggregates (
      user_id,
      date,
      week_start,
      month_start,
      avg_weight,
      avg_body_fat_percentage,
      workouts_completed,
      total_exercises,
      avg_difficulty,
      avg_energy,
      avg_satisfaction,
      avg_mood_score,
      avg_sleep_score,
      avg_energy_level,
      avg_stress_level,
      measurements_summary,
      data_quality_score,
      last_calculated
    ) values (
      target_user_id,
      current_date_iter,
      week_start_date,
      month_start_date,
      checkin_stats.avg_weight,
      checkin_stats.avg_body_fat,
      coalesce(workout_stats.workouts_completed, 0),
      coalesce(workout_stats.total_exercises, 0),
      workout_stats.avg_difficulty,
      workout_stats.avg_energy,
      workout_stats.avg_satisfaction,
      checkin_stats.mood_score,
      checkin_stats.sleep_score,
      checkin_stats.avg_energy_level,
      checkin_stats.avg_stress_level,
      coalesce(
        case 
          when checkin_stats.measurements is not null and jsonb_array_length(checkin_stats.measurements) > 0 
          then checkin_stats.measurements->0 
          else '{}'::jsonb 
        end, 
        '{}'::jsonb
      ),
      case 
        when workout_stats.workouts_completed > 0 and checkin_stats.avg_weight is not null then 1.0
        when workout_stats.workouts_completed > 0 or checkin_stats.avg_weight is not null then 0.7
        else 0.3
      end,
      now()
    )
    on conflict (user_id, date) 
    do update set
      avg_weight = excluded.avg_weight,
      avg_body_fat_percentage = excluded.avg_body_fat_percentage,
      workouts_completed = excluded.workouts_completed,
      total_exercises = excluded.total_exercises,
      avg_difficulty = excluded.avg_difficulty,
      avg_energy = excluded.avg_energy,
      avg_satisfaction = excluded.avg_satisfaction,
      avg_mood_score = excluded.avg_mood_score,
      avg_sleep_score = excluded.avg_sleep_score,
      avg_energy_level = excluded.avg_energy_level,
      avg_stress_level = excluded.avg_stress_level,
      measurements_summary = excluded.measurements_summary,
      data_quality_score = excluded.data_quality_score,
      last_calculated = excluded.last_calculated,
      updated_at = now();
    
    current_date_iter := current_date_iter + interval '1 day';
  end loop;
end;
$$ language plpgsql security definer;

-- Function to calculate strength progression over time
create or replace function public.calculate_strength_progression(
  target_user_id uuid,
  days_back integer default 30
)
returns jsonb as $$
declare
  progression_data jsonb := '{}';
  exercise_name_var text;
  exercise_stats record;
  start_date date;
begin
  -- Validate inputs
  if target_user_id is null then
    raise exception 'target_user_id cannot be null';
  end if;
  
  start_date := current_date - (days_back || ' days')::interval;
  
  -- Get unique exercise names first
  for exercise_name_var in 
    select distinct exercise_data->>'exercise' as exercise_name
    from workout_logs wl, 
         jsonb_array_elements(wl.exercises_completed) as exercise_data
    where wl.user_id = target_user_id 
      and wl.date >= start_date
      and wl.exercises_completed is not null
      and exercise_data->>'exercise' is not null
  loop
    -- Calculate progression for each exercise
    select 
      count(*) as sessions_count,
      avg(max_weight) as avg_max_weight,
      max(max_weight) as peak_weight,
      (max(max_weight) - min(max_weight)) as weight_progression
    into exercise_stats
    from (
      select wl.date, max((sets_data->>'weight')::numeric) as max_weight
      from workout_logs wl,
           jsonb_array_elements(wl.exercises_completed) as exercise_data,
           jsonb_array_elements(exercise_data->'sets') as sets_data
      where wl.user_id = target_user_id 
        and wl.date >= start_date
        and exercise_data->>'exercise' = exercise_name_var
        and sets_data->>'weight' is not null
      group by wl.date
    ) daily_maxes
    where max_weight is not null;
    
    -- Only include exercises with at least 2 sessions
    if exercise_stats.sessions_count >= 2 then
      progression_data := progression_data || jsonb_build_object(
        exercise_name_var,
        jsonb_build_object(
          'sessions_count', exercise_stats.sessions_count,
          'avg_max_weight', exercise_stats.avg_max_weight,
          'peak_weight', exercise_stats.peak_weight,
          'progression', exercise_stats.weight_progression,
          'progression_rate', case 
            when exercise_stats.weight_progression > 0 then 'improving'
            when exercise_stats.weight_progression = 0 then 'stable'
            else 'declining'
          end
        )
      );
    end if;
  end loop;
  
  return progression_data;
end;
$$ language plpgsql security definer;

-- Function to compute adherence metrics
create or replace function public.compute_adherence_metrics(
  target_user_id uuid,
  days_back integer default 30
)
returns jsonb as $$
declare
  workout_adherence numeric := 0;
  nutrition_adherence numeric := 0;
  total_days integer;
  workout_days integer;
  meal_days integer;
  start_date date;
begin
  -- Validate inputs
  if target_user_id is null then
    raise exception 'target_user_id cannot be null';
  end if;
  
  start_date := current_date - (days_back || ' days')::interval;
  total_days := days_back;
  
  -- Calculate workout adherence
  select count(distinct date)
  into workout_days
  from workout_logs
  where user_id = target_user_id 
    and date >= start_date;
  
  workout_adherence := case 
    when total_days > 0 then workout_days::numeric / total_days::numeric
    else 0 
  end;
  
  -- Calculate nutrition adherence
  select count(distinct logged_at::date)
  into meal_days
  from meal_logs
  where user_id = target_user_id 
    and logged_at >= start_date;
  
  nutrition_adherence := case 
    when total_days > 0 then meal_days::numeric / total_days::numeric
    else 0 
  end;
  
  return jsonb_build_object(
    'workout_adherence', workout_adherence,
    'nutrition_adherence', nutrition_adherence,
    'overall_adherence', (workout_adherence + nutrition_adherence) / 2,
    'workout_days', workout_days,
    'meal_days', meal_days,
    'total_days_analyzed', total_days,
    'analysis_period_start', start_date,
    'analysis_period_end', current_date
  );
end;
$$ language plpgsql security definer;

-- Function to generate wellness trends
create or replace function public.generate_wellness_trends(
  target_user_id uuid,
  days_back integer default 30
)
returns jsonb as $$
declare
  wellness_data jsonb := '{}';
  mood_trend numeric;
  sleep_trend numeric;
  energy_trend numeric;
  stress_trend numeric;
  start_date date;
begin
  -- Validate inputs
  if target_user_id is null then
    raise exception 'target_user_id cannot be null';
  end if;
  
  start_date := current_date - (days_back || ' days')::interval;
  
  -- Calculate wellness trends using analytics aggregates
  select 
    avg(case when avg_mood_score is not null then avg_mood_score else null end),
    avg(case when avg_sleep_score is not null then avg_sleep_score else null end),
    avg(case when avg_energy_level is not null then avg_energy_level else null end),
    avg(case when avg_stress_level is not null then avg_stress_level else null end)
  into mood_trend, sleep_trend, energy_trend, stress_trend
  from user_analytics_aggregates
  where user_id = target_user_id 
    and date >= start_date;
  
  -- Build wellness trends object
  wellness_data := jsonb_build_object(
    'mood_trend', coalesce(mood_trend, 0),
    'sleep_trend', coalesce(sleep_trend, 0),
    'energy_trend', coalesce(energy_trend, 0),
    'stress_trend', coalesce(stress_trend, 0),
    'overall_wellness_score', (
      coalesce(mood_trend, 5) + 
      coalesce(sleep_trend, 5) + 
      coalesce(energy_trend, 5) + 
      (10 - coalesce(stress_trend, 5))
    ) / 4,
    'analysis_period', jsonb_build_object(
      'start_date', start_date,
      'end_date', current_date,
      'days_analyzed', days_back
    )
  );
  
  return wellness_data;
end;
$$ language plpgsql security definer;

-- Grant execute permissions following established patterns
grant execute on function public.refresh_user_analytics(uuid, date, date) to authenticated, service_role;
grant execute on function public.calculate_strength_progression(uuid, integer) to authenticated, service_role;
grant execute on function public.compute_adherence_metrics(uuid, integer) to authenticated, service_role;
grant execute on function public.generate_wellness_trends(uuid, integer) to authenticated, service_role; 