
-- ============================================================
-- FASE 5 — Módulo de Avarias
-- Tabela de avarias por avaliação + fotos específicas por avaria
-- ============================================================

CREATE TABLE IF NOT EXISTS public.avaliacao_avarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  peca TEXT NOT NULL,
  tipo TEXT NOT NULL,
  severidade TEXT NOT NULL DEFAULT 'Leve',
  descricao TEXT,
  custo_estimado NUMERIC(10,2),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_avarias_avaliacao ON public.avaliacao_avarias(avaliacao_id);

ALTER TABLE public.avaliacao_avarias ENABLE ROW LEVEL SECURITY;

-- SELECT: mesma regra das fotos (vendedor só vê das próprias)
CREATE POLICY "Avarias viewable by authenticated"
ON public.avaliacao_avarias
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'vendedor'::public.app_role)
      THEN EXISTS (
        SELECT 1 FROM public.avaliacoes a
        WHERE a.id = avaliacao_avarias.avaliacao_id
          AND a.vendedor IS NOT NULL
          AND lower(trim(a.vendedor)) = lower(trim(coalesce(public.get_user_vendor_name(auth.uid()), '')))
      )
    ELSE true
  END
);

CREATE POLICY "Authenticated can add avarias"
ON public.avaliacao_avarias
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner or admin manage avarias"
ON public.avaliacao_avarias
FOR ALL
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'ti'::public.app_role)
  OR public.has_role(auth.uid(), 'gestor'::public.app_role)
)
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'ti'::public.app_role)
  OR public.has_role(auth.uid(), 'gestor'::public.app_role)
);

CREATE TRIGGER update_avaliacao_avarias_updated_at
BEFORE UPDATE ON public.avaliacao_avarias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Fotos das avarias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.avaliacao_avaria_fotos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avaria_id UUID NOT NULL REFERENCES public.avaliacao_avarias(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  descricao TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_avaria_fotos_avaria ON public.avaliacao_avaria_fotos(avaria_id);

ALTER TABLE public.avaliacao_avaria_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avaria fotos viewable by authenticated"
ON public.avaliacao_avaria_fotos
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'vendedor'::public.app_role)
      THEN EXISTS (
        SELECT 1
        FROM public.avaliacao_avarias av
        JOIN public.avaliacoes a ON a.id = av.avaliacao_id
        WHERE av.id = avaliacao_avaria_fotos.avaria_id
          AND a.vendedor IS NOT NULL
          AND lower(trim(a.vendedor)) = lower(trim(coalesce(public.get_user_vendor_name(auth.uid()), '')))
      )
    ELSE true
  END
);

CREATE POLICY "Authenticated can add avaria fotos"
ON public.avaliacao_avaria_fotos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner or admin manage avaria fotos"
ON public.avaliacao_avaria_fotos
FOR ALL
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'ti'::public.app_role)
  OR public.has_role(auth.uid(), 'gestor'::public.app_role)
)
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'ti'::public.app_role)
  OR public.has_role(auth.uid(), 'gestor'::public.app_role)
);
