
ALTER TABLE public.avaliacoes
  ADD COLUMN IF NOT EXISTS cliente text,
  ADD COLUMN IF NOT EXISTS modalidade text,
  ADD COLUMN IF NOT EXISTS data_avaliacao date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS tags_obs jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_data ON public.avaliacoes(data_avaliacao);
