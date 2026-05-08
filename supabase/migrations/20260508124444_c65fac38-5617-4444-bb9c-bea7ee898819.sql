
-- Vendedores
CREATE TABLE IF NOT EXISTS public.vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  empresa TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores viewable by authenticated"
  ON public.vendedores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestores podem criar vendedores"
  ON public.vendedores FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Gestores podem atualizar vendedores"
  ON public.vendedores FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "TI/SuperAdmin podem excluir vendedores"
  ON public.vendedores FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ti'));

CREATE TRIGGER vendedores_set_updated
  BEFORE UPDATE ON public.vendedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed inicial dos vendedores conhecidos
INSERT INTO public.vendedores (nome, empresa) VALUES
  ('Leonardo','Ceolin'),('Carminha','Ceolin'),('Lucas','Ceolin'),
  ('Iure','Ceolin'),('Fabiana','Ceolin'),('André','Ceolin'),('Adelmo','Ceolin'),
  ('Fernanda','Viva'),('Natiele','Viva'),('Iury','Viva'),
  ('Luiz Henrique','Viva'),('Adinoel','Viva'),('João Vitor','Viva'),('Luiz','Viva')
ON CONFLICT DO NOTHING;

-- Atualiza handle_new_user para conceder super_admin a "Daniel Andrade"
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _name TEXT;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, _name);
  IF lower(unaccent(coalesce(_name,''))) = 'daniel andrade' OR
     lower(coalesce(_name,'')) LIKE '%daniel%andrade%' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
      ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'avaliador');
  END IF;
  RETURN NEW;
END;
$$;

-- Garantir trigger ligado ao auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Concede super_admin retroativo a Daniel Andrade já cadastrado
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'super_admin'::app_role FROM public.profiles
WHERE lower(coalesce(full_name,'')) LIKE '%daniel%andrade%'
ON CONFLICT DO NOTHING;
