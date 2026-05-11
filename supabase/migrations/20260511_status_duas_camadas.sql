-- ═══════════════════════════════════════════════════════
-- MIGRAÇÃO: Sistema de Status em Duas Camadas
-- ═══════════════════════════════════════════════════════

-- 1. Adicionar 'Avaliado' ao enum existente
DO $$ BEGIN
  ALTER TYPE public.status_avaliacao ADD VALUE IF NOT EXISTS 'Avaliado';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Nova coluna para Camada 2 (negociação) — TEXT para flexibilidade
ALTER TABLE public.avaliacoes 
  ADD COLUMN IF NOT EXISTS status_negociacao TEXT DEFAULT 'Sem definição';

-- 3. Índice para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_avaliacoes_negociacao 
  ON public.avaliacoes(status_negociacao);

-- 4. Migrar dados existentes do status antigo
-- Finalizada → Avaliado (camada 1)
UPDATE public.avaliacoes 
  SET status = 'Avaliado' 
  WHERE status = 'Finalizada';

-- Comprado/Não Comprado/Cancelado → mover para camada 2
UPDATE public.avaliacoes 
  SET status_negociacao = 'Comprado', status = 'Avaliado'
  WHERE status = 'Comprado';

UPDATE public.avaliacoes 
  SET status_negociacao = 'Não comprado', status = 'Avaliado'
  WHERE status = 'Não Comprado';

UPDATE public.avaliacoes 
  SET status_negociacao = 'Arquivado', status = 'Avaliado'
  WHERE status = 'Cancelado';

-- 5. Tabela de histórico de mudanças de status
CREATE TABLE IF NOT EXISTS public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_avaliacao 
  ON public.status_history(avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created 
  ON public.status_history(created_at DESC);

ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Status history viewable by authenticated" 
  ON public.status_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Status history insertable by authenticated" 
  ON public.status_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
