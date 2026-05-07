
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'ti', 'gestor', 'avaliador');
CREATE TYPE public.empresa AS ENUM ('Ceolin', 'Viva');
CREATE TYPE public.origem AS ENUM ('WhatsApp', 'Presencial');
CREATE TYPE public.status_avaliacao AS ENUM ('Em Avaliação', 'Finalizada', 'Comprado', 'Não Comprado', 'Cancelado');

-- ============= UPDATED_AT TRIGGER =============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'avaliador');
  RETURN NEW;
END;
$$;

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'ti', 'gestor'))
$$;

CREATE POLICY "Roles viewable by authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ti'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ti'));

-- Trigger after user_roles exists
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= AVALIACOES =============
CREATE SEQUENCE public.avaliacao_numero_seq START 1000;

CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero BIGINT NOT NULL UNIQUE DEFAULT nextval('public.avaliacao_numero_seq'),
  empresa empresa NOT NULL,
  placa TEXT NOT NULL,
  chassi TEXT,
  marca TEXT,
  modelo TEXT,
  versao TEXT,
  ano TEXT,
  km INTEGER,
  fipe NUMERIC(12,2),
  custo NUMERIC(12,2),
  avaliacao NUMERIC(12,2),
  vendedor TEXT,
  origem origem,
  status status_avaliacao NOT NULL DEFAULT 'Em Avaliação',
  estado_geral TEXT,
  nivel_avarias TEXT,
  historico JSONB DEFAULT '[]'::jsonb,
  opcionais JSONB DEFAULT '[]'::jsonb,
  avarias JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_avaliacoes_placa ON public.avaliacoes(placa);
CREATE INDEX idx_avaliacoes_empresa ON public.avaliacoes(empresa);
CREATE INDEX idx_avaliacoes_status ON public.avaliacoes(status);
CREATE INDEX idx_avaliacoes_created ON public.avaliacoes(created_at DESC);

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avaliacoes viewable by authenticated" ON public.avaliacoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create avaliacao" ON public.avaliacoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner or admin can update" ON public.avaliacoes
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete" ON public.avaliacoes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'ti')
      OR public.has_role(auth.uid(), 'gestor'));

CREATE TRIGGER trg_avaliacoes_updated BEFORE UPDATE ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= FOTOS =============
CREATE TABLE public.avaliacao_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  descricao TEXT,
  peca TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fotos_avaliacao ON public.avaliacao_fotos(avaliacao_id);
ALTER TABLE public.avaliacao_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fotos viewable by authenticated" ON public.avaliacao_fotos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can add fotos" ON public.avaliacao_fotos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner or admin manage fotos" ON public.avaliacao_fotos
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- ============= AUDIT LOG =============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin reads audit" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Authenticated insert audit" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============= STORAGE =============
INSERT INTO storage.buckets (id, name, public) VALUES ('avaliacao-fotos', 'avaliacao-fotos', false);

CREATE POLICY "Authenticated read fotos bucket" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avaliacao-fotos');
CREATE POLICY "Authenticated upload fotos bucket" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avaliacao-fotos');
CREATE POLICY "Owner delete fotos bucket" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'avaliacao-fotos' AND owner = auth.uid());
