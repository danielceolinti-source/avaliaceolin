
-- 1. Add 'Avaliado' to status_avaliacao enum if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'status_avaliacao' AND e.enumlabel = 'Avaliado'
  ) THEN
    ALTER TYPE public.status_avaliacao ADD VALUE 'Avaliado';
  END IF;
END $$;

-- 2. Add status_negociacao column to avaliacoes
ALTER TABLE public.avaliacoes
  ADD COLUMN IF NOT EXISTS status_negociacao text NOT NULL DEFAULT 'Sem definição';

-- 3. Create status_history table
CREATE TABLE IF NOT EXISTS public.status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  status_anterior text,
  status_novo text NOT NULL,
  alterado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_avaliacao ON public.status_history(avaliacao_id);

-- 4. RLS
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Status history viewable by authenticated" ON public.status_history;
CREATE POLICY "Status history viewable by authenticated"
  ON public.status_history FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert status history" ON public.status_history;
CREATE POLICY "Authenticated can insert status history"
  ON public.status_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = alterado_por);
