
-- 2) Coluna de vínculo do usuário com vendedor (somente faz sentido para role 'vendedor')
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS vendedor_id uuid REFERENCES public.vendedores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_vendedor ON public.user_roles(vendedor_id);

-- 3) Função: nome do vendedor vinculado ao usuário (se for um usuário 'vendedor')
CREATE OR REPLACE FUNCTION public.get_user_vendor_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.nome
  FROM public.user_roles ur
  JOIN public.vendedores v ON v.id = ur.vendedor_id
  WHERE ur.user_id = _user_id
    AND ur.role = 'vendedor'::public.app_role
  LIMIT 1
$$;

-- 4) RLS avaliacoes: substituir SELECT para filtrar quando role = vendedor
DROP POLICY IF EXISTS "Avaliacoes viewable by authenticated" ON public.avaliacoes;

CREATE POLICY "Avaliacoes viewable by authenticated"
ON public.avaliacoes
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'vendedor'::public.app_role)
      THEN vendedor IS NOT NULL
           AND lower(trim(vendedor)) = lower(trim(coalesce(public.get_user_vendor_name(auth.uid()), '')))
    ELSE true
  END
);

-- 5) RLS status_history: vendedor só vê histórico das próprias avaliações
DROP POLICY IF EXISTS "Status history viewable by authenticated" ON public.status_history;

CREATE POLICY "Status history viewable by authenticated"
ON public.status_history
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'vendedor'::public.app_role)
      THEN EXISTS (
        SELECT 1 FROM public.avaliacoes a
        WHERE a.id = status_history.avaliacao_id
          AND a.vendedor IS NOT NULL
          AND lower(trim(a.vendedor)) = lower(trim(coalesce(public.get_user_vendor_name(auth.uid()), '')))
      )
    ELSE true
  END
);

-- 6) RLS avaliacao_fotos: vendedor só vê fotos das próprias avaliações
DROP POLICY IF EXISTS "Fotos viewable by authenticated" ON public.avaliacao_fotos;

CREATE POLICY "Fotos viewable by authenticated"
ON public.avaliacao_fotos
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN public.has_role(auth.uid(), 'vendedor'::public.app_role)
      THEN EXISTS (
        SELECT 1 FROM public.avaliacoes a
        WHERE a.id = avaliacao_fotos.avaliacao_id
          AND a.vendedor IS NOT NULL
          AND lower(trim(a.vendedor)) = lower(trim(coalesce(public.get_user_vendor_name(auth.uid()), '')))
      )
    ELSE true
  END
);

-- 7) Impedir que o próprio usuário altere sua role/vínculo (manter ALL para admins já existe).
--    A policy "Admins manage roles" já cobre isso (apenas super_admin/ti podem alterar user_roles).
