create extension if not exists "vector" with schema "public" version '0.8.0';

create table "public"."agent_memory" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "embedding" vector(1536),
    "content" jsonb not null default '{}'::jsonb,
    "type" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone not null default now(),
    "agent_type" text,
    "metadata" jsonb default '{}'::jsonb,
    "is_archived" boolean default false,
    "consolidated_into" uuid,
    "archived_at" timestamp with time zone,
    "workout_plan_id" uuid,
    "workout_log_id" uuid,
    "version" integer default 1
);


create table "public"."analytics_events" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "event_type" text not null,
    "timestamp" timestamp with time zone default now(),
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "agent_type" text
);


create table "public"."contraindications" (
    "id" uuid not null default gen_random_uuid(),
    "condition" text not null,
    "exercises_to_avoid" text[],
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP,
    "notes" text
);


create table "public"."dietary_preferences" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "diet_type" text,
    "allergies" text[],
    "meal_frequency" integer,
    "time_constraints" text,
    "performance_goals" text,
    "created_at" timestamp without time zone default now(),
    "updated_at" timestamp without time zone default now(),
    "restrictions" jsonb default '{}'::jsonb
);


create table "public"."exercises" (
    "id" uuid not null default gen_random_uuid(),
    "exercise_name" text not null,
    "equipment" text,
    "category" text,
    "primary_muscles" text[],
    "secondary_muscles" text[],
    "force_type" text,
    "level" text,
    "mechanic" text,
    "external_id" text,
    "instructions" text[],
    "image_urls" text[],
    "created_at" timestamp without time zone default CURRENT_TIMESTAMP
);


create table "public"."meal_logs" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "nutrition_plan_id" uuid,
    "meal_type" text,
    "foods" jsonb,
    "macros_consumed" jsonb,
    "calories" double precision,
    "logged_at" timestamp without time zone default now(),
    "feedback" text,
    "updated_at" timestamp without time zone default now()
);


create table "public"."notification_preferences" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "email_enabled" boolean default false,
    "sms_enabled" boolean default false,
    "push_enabled" boolean default false,
    "in_app_enabled" boolean default true,
    "quiet_hours_start" text,
    "quiet_hours_end" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."nutrition_plans" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "bmr" numeric,
    "tdee" numeric,
    "macros" jsonb,
    "meal_plan" jsonb,
    "food_suggestions" jsonb,
    "explanations" text,
    "status" text default 'active'::text,
    "created_at" timestamp without time zone default now(),
    "updated_at" timestamp without time zone default now(),
    "calorie_adjustment" integer
);


create table "public"."user_check_ins" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "date" date not null,
    "weight" numeric,
    "body_fat_percentage" numeric,
    "measurements" jsonb default '{}'::jsonb,
    "mood" text,
    "sleep_quality" text,
    "energy_level" integer,
    "stress_level" integer,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."user_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text,
    "age" integer,
    "gender" text,
    "height" numeric,
    "weight" numeric,
    "experience_level" text,
    "fitness_goals" text[] default '{}'::text[],
    "equipment" text[] default '{}'::text[],
    "unit_preference" text default 'metric'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "workout_frequency" text,
    "medical_conditions" jsonb default '[]'::jsonb
);


create table "public"."workout_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "plan_id" uuid,
    "date" date not null,
    "completed" boolean default true,
    "exercises_completed" jsonb not null default '{}'::jsonb,
    "overall_difficulty" integer,
    "energy_level" integer,
    "satisfaction" integer,
    "feedback" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."workout_plans" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "description" text,
    "plan_data" jsonb not null default '{}'::jsonb,
    "ai_generated" boolean default false,
    "status" text default 'draft'::text,
    "difficulty_level" text,
    "estimated_duration" integer,
    "schedule_frequency" text,
    "tags" text[] default '{}'::text[],
    "goals" text[] default '{}'::text[],
    "equipment_required" text[] default '{}'::text[],
    "ai_reasoning" jsonb default '{}'::jsonb,
    "version" integer default 1,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "advanced_splits" jsonb
);


CREATE UNIQUE INDEX agent_memory_pkey ON public.agent_memory USING btree (id);

CREATE INDEX analytics_events_event_type_idx ON public.analytics_events USING btree (event_type);

CREATE UNIQUE INDEX analytics_events_pkey ON public.analytics_events USING btree (id);

CREATE INDEX analytics_events_user_id_idx ON public.analytics_events USING btree (user_id);

CREATE UNIQUE INDEX contraindications_condition_key ON public.contraindications USING btree (condition);

CREATE UNIQUE INDEX contraindications_pkey ON public.contraindications USING btree (id);

CREATE UNIQUE INDEX dietary_preferences_pkey ON public.dietary_preferences USING btree (id);

CREATE INDEX exercises_exercise_name_idx ON public.exercises USING btree (exercise_name);

CREATE UNIQUE INDEX exercises_exercise_name_key ON public.exercises USING btree (exercise_name);

CREATE UNIQUE INDEX exercises_pkey ON public.exercises USING btree (id);

CREATE INDEX idx_agent_memory_agent_type ON public.agent_memory USING btree (agent_type);

CREATE INDEX idx_agent_memory_agent_type_plan ON public.agent_memory USING btree (agent_type, workout_plan_id) WHERE ((agent_type IS NOT NULL) AND (workout_plan_id IS NOT NULL));

CREATE INDEX idx_agent_memory_content ON public.agent_memory USING gin (content jsonb_path_ops);

CREATE INDEX idx_agent_memory_created_at ON public.agent_memory USING btree (created_at);

CREATE INDEX idx_agent_memory_embedding ON public.agent_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');

CREATE INDEX idx_agent_memory_embedding_hnsw ON public.agent_memory USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_agent_memory_is_archived ON public.agent_memory USING btree (is_archived);

CREATE INDEX idx_agent_memory_type ON public.agent_memory USING btree (type);

CREATE INDEX idx_agent_memory_user_id ON public.agent_memory USING btree (user_id);

CREATE INDEX idx_agent_memory_user_plan ON public.agent_memory USING btree (user_id, workout_plan_id) WHERE ((user_id IS NOT NULL) AND (workout_plan_id IS NOT NULL));

CREATE INDEX idx_agent_memory_workout_log_id ON public.agent_memory USING btree (workout_log_id) WHERE (workout_log_id IS NOT NULL);

CREATE INDEX idx_agent_memory_workout_plan_id ON public.agent_memory USING btree (workout_plan_id) WHERE (workout_plan_id IS NOT NULL);

CREATE INDEX idx_analytics_events_metadata ON public.analytics_events USING gin (metadata jsonb_path_ops);

CREATE INDEX idx_analytics_events_timestamp ON public.analytics_events USING btree ("timestamp");

CREATE INDEX idx_analytics_events_type ON public.analytics_events USING btree (event_type);

CREATE INDEX idx_analytics_events_user_id ON public.analytics_events USING btree (user_id);

CREATE INDEX idx_dietary_preferences_user_id ON public.dietary_preferences USING btree (user_id);

CREATE INDEX idx_meal_logs_user_id ON public.meal_logs USING btree (user_id);

CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences USING btree (user_id);

CREATE INDEX idx_nutrition_plans_user_id ON public.nutrition_plans USING btree (user_id);

CREATE INDEX idx_user_check_ins_date ON public.user_check_ins USING btree (date);

CREATE INDEX idx_user_check_ins_user_date ON public.user_check_ins USING btree (user_id, date);

CREATE INDEX idx_user_check_ins_user_id ON public.user_check_ins USING btree (user_id);

CREATE INDEX idx_user_profiles_medical_conditions ON public.user_profiles USING gin (medical_conditions);

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);

CREATE INDEX idx_workout_logs_date ON public.workout_logs USING btree (date);

CREATE INDEX idx_workout_logs_plan_id ON public.workout_logs USING btree (plan_id);

CREATE INDEX idx_workout_logs_user_date ON public.workout_logs USING btree (user_id, date);

CREATE INDEX idx_workout_logs_user_id ON public.workout_logs USING btree (user_id);

CREATE INDEX idx_workout_plans_status ON public.workout_plans USING btree (status);

CREATE INDEX idx_workout_plans_tags ON public.workout_plans USING gin (tags);

CREATE INDEX idx_workout_plans_user_id ON public.workout_plans USING btree (user_id);

CREATE UNIQUE INDEX meal_logs_pkey ON public.meal_logs USING btree (id);

CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (id);

CREATE UNIQUE INDEX nutrition_plans_pkey ON public.nutrition_plans USING btree (id);

CREATE UNIQUE INDEX user_check_ins_pkey ON public.user_check_ins USING btree (id);

CREATE UNIQUE INDEX user_check_ins_user_id_date_key ON public.user_check_ins USING btree (user_id, date);

CREATE INDEX user_check_ins_user_id_idx ON public.user_check_ins USING btree (user_id);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

CREATE UNIQUE INDEX user_profiles_user_id_key ON public.user_profiles USING btree (user_id);

CREATE UNIQUE INDEX workout_logs_pkey ON public.workout_logs USING btree (id);

CREATE INDEX workout_logs_user_id_idx ON public.workout_logs USING btree (user_id);

CREATE UNIQUE INDEX workout_plans_pkey ON public.workout_plans USING btree (id);

alter table "public"."agent_memory" add constraint "agent_memory_pkey" PRIMARY KEY using index "agent_memory_pkey";

alter table "public"."analytics_events" add constraint "analytics_events_pkey" PRIMARY KEY using index "analytics_events_pkey";

alter table "public"."contraindications" add constraint "contraindications_pkey" PRIMARY KEY using index "contraindications_pkey";

alter table "public"."dietary_preferences" add constraint "dietary_preferences_pkey" PRIMARY KEY using index "dietary_preferences_pkey";

alter table "public"."exercises" add constraint "exercises_pkey" PRIMARY KEY using index "exercises_pkey";

alter table "public"."meal_logs" add constraint "meal_logs_pkey" PRIMARY KEY using index "meal_logs_pkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_pkey" PRIMARY KEY using index "notification_preferences_pkey";

alter table "public"."nutrition_plans" add constraint "nutrition_plans_pkey" PRIMARY KEY using index "nutrition_plans_pkey";

alter table "public"."user_check_ins" add constraint "user_check_ins_pkey" PRIMARY KEY using index "user_check_ins_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."workout_logs" add constraint "workout_logs_pkey" PRIMARY KEY using index "workout_logs_pkey";

alter table "public"."workout_plans" add constraint "workout_plans_pkey" PRIMARY KEY using index "workout_plans_pkey";

alter table "public"."agent_memory" add constraint "agent_memory_agent_type_check" CHECK ((agent_type = ANY (ARRAY['nutrition'::text, 'workout'::text, 'research'::text, 'adjustment'::text, 'system'::text, 'feedback'::text]))) not valid;

alter table "public"."agent_memory" validate constraint "agent_memory_agent_type_check";

alter table "public"."agent_memory" add constraint "agent_memory_consolidated_into_fkey" FOREIGN KEY (consolidated_into) REFERENCES agent_memory(id) not valid;

alter table "public"."agent_memory" validate constraint "agent_memory_consolidated_into_fkey";

alter table "public"."agent_memory" add constraint "agent_memory_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."agent_memory" validate constraint "agent_memory_user_id_fkey";

alter table "public"."agent_memory" add constraint "agent_memory_workout_log_id_fkey" FOREIGN KEY (workout_log_id) REFERENCES workout_logs(id) ON DELETE CASCADE not valid;

alter table "public"."agent_memory" validate constraint "agent_memory_workout_log_id_fkey";

alter table "public"."agent_memory" add constraint "agent_memory_workout_plan_id_fkey" FOREIGN KEY (workout_plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE not valid;

alter table "public"."agent_memory" validate constraint "agent_memory_workout_plan_id_fkey";

alter table "public"."agent_memory" add constraint "valid_embedding" CHECK (((embedding IS NULL) OR (vector_dims(embedding) = 1536))) not valid;

alter table "public"."agent_memory" validate constraint "valid_embedding";

alter table "public"."analytics_events" add constraint "analytics_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."analytics_events" validate constraint "analytics_events_user_id_fkey";

alter table "public"."contraindications" add constraint "contraindications_condition_key" UNIQUE using index "contraindications_condition_key";

alter table "public"."dietary_preferences" add constraint "dietary_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."dietary_preferences" validate constraint "dietary_preferences_user_id_fkey";

alter table "public"."exercises" add constraint "exercises_exercise_name_key" UNIQUE using index "exercises_exercise_name_key";

alter table "public"."meal_logs" add constraint "meal_logs_nutrition_plan_id_fkey" FOREIGN KEY (nutrition_plan_id) REFERENCES nutrition_plans(id) not valid;

alter table "public"."meal_logs" validate constraint "meal_logs_nutrition_plan_id_fkey";

alter table "public"."meal_logs" add constraint "meal_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."meal_logs" validate constraint "meal_logs_user_id_fkey";

alter table "public"."notification_preferences" add constraint "notification_preferences_quiet_hours_end_check" CHECK ((quiet_hours_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text)) not valid;

alter table "public"."notification_preferences" validate constraint "notification_preferences_quiet_hours_end_check";

alter table "public"."notification_preferences" add constraint "notification_preferences_quiet_hours_start_check" CHECK ((quiet_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text)) not valid;

alter table "public"."notification_preferences" validate constraint "notification_preferences_quiet_hours_start_check";

alter table "public"."notification_preferences" add constraint "notification_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."notification_preferences" validate constraint "notification_preferences_user_id_fkey";

alter table "public"."nutrition_plans" add constraint "nutrition_plans_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."nutrition_plans" validate constraint "nutrition_plans_user_id_fkey";

alter table "public"."user_check_ins" add constraint "user_check_ins_body_fat_percentage_check" CHECK (((body_fat_percentage >= (1)::numeric) AND (body_fat_percentage <= (50)::numeric))) not valid;

alter table "public"."user_check_ins" validate constraint "user_check_ins_body_fat_percentage_check";

alter table "public"."user_check_ins" add constraint "user_check_ins_energy_level_check" CHECK (((energy_level >= 1) AND (energy_level <= 10))) not valid;

alter table "public"."user_check_ins" validate constraint "user_check_ins_energy_level_check";

alter table "public"."user_check_ins" add constraint "user_check_ins_mood_check" CHECK ((mood = ANY (ARRAY['poor'::text, 'fair'::text, 'good'::text, 'excellent'::text]))) not valid;

alter table "public"."user_check_ins" validate constraint "user_check_ins_mood_check";

alter table "public"."user_check_ins" add constraint "user_check_ins_sleep_quality_check" CHECK ((sleep_quality = ANY (ARRAY['poor'::text, 'fair'::text, 'good'::text, 'excellent'::text]))) not valid;

alter table "public"."user_check_ins" validate constraint "user_check_ins_sleep_quality_check";

alter table "public"."user_check_ins" add constraint "user_check_ins_stress_level_check" CHECK (((stress_level >= 1) AND (stress_level <= 10))) not valid;

alter table "public"."user_check_ins" validate constraint "user_check_ins_stress_level_check";

alter table "public"."user_check_ins" add constraint "user_check_ins_user_id_date_key" UNIQUE using index "user_check_ins_user_id_date_key";

alter table "public"."user_check_ins" add constraint "user_check_ins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_check_ins" validate constraint "user_check_ins_user_id_fkey";

alter table "public"."user_check_ins" add constraint "user_check_ins_weight_check" CHECK ((weight > (0)::numeric)) not valid;

alter table "public"."user_check_ins" validate constraint "user_check_ins_weight_check";

alter table "public"."user_profiles" add constraint "medical_conditions_is_array" CHECK ((jsonb_typeof(medical_conditions) = 'array'::text)) not valid;

alter table "public"."user_profiles" validate constraint "medical_conditions_is_array";

alter table "public"."user_profiles" add constraint "user_profiles_age_check" CHECK (((age >= 13) AND (age <= 120))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_age_check";

alter table "public"."user_profiles" add constraint "user_profiles_experience_level_check" CHECK ((experience_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text]))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_experience_level_check";

alter table "public"."user_profiles" add constraint "user_profiles_height_check" CHECK ((height > (0)::numeric)) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_height_check";

alter table "public"."user_profiles" add constraint "user_profiles_unit_preference_check" CHECK ((unit_preference = ANY (ARRAY['metric'::text, 'imperial'::text]))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_unit_preference_check";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_user_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_key" UNIQUE using index "user_profiles_user_id_key";

alter table "public"."user_profiles" add constraint "user_profiles_weight_check" CHECK ((weight > (0)::numeric)) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_weight_check";

alter table "public"."workout_logs" add constraint "workout_logs_energy_level_check" CHECK (((energy_level >= 1) AND (energy_level <= 10))) not valid;

alter table "public"."workout_logs" validate constraint "workout_logs_energy_level_check";

alter table "public"."workout_logs" add constraint "workout_logs_overall_difficulty_check" CHECK (((overall_difficulty >= 1) AND (overall_difficulty <= 10))) not valid;

alter table "public"."workout_logs" validate constraint "workout_logs_overall_difficulty_check";

alter table "public"."workout_logs" add constraint "workout_logs_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL not valid;

alter table "public"."workout_logs" validate constraint "workout_logs_plan_id_fkey";

alter table "public"."workout_logs" add constraint "workout_logs_satisfaction_check" CHECK (((satisfaction >= 1) AND (satisfaction <= 10))) not valid;

alter table "public"."workout_logs" validate constraint "workout_logs_satisfaction_check";

alter table "public"."workout_logs" add constraint "workout_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."workout_logs" validate constraint "workout_logs_user_id_fkey";

alter table "public"."workout_plans" add constraint "workout_plans_difficulty_level_check" CHECK ((difficulty_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text]))) not valid;

alter table "public"."workout_plans" validate constraint "workout_plans_difficulty_level_check";

alter table "public"."workout_plans" add constraint "workout_plans_estimated_duration_check" CHECK ((estimated_duration > 0)) not valid;

alter table "public"."workout_plans" validate constraint "workout_plans_estimated_duration_check";

alter table "public"."workout_plans" add constraint "workout_plans_schedule_frequency_check" CHECK ((schedule_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'custom'::text]))) not valid;

alter table "public"."workout_plans" validate constraint "workout_plans_schedule_frequency_check";

alter table "public"."workout_plans" add constraint "workout_plans_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text]))) not valid;

alter table "public"."workout_plans" validate constraint "workout_plans_status_check";

alter table "public"."workout_plans" add constraint "workout_plans_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."workout_plans" validate constraint "workout_plans_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_if_extension_exists(extension_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
        BEGIN
          RETURN EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = extension_name
          );
        END;
        $function$
;

CREATE OR REPLACE FUNCTION public.filter_agent_memories(user_id_param uuid, metadata_filter jsonb DEFAULT '{}'::jsonb, agent_type_param text DEFAULT NULL::text, plan_id_param uuid DEFAULT NULL::uuid, log_id_param uuid DEFAULT NULL::uuid, include_archived boolean DEFAULT false, limit_param integer DEFAULT 10, offset_param integer DEFAULT 0, sort_by_param text DEFAULT 'created_at'::text, sort_direction_param text DEFAULT 'desc'::text)
 RETURNS SETOF agent_memory
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
        DECLARE
          query_text TEXT;
          sort_direction TEXT;
        BEGIN
          -- Validate sort direction
          IF lower(sort_direction_param) NOT IN ('asc', 'desc') THEN
            sort_direction := 'desc';
          ELSE
            sort_direction := lower(sort_direction_param);
          END IF;

          -- Build the base query
          query_text := 'SELECT * FROM public.agent_memory WHERE user_id = $1';

          -- Add agent type filter if provided
          IF agent_type_param IS NOT NULL THEN
            query_text := query_text || ' AND agent_type = $4';
          END IF;

          -- Add workout plan filter if provided
          IF plan_id_param IS NOT NULL THEN
            query_text := query_text || ' AND workout_plan_id = $5';
          END IF;

          -- Add workout log filter if provided
          IF log_id_param IS NOT NULL THEN
            query_text := query_text || ' AND workout_log_id = $6';
          END IF;

          -- Add archived filter
          IF NOT include_archived THEN
            query_text := query_text || ' AND is_archived = FALSE';
          END IF;

          -- Add metadata filters (using @> for JSONB containment)
          IF metadata_filter IS NOT NULL AND metadata_filter != '{}'::jsonb THEN
            query_text := query_text || ' AND metadata @> $2';
          END IF;

          -- Add sorting
          -- Validate sort_by_param against allowed columns to prevent SQL injection
          IF sort_by_param NOT IN ('created_at', 'updated_at', 'agent_type', 'id', 'version') THEN
              sort_by_param := 'created_at'; -- Default to created_at if invalid
          END IF;
          query_text := query_text || ' ORDER BY ' || quote_ident(sort_by_param) || ' ' || sort_direction;

          -- Add pagination
          query_text := query_text || ' LIMIT $3 OFFSET $7';

          -- Execute the query with correct parameters
          RETURN QUERY EXECUTE query_text USING
            user_id_param, 
            metadata_filter, 
            limit_param, 
            agent_type_param, 
            plan_id_param,
            log_id_param,
            offset_param;
        END;
        $function$
;

CREATE OR REPLACE FUNCTION public.increment_version_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
        DECLARE
            old_version integer;
        BEGIN
            old_version := COALESCE(OLD.version, 0);
            NEW.version := old_version + 1;
            RETURN NEW;
        END;
        $function$
;

CREATE OR REPLACE FUNCTION public.match_agent_memories(query_embedding vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10, filter_user_id uuid DEFAULT NULL::uuid, filter_plan_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, user_id uuid, agent_type text, content jsonb, metadata jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, workout_plan_id uuid, workout_log_id uuid, version integer, similarity double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
        BEGIN
          IF query_embedding IS NULL THEN
            RAISE EXCEPTION 'query_embedding cannot be NULL';
          END IF;
          
          RETURN QUERY
          SELECT
            am.id,
            am.user_id,
            am.agent_type,
            am.content, -- ensure this is selected
            am.metadata,
            am.created_at,
            am.updated_at,
            am.workout_plan_id,
            am.workout_log_id,
            am.version,
            1 - (am.embedding <=> query_embedding) AS similarity
          FROM
            public.agent_memory am
          WHERE
            am.embedding IS NOT NULL
            AND (filter_user_id IS NULL OR am.user_id = filter_user_id)
            AND (filter_plan_id IS NULL OR am.workout_plan_id = filter_plan_id)
            AND 1 - (am.embedding <=> query_embedding) > match_threshold
            AND am.is_archived = FALSE
          ORDER BY
            am.embedding <=> query_embedding
          LIMIT match_count;
        END;
        $function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $function$
;

grant delete on table "public"."agent_memory" to "anon";

grant insert on table "public"."agent_memory" to "anon";

grant references on table "public"."agent_memory" to "anon";

grant select on table "public"."agent_memory" to "anon";

grant trigger on table "public"."agent_memory" to "anon";

grant truncate on table "public"."agent_memory" to "anon";

grant update on table "public"."agent_memory" to "anon";

grant delete on table "public"."agent_memory" to "authenticated";

grant insert on table "public"."agent_memory" to "authenticated";

grant references on table "public"."agent_memory" to "authenticated";

grant select on table "public"."agent_memory" to "authenticated";

grant trigger on table "public"."agent_memory" to "authenticated";

grant truncate on table "public"."agent_memory" to "authenticated";

grant update on table "public"."agent_memory" to "authenticated";

grant delete on table "public"."agent_memory" to "service_role";

grant insert on table "public"."agent_memory" to "service_role";

grant references on table "public"."agent_memory" to "service_role";

grant select on table "public"."agent_memory" to "service_role";

grant trigger on table "public"."agent_memory" to "service_role";

grant truncate on table "public"."agent_memory" to "service_role";

grant update on table "public"."agent_memory" to "service_role";

grant delete on table "public"."analytics_events" to "anon";

grant insert on table "public"."analytics_events" to "anon";

grant references on table "public"."analytics_events" to "anon";

grant select on table "public"."analytics_events" to "anon";

grant trigger on table "public"."analytics_events" to "anon";

grant truncate on table "public"."analytics_events" to "anon";

grant update on table "public"."analytics_events" to "anon";

grant delete on table "public"."analytics_events" to "authenticated";

grant insert on table "public"."analytics_events" to "authenticated";

grant references on table "public"."analytics_events" to "authenticated";

grant select on table "public"."analytics_events" to "authenticated";

grant trigger on table "public"."analytics_events" to "authenticated";

grant truncate on table "public"."analytics_events" to "authenticated";

grant update on table "public"."analytics_events" to "authenticated";

grant delete on table "public"."analytics_events" to "service_role";

grant insert on table "public"."analytics_events" to "service_role";

grant references on table "public"."analytics_events" to "service_role";

grant select on table "public"."analytics_events" to "service_role";

grant trigger on table "public"."analytics_events" to "service_role";

grant truncate on table "public"."analytics_events" to "service_role";

grant update on table "public"."analytics_events" to "service_role";

grant delete on table "public"."contraindications" to "anon";

grant insert on table "public"."contraindications" to "anon";

grant references on table "public"."contraindications" to "anon";

grant select on table "public"."contraindications" to "anon";

grant trigger on table "public"."contraindications" to "anon";

grant truncate on table "public"."contraindications" to "anon";

grant update on table "public"."contraindications" to "anon";

grant delete on table "public"."contraindications" to "authenticated";

grant insert on table "public"."contraindications" to "authenticated";

grant references on table "public"."contraindications" to "authenticated";

grant select on table "public"."contraindications" to "authenticated";

grant trigger on table "public"."contraindications" to "authenticated";

grant truncate on table "public"."contraindications" to "authenticated";

grant update on table "public"."contraindications" to "authenticated";

grant delete on table "public"."contraindications" to "service_role";

grant insert on table "public"."contraindications" to "service_role";

grant references on table "public"."contraindications" to "service_role";

grant select on table "public"."contraindications" to "service_role";

grant trigger on table "public"."contraindications" to "service_role";

grant truncate on table "public"."contraindications" to "service_role";

grant update on table "public"."contraindications" to "service_role";

grant delete on table "public"."dietary_preferences" to "anon";

grant insert on table "public"."dietary_preferences" to "anon";

grant references on table "public"."dietary_preferences" to "anon";

grant select on table "public"."dietary_preferences" to "anon";

grant trigger on table "public"."dietary_preferences" to "anon";

grant truncate on table "public"."dietary_preferences" to "anon";

grant update on table "public"."dietary_preferences" to "anon";

grant delete on table "public"."dietary_preferences" to "authenticated";

grant insert on table "public"."dietary_preferences" to "authenticated";

grant references on table "public"."dietary_preferences" to "authenticated";

grant select on table "public"."dietary_preferences" to "authenticated";

grant trigger on table "public"."dietary_preferences" to "authenticated";

grant truncate on table "public"."dietary_preferences" to "authenticated";

grant update on table "public"."dietary_preferences" to "authenticated";

grant delete on table "public"."dietary_preferences" to "service_role";

grant insert on table "public"."dietary_preferences" to "service_role";

grant references on table "public"."dietary_preferences" to "service_role";

grant select on table "public"."dietary_preferences" to "service_role";

grant trigger on table "public"."dietary_preferences" to "service_role";

grant truncate on table "public"."dietary_preferences" to "service_role";

grant update on table "public"."dietary_preferences" to "service_role";

grant delete on table "public"."exercises" to "anon";

grant insert on table "public"."exercises" to "anon";

grant references on table "public"."exercises" to "anon";

grant select on table "public"."exercises" to "anon";

grant trigger on table "public"."exercises" to "anon";

grant truncate on table "public"."exercises" to "anon";

grant update on table "public"."exercises" to "anon";

grant delete on table "public"."exercises" to "authenticated";

grant insert on table "public"."exercises" to "authenticated";

grant references on table "public"."exercises" to "authenticated";

grant select on table "public"."exercises" to "authenticated";

grant trigger on table "public"."exercises" to "authenticated";

grant truncate on table "public"."exercises" to "authenticated";

grant update on table "public"."exercises" to "authenticated";

grant delete on table "public"."exercises" to "service_role";

grant insert on table "public"."exercises" to "service_role";

grant references on table "public"."exercises" to "service_role";

grant select on table "public"."exercises" to "service_role";

grant trigger on table "public"."exercises" to "service_role";

grant truncate on table "public"."exercises" to "service_role";

grant update on table "public"."exercises" to "service_role";

grant delete on table "public"."meal_logs" to "anon";

grant insert on table "public"."meal_logs" to "anon";

grant references on table "public"."meal_logs" to "anon";

grant select on table "public"."meal_logs" to "anon";

grant trigger on table "public"."meal_logs" to "anon";

grant truncate on table "public"."meal_logs" to "anon";

grant update on table "public"."meal_logs" to "anon";

grant delete on table "public"."meal_logs" to "authenticated";

grant insert on table "public"."meal_logs" to "authenticated";

grant references on table "public"."meal_logs" to "authenticated";

grant select on table "public"."meal_logs" to "authenticated";

grant trigger on table "public"."meal_logs" to "authenticated";

grant truncate on table "public"."meal_logs" to "authenticated";

grant update on table "public"."meal_logs" to "authenticated";

grant delete on table "public"."meal_logs" to "service_role";

grant insert on table "public"."meal_logs" to "service_role";

grant references on table "public"."meal_logs" to "service_role";

grant select on table "public"."meal_logs" to "service_role";

grant trigger on table "public"."meal_logs" to "service_role";

grant truncate on table "public"."meal_logs" to "service_role";

grant update on table "public"."meal_logs" to "service_role";

grant delete on table "public"."notification_preferences" to "anon";

grant insert on table "public"."notification_preferences" to "anon";

grant references on table "public"."notification_preferences" to "anon";

grant select on table "public"."notification_preferences" to "anon";

grant trigger on table "public"."notification_preferences" to "anon";

grant truncate on table "public"."notification_preferences" to "anon";

grant update on table "public"."notification_preferences" to "anon";

grant delete on table "public"."notification_preferences" to "authenticated";

grant insert on table "public"."notification_preferences" to "authenticated";

grant references on table "public"."notification_preferences" to "authenticated";

grant select on table "public"."notification_preferences" to "authenticated";

grant trigger on table "public"."notification_preferences" to "authenticated";

grant truncate on table "public"."notification_preferences" to "authenticated";

grant update on table "public"."notification_preferences" to "authenticated";

grant delete on table "public"."notification_preferences" to "service_role";

grant insert on table "public"."notification_preferences" to "service_role";

grant references on table "public"."notification_preferences" to "service_role";

grant select on table "public"."notification_preferences" to "service_role";

grant trigger on table "public"."notification_preferences" to "service_role";

grant truncate on table "public"."notification_preferences" to "service_role";

grant update on table "public"."notification_preferences" to "service_role";

grant delete on table "public"."nutrition_plans" to "anon";

grant insert on table "public"."nutrition_plans" to "anon";

grant references on table "public"."nutrition_plans" to "anon";

grant select on table "public"."nutrition_plans" to "anon";

grant trigger on table "public"."nutrition_plans" to "anon";

grant truncate on table "public"."nutrition_plans" to "anon";

grant update on table "public"."nutrition_plans" to "anon";

grant delete on table "public"."nutrition_plans" to "authenticated";

grant insert on table "public"."nutrition_plans" to "authenticated";

grant references on table "public"."nutrition_plans" to "authenticated";

grant select on table "public"."nutrition_plans" to "authenticated";

grant trigger on table "public"."nutrition_plans" to "authenticated";

grant truncate on table "public"."nutrition_plans" to "authenticated";

grant update on table "public"."nutrition_plans" to "authenticated";

grant delete on table "public"."nutrition_plans" to "service_role";

grant insert on table "public"."nutrition_plans" to "service_role";

grant references on table "public"."nutrition_plans" to "service_role";

grant select on table "public"."nutrition_plans" to "service_role";

grant trigger on table "public"."nutrition_plans" to "service_role";

grant truncate on table "public"."nutrition_plans" to "service_role";

grant update on table "public"."nutrition_plans" to "service_role";

grant delete on table "public"."user_check_ins" to "anon";

grant insert on table "public"."user_check_ins" to "anon";

grant references on table "public"."user_check_ins" to "anon";

grant select on table "public"."user_check_ins" to "anon";

grant trigger on table "public"."user_check_ins" to "anon";

grant truncate on table "public"."user_check_ins" to "anon";

grant update on table "public"."user_check_ins" to "anon";

grant delete on table "public"."user_check_ins" to "authenticated";

grant insert on table "public"."user_check_ins" to "authenticated";

grant references on table "public"."user_check_ins" to "authenticated";

grant select on table "public"."user_check_ins" to "authenticated";

grant trigger on table "public"."user_check_ins" to "authenticated";

grant truncate on table "public"."user_check_ins" to "authenticated";

grant update on table "public"."user_check_ins" to "authenticated";

grant delete on table "public"."user_check_ins" to "service_role";

grant insert on table "public"."user_check_ins" to "service_role";

grant references on table "public"."user_check_ins" to "service_role";

grant select on table "public"."user_check_ins" to "service_role";

grant trigger on table "public"."user_check_ins" to "service_role";

grant truncate on table "public"."user_check_ins" to "service_role";

grant update on table "public"."user_check_ins" to "service_role";

grant delete on table "public"."user_profiles" to "anon";

grant insert on table "public"."user_profiles" to "anon";

grant references on table "public"."user_profiles" to "anon";

grant select on table "public"."user_profiles" to "anon";

grant trigger on table "public"."user_profiles" to "anon";

grant truncate on table "public"."user_profiles" to "anon";

grant update on table "public"."user_profiles" to "anon";

grant delete on table "public"."user_profiles" to "authenticated";

grant insert on table "public"."user_profiles" to "authenticated";

grant references on table "public"."user_profiles" to "authenticated";

grant select on table "public"."user_profiles" to "authenticated";

grant trigger on table "public"."user_profiles" to "authenticated";

grant truncate on table "public"."user_profiles" to "authenticated";

grant update on table "public"."user_profiles" to "authenticated";

grant delete on table "public"."user_profiles" to "service_role";

grant insert on table "public"."user_profiles" to "service_role";

grant references on table "public"."user_profiles" to "service_role";

grant select on table "public"."user_profiles" to "service_role";

grant trigger on table "public"."user_profiles" to "service_role";

grant truncate on table "public"."user_profiles" to "service_role";

grant update on table "public"."user_profiles" to "service_role";

grant delete on table "public"."workout_logs" to "anon";

grant insert on table "public"."workout_logs" to "anon";

grant references on table "public"."workout_logs" to "anon";

grant select on table "public"."workout_logs" to "anon";

grant trigger on table "public"."workout_logs" to "anon";

grant truncate on table "public"."workout_logs" to "anon";

grant update on table "public"."workout_logs" to "anon";

grant delete on table "public"."workout_logs" to "authenticated";

grant insert on table "public"."workout_logs" to "authenticated";

grant references on table "public"."workout_logs" to "authenticated";

grant select on table "public"."workout_logs" to "authenticated";

grant trigger on table "public"."workout_logs" to "authenticated";

grant truncate on table "public"."workout_logs" to "authenticated";

grant update on table "public"."workout_logs" to "authenticated";

grant delete on table "public"."workout_logs" to "service_role";

grant insert on table "public"."workout_logs" to "service_role";

grant references on table "public"."workout_logs" to "service_role";

grant select on table "public"."workout_logs" to "service_role";

grant trigger on table "public"."workout_logs" to "service_role";

grant truncate on table "public"."workout_logs" to "service_role";

grant update on table "public"."workout_logs" to "service_role";

grant delete on table "public"."workout_plans" to "anon";

grant insert on table "public"."workout_plans" to "anon";

grant references on table "public"."workout_plans" to "anon";

grant select on table "public"."workout_plans" to "anon";

grant trigger on table "public"."workout_plans" to "anon";

grant truncate on table "public"."workout_plans" to "anon";

grant update on table "public"."workout_plans" to "anon";

grant delete on table "public"."workout_plans" to "authenticated";

grant insert on table "public"."workout_plans" to "authenticated";

grant references on table "public"."workout_plans" to "authenticated";

grant select on table "public"."workout_plans" to "authenticated";

grant trigger on table "public"."workout_plans" to "authenticated";

grant truncate on table "public"."workout_plans" to "authenticated";

grant update on table "public"."workout_plans" to "authenticated";

grant delete on table "public"."workout_plans" to "service_role";

grant insert on table "public"."workout_plans" to "service_role";

grant references on table "public"."workout_plans" to "service_role";

grant select on table "public"."workout_plans" to "service_role";

grant trigger on table "public"."workout_plans" to "service_role";

grant truncate on table "public"."workout_plans" to "service_role";

grant update on table "public"."workout_plans" to "service_role";

CREATE TRIGGER increment_agent_memory_version BEFORE UPDATE ON public.agent_memory FOR EACH ROW EXECUTE FUNCTION increment_version_on_update();

CREATE TRIGGER update_agent_memory_updated_at BEFORE UPDATE ON public.agent_memory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_events_updated_at BEFORE UPDATE ON public.analytics_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dietary_preferences_updated_at BEFORE UPDATE ON public.dietary_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_logs_updated_at BEFORE UPDATE ON public.meal_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_plans_updated_at BEFORE UPDATE ON public.nutrition_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_check_ins_updated_at BEFORE UPDATE ON public.user_check_ins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_logs_updated_at BEFORE UPDATE ON public.workout_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_plans_updated_at BEFORE UPDATE ON public.workout_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


