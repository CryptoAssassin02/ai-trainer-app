create table public.notification_preferences (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  email_enabled boolean null default false,
  sms_enabled boolean null default false,
  push_enabled boolean null default false,
  in_app_enabled boolean null default true,
  quiet_hours_start text null,
  quiet_hours_end text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint notification_preferences_pkey primary key (id),
  constraint notification_preferences_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint notification_preferences_quiet_hours_end_check check (
    (
      quiet_hours_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text
    )
  ),
  constraint notification_preferences_quiet_hours_start_check check (
    (
      quiet_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'::text
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_notification_preferences_user_id on public.notification_preferences using btree (user_id) TABLESPACE pg_default;

create trigger update_notification_preferences_updated_at BEFORE
update on notification_preferences for EACH row
execute FUNCTION public.update_updated_at_column ();