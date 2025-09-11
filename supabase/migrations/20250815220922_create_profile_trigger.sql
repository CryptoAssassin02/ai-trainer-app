-- Create trigger function to automatically create user profile on signup
-- This follows the official Supabase pattern for user profile management
-- See: https://supabase.com/docs/guides/auth/managing-user-data#using-triggers

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Insert new user profile with data from auth.users and raw_user_meta_data
  insert into public.user_profiles (
    user_id,
    name,
    unit_preference,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''),
    'metric',
    now(),
    now()
  );
  
  return new;
end;
$$;

-- Create trigger to execute function after user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant necessary permissions
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- Add comment for documentation
comment on function public.handle_new_user() is 'Automatically creates a user profile when a new user signs up via Supabase Auth';
-- Note: Cannot comment on auth.users trigger in local development due to permissions
