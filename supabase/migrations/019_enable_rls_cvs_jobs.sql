-- Enable RLS on cvs and jobs (application-layer auth existed; this adds DB-level protection)

ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their cvs"
  ON cvs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their jobs"
  ON jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
