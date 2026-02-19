-- FUNZIONE HELPER PER SICUREZZA (Evita recursione RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILI UTENTE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
  CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
  
  DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
  CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());
END $$;

-- REGISTRI GIORNALIERI
CREATE TABLE IF NOT EXISTS daily_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  work_date DATE NOT NULL,
  morning_enter TEXT,
  morning_exit TEXT,
  afternoon_enter TEXT,
  afternoon_exit TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, work_date)
);

ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own daily records" ON daily_records;
  CREATE POLICY "Users can manage their own daily records" 
    ON daily_records FOR ALL 
    USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Admins can view all daily records" ON daily_records;
  CREATE POLICY "Admins can view all daily records" 
    ON daily_records FOR SELECT 
    USING (is_admin());
END $$;

-- CHIUSURE MENSILI
CREATE TABLE IF NOT EXISTS monthly_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_year TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month_year)
);

ALTER TABLE monthly_closures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own closures" ON monthly_closures;
  CREATE POLICY "Users can manage their own closures" 
    ON monthly_closures FOR ALL 
    USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Admins can view all closures" ON monthly_closures;
  CREATE POLICY "Admins can view all closures" 
    ON monthly_closures FOR SELECT 
    USING (is_admin());
END $$;

-- TRIGGER PER NUOVI UTENTI
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;
