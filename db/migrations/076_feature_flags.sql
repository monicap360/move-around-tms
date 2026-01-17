-- Migration: Feature flags for controlled releases
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  enabled boolean DEFAULT false,
  description text,
  scope text DEFAULT 'global',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_feature_flags_key_scope
  ON public.feature_flags(key, scope);

INSERT INTO public.feature_flags (key, enabled, description, scope)
VALUES
  ('ronyx_finance', true, 'Ronyx Finance tab', 'global'),
  ('ronyx_fmcsa', true, 'Ronyx FMCSA tab', 'global')
ON CONFLICT (key, scope) DO NOTHING;
