-- Tabela de configurações globais do sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text        UNIQUE NOT NULL,
  value       text        NOT NULL,
  label       text,
  description text,
  category    text,
  value_type  text        DEFAULT 'string',
  updated_by  uuid,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado
DROP POLICY IF EXISTS "system_settings_select_authenticated" ON public.system_settings;
CREATE POLICY "system_settings_select_authenticated"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Escrita: apenas super_admin ou TI (usa a função has_role já existente)
DROP POLICY IF EXISTS "system_settings_insert_admin" ON public.system_settings;
CREATE POLICY "system_settings_insert_admin"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ti'::public.app_role)
  );

DROP POLICY IF EXISTS "system_settings_update_admin" ON public.system_settings;
CREATE POLICY "system_settings_update_admin"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ti'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ti'::public.app_role)
  );

DROP POLICY IF EXISTS "system_settings_delete_admin" ON public.system_settings;
CREATE POLICY "system_settings_delete_admin"
  ON public.system_settings
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'ti'::public.app_role)
  );

-- Trigger de updated_at (reutiliza função existente)
DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Valores padrão: faixas de quilometragem
INSERT INTO public.system_settings (key, value, label, description, category, value_type) VALUES
  ('km_threshold_yellow', '80000',
   'Limite KM Verde → Amarelo',
   'Veículos com KM acima deste valor recebem alerta amarelo (atenção)',
   'quilometragem', 'number'),
  ('km_threshold_red', '100000',
   'Limite KM Amarelo → Vermelho',
   'Veículos com KM acima deste valor recebem alerta vermelho (alto risco)',
   'quilometragem', 'number'),
  ('km_alert_yellow_text',
   '⚠️ Atenção: veículo com quilometragem elevada. Verifique o estado de conservação.',
   'Texto do Alerta Amarelo',
   'Mensagem exibida quando o veículo ultrapassa o limite amarelo de KM',
   'quilometragem', 'string'),
  ('km_alert_red_text',
   '🔴 Alto Risco: quilometragem muito alta. Avalie com critério rigoroso e considere deságio máximo.',
   'Texto do Alerta Vermelho',
   'Mensagem exibida quando o veículo ultrapassa o limite vermelho de KM',
   'quilometragem', 'string'),
  ('permission_view_commercial_intelligence',
   'super_admin,ti,gestor',
   'Acesso à Central de Inteligência',
   'Lista de funções (separadas por vírgula) que têm acesso à Central de Inteligência Comercial',
   'permissoes', 'string')
ON CONFLICT (key) DO NOTHING;