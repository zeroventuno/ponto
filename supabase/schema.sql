-- Create daily records table
CREATE TABLE daily_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  work_date DATE NOT NULL,
  morning_enter TEXT, -- Format HH:mm
  morning_exit TEXT,
  afternoon_enter TEXT,
  afternoon_exit TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, work_date)
);

-- Enable RLS
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;

-- Policies for daily_records
CREATE POLICY "Users can manage their own daily records" 
  ON daily_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
