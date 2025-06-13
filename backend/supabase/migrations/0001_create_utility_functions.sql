        -- The canonical update_updated_at_column function
        CREATE OR REPLACE FUNCTION public.update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Add other general utility functions here if any are found later
        -- (e.g., increment_version_on_update if it's generic enough, though it's often table-specific)

        CREATE OR REPLACE FUNCTION public.increment_version_on_update()
        RETURNS TRIGGER AS $$
        DECLARE
            old_version integer;
        BEGIN
            old_version := COALESCE(OLD.version, 0);
            NEW.version := old_version + 1;
            RETURN NEW;
        END;
        $$ language plpgsql;

        GRANT EXECUTE ON FUNCTION public.increment_version_on_update() TO authenticated, service_role;