-- Fix RLS Policies and Triggers (Idempotent)

-- 1. Allow authenticated users to insert pings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pings' AND policyname = 'Users can create pings.'
    ) THEN
        CREATE POLICY "Users can create pings." ON public.pings FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- 2. Allow authenticated users to update their own pings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pings' AND policyname = 'Users can update their own pings.'
    ) THEN
        CREATE POLICY "Users can update their own pings." ON public.pings FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 3. Allow authenticated users to delete their own pings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'pings' AND policyname = 'Users can delete their own pings.'
    ) THEN
        CREATE POLICY "Users can delete their own pings." ON public.pings FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 4. Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    new.id,
    -- Fallback to email if username is not provided in raw_user_meta_data
    COALESCE(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    -- Fallback to username (or email-derived) if display_name is not provided
    COALESCE(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN new;
END;
$$;

-- 5. Trigger to call handle_new_user on auth.users insert
-- Drop if exists to avoid errors on multiple runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
