-- Update workout_plans plan_data to support weekly_structures per mesocycle and adjustment_history log
-- Idempotent migration: safe to run multiple times

DO $$
BEGIN
  -- Ensure plan_data has adjustment_history array at root
  UPDATE public.workout_plans
  SET plan_data = jsonb_set(
    plan_data,
    '{adjustment_history}',
    COALESCE(plan_data->'adjustment_history', '[]'::jsonb),
    true
  )
  WHERE (plan_data->'adjustment_history') IS NULL;

  -- Ensure each mesocycle object has weekly_structures array
  -- Operate only when mesocycles is an array
  UPDATE public.workout_plans
  SET plan_data = jsonb_set(
    plan_data,
    '{mesocycles}',
    (
      SELECT COALESCE(jsonb_agg(
        CASE
          WHEN jsonb_typeof(m) = 'object' THEN
            -- add weekly_structures: [] if missing
            CASE WHEN (m ? 'weekly_structures') THEN m ELSE jsonb_set(m, '{weekly_structures}', '[]'::jsonb, true) END
          ELSE m
        END
      ), '[]'::jsonb)
      FROM jsonb_array_elements(COALESCE(plan_data->'mesocycles', '[]'::jsonb)) AS t(m)
    ),
    true
  )
  WHERE jsonb_typeof(plan_data->'mesocycles') = 'array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(plan_data->'mesocycles', '[]'::jsonb)) AS t(m)
      WHERE jsonb_typeof(m) = 'object' AND NOT (m ? 'weekly_structures')
    );

  -- Optional: add COMMENTs documenting new fields (for maintainability)
  PERFORM 1;
END $$;
