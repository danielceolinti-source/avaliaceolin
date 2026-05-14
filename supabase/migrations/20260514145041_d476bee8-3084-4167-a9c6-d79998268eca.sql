
-- 1) Add 'vendedor' value to app_role enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'vendedor'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'vendedor';
  END IF;
END$$;
