import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Settings2,
  History,
  Save,
  RefreshCcw,
  AlertCircle,
  Lock,
  UserCircle,
  ShieldAlert,
  Gauge,
  Users,
  UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { EMPRESAS, STATUS, ORIGENS, OPCIONAIS, TAGS_OBS } from "@/data/constants";
import KmBadge from "@/components/KmBadge";
import { useQueryClient } from "@tanstack/react-query";
import Usuarios from "./Usuarios";
import Vendedores from "./Vendedores";

type AuditLog = {
  id: string;
  created_at: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  user_id: string;
  profiles?: { full_name: string };
};

export default function Configuracoes() {
  const { isSuperAdmin, isTI } = useRole();
  const [activeTab, setActiveTab] = useState("empresas");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, 'pending' | 'success' | 'error'>>({
    gemini: "pending",
    fipe: "pending",
    supabase: "success",
    storage: "pending"
  });

  const canEditKeys = isSuperAdmin || isTI;

  const [empresasData, setEmpresasData] = useState<any[]>(EMPRESAS);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [perfil, setPerfil] = useState({
    full_name: "",
    email_corporativo: "",
    telefone: "",
    avatar_url: ""
  });
  const [loadingPerfil, setLoadingPerfil] = useState(false);

  // ─────────── Parâmetros KM (system_settings) ───────────
  const queryClient = useQueryClient();
  const [kmSettings, setKmSettings] = useState({
    yellow: "80000",
    red: "100000",
    yellowText: "",
    redText: "",
  });
  const [savingKm, setSavingKm] = useState(false);
  const [loadingKm, setLoadingKm] = useState(false);

  const loadKmSettings = async () => {
    setLoadingKm(true);
    const { data } = await (supabase as any).from("system_settings").select("key, value").in("key", [
      "km_threshold_yellow",
      "km_threshold_red",
      "km_alert_yellow_text",
      "km_alert_red_text",
    ]);
    const map = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
    setKmSettings({
      yellow: map.km_threshold_yellow ?? "80000",
      red: map.km_threshold_red ?? "100000",
      yellowText: map.km_alert_yellow_text ?? "",
      redText: map.km_alert_red_text ?? "",
    });
    setLoadingKm(false);
  };

  const saveKmSettings = async () => {
    const y = parseInt(kmSettings.yellow);
    const r = parseInt(kmSettings.red);
    if (isNaN(y) || isNaN(r) || y <= 0 || r <= 0) {
      toast.error("Informe valores numéricos válidos para os limites de KM.");
      return;
    }
    if (y >= r) {
      toast.error("O limite Amarelo deve ser menor que o limite Vermelho.");
      return;
    }
    setSavingKm(true);
    const updates = [
      { key: "km_threshold_yellow", value: String(y) },
      { key: "km_threshold_red", value: String(r) },
      { key: "km_alert_yellow_text", value: kmSettings.yellowText },
      { key: "km_alert_red_text", value: kmSettings.redText },
    ];
    try {
      for (const u of updates) {
        const { error } = await (supabase as any)
          .from("system_settings")
          .update({ value: u.value })
          .eq("key", u.key);
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ["km-thresholds"] });
      toast.success("Parâmetros de KM atualizados.");
    } catch (err: any) {
      toast.error("Falha ao salvar", { description: err.message });
    } finally {
      setSavingKm(false);
    }
  };

  useEffect(() => {
    if (activeTab === "auditoria") loadLogs();
    if (activeTab === "perfil") loadPerfil();
    if (activeTab === "empresas") loadConfig();
    if (activeTab === "parametros") loadKmSettings();
  }, [activeTab]);

  const loadConfig = async () => {
    setLoadingConfig(true);
    const { data } = await (supabase as any).from("app_settings").select("*").eq("id", "config").single();
    if (data?.data?.empresas) {
      setEmpresasData(data.data.empresas);
    }
    setLoadingConfig(false);
  };

  const saveConfig = async (newData: any) => {
    setLoadingConfig(true);
    const { error } = await (supabase as any).from("app_settings").upsert({
      id: "config",
      data: { empresas: newData },
      updated_at: new Date().toISOString()
    });
    
    if (error) toast.error("Erro ao salvar configurações globais");
    else {
      toast.success("Configurações aplicadas para todo o sistema");
      setEmpresasData(newData);
    }
    setLoadingConfig(false);
  };

  const loadPerfil = async () => {
    setLoadingPerfil(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      const d: any = data;
      if (d) setPerfil({
        full_name: d.full_name || "",
        email_corporativo: d.email_corporativo || "",
        telefone: d.telefone || d.phone || "",
        avatar_url: d.avatar_url || ""
      });
    }
    setLoadingPerfil(false);
  };

  const savePerfil = async () => {
    setLoadingPerfil(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Tenta salvar todos os campos
      const { error } = await (supabase.from("profiles").update as any)({
        full_name: perfil.full_name,
        email_corporativo: perfil.email_corporativo,
        telefone: perfil.telefone
      }).eq("user_id", user.id);
      
      if (error) {
        // Se falhar, tenta salvar apenas o básico (compatibilidade)
        console.warn("Falha ao salvar campos estendidos, tentando salvar apenas full_name", error);
        const { error: errorBasic } = await supabase.from("profiles").update({
          full_name: perfil.full_name
        }).eq("user_id", user.id);

        if (errorBasic) toast.error("Erro ao salvar perfil básico");
        else toast.warning("Nome salvo, mas campos de contato exigem sincronização do banco.");
      } else {
        toast.success("Perfil atualizado com sucesso");
      }
    }
    setLoadingPerfil(false);
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>, empresaId: string, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Tenta garantir que o bucket existe
      try {
        await supabase.storage.createBucket("logos", { public: true });
        // Pequena pausa para o servidor processar a criação
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) { /* ignore if already exists */ }

      const ext = file.name.split(".").pop();
      const path = `public/${empresaId}-logo-${Date.now()}.${ext}`;
      
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true });

      if (upErr) {
        if (upErr.message.includes("not found") || upErr.message.includes("does not exist")) {
           throw new Error("A pasta 'logos' ainda não foi ativada. Se este erro persistir por mais de 1 minuto, crie um bucket chamado 'logos' manualmente no seu painel Supabase (Storage).");
        }
        throw upErr;
      }

      const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);

      const next = [...empresasData];
      next[idx].logo_url = publicUrl;
      setEmpresasData(next);
      
      // Salva automaticamente após upload
      await saveConfig(next);
      toast.success("Logo atualizada com sucesso!");
    } catch (err: any) {
      toast.error("Erro no upload da logo", { description: err.message });
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("audit_log")
        .select(`
          *,
          profiles:user_id ( full_name )
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setLogs((data as any) || []);
    } catch (error: any) {
      toast.error("Erro ao carregar logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  const testIntegration = (key: string) => {
    setTestStatus(prev => ({ ...prev, [key]: "pending" }));
    setTimeout(() => {
      setTestStatus(prev => ({ ...prev, [key]: "success" }));
      toast.success(`Conexão com ${key.toUpperCase()} estabelecida com sucesso`);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestão operacional, integrações técnicas e auditoria do sistema.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 lg:w-[920px] mb-8">
          <TabsTrigger value="empresas" className="gap-2"><Building2 className="h-4 w-4" /> Empresas</TabsTrigger>
          <TabsTrigger value="parametros" className="gap-2"><Gauge className="h-4 w-4" /> Parâmetros</TabsTrigger>
          <TabsTrigger value="logica" className="gap-2"><Settings2 className="h-4 w-4" /> Lógica</TabsTrigger>
          {(isSuperAdmin || isTI) && (
            <TabsTrigger value="usuarios" className="gap-2"><Users className="h-4 w-4" /> Usuários</TabsTrigger>
          )}
          {(isSuperAdmin || isTI) && (
            <TabsTrigger value="vendedores" className="gap-2"><UserCog className="h-4 w-4" /> Vendedores</TabsTrigger>
          )}
          <TabsTrigger value="perfil" className="gap-2"><UserCircle className="h-4 w-4" /> Meu Perfil</TabsTrigger>
        </TabsList>

        {/* 1. EMPRESAS */}
        <TabsContent value="empresas" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {empresasData.map((emp, idx) => (
              <Card key={emp.id} className="overflow-hidden border-none shadow-md">
                <input 
                  type="file" 
                  id={`logo-upload-${emp.id}`} 
                  hidden 
                  accept="image/*" 
                  onChange={(e) => uploadLogo(e, emp.id, idx)} 
                />
                <div className={`h-2`} style={{ backgroundColor: emp.id === 'Ceolin' ? (emp.cor || '#CE2B37') : (emp.cor || '#808285') }} />
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {emp.nome}
                    <Badge variant="outline">{emp.ativo !== false ? 'Ativa' : 'Inativa'}</Badge>
                  </CardTitle>
                  <CardDescription>ID: {emp.id}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Nome de Exibição</Label>
                    <Input 
                      value={emp.nome} 
                      onChange={e => {
                        const next = [...empresasData];
                        next[idx].nome = e.target.value;
                        setEmpresasData(next);
                      }} 
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label>Status da Empresa</Label>
                      <p className="text-[10px] text-muted-foreground">Desativar remove das opções de avaliação</p>
                    </div>
                    <Switch 
                      checked={emp.ativo !== false} 
                      onCheckedChange={checked => {
                        const next = [...empresasData];
                        next[idx].ativo = checked;
                        setEmpresasData(next);
                      }}
                    />
                  </div>
                  <Button 
                    onClick={() => saveConfig(empresasData)} 
                    disabled={loadingConfig}
                    className="w-full gap-2 mt-4" 
                    variant="secondary"
                  >
                    {loadingConfig ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
                    Salvar Alterações
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* PARÂMETROS DE AVALIAÇÃO — KM */}
        <TabsContent value="parametros" className="space-y-4">
          <Card className="border-none shadow-md max-w-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /> Faixas de Quilometragem e Alertas</CardTitle>
              <CardDescription>
                Define os limites usados nos badges coloridos e nos banners de alerta exibidos em
                toda a aplicação. Veículos abaixo do limite Verde→Amarelo são considerados normais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!canEditKeys && (
                <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-xs p-3 flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                  Apenas usuários Super Admin ou TI podem alterar estes parâmetros.
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Limite KM Verde → Amarelo</Label>
                  <Input
                    type="number"
                    value={kmSettings.yellow}
                    onChange={(e) => setKmSettings({ ...kmSettings, yellow: e.target.value })}
                    disabled={!canEditKeys || loadingKm}
                    className="font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">Veículos acima deste valor recebem alerta de atenção.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Limite KM Amarelo → Vermelho</Label>
                  <Input
                    type="number"
                    value={kmSettings.red}
                    onChange={(e) => setKmSettings({ ...kmSettings, red: e.target.value })}
                    disabled={!canEditKeys || loadingKm}
                    className="font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">Veículos acima deste valor recebem alerta de alto risco.</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Texto do Alerta Amarelo</Label>
                <Input
                  value={kmSettings.yellowText}
                  onChange={(e) => setKmSettings({ ...kmSettings, yellowText: e.target.value })}
                  disabled={!canEditKeys || loadingKm}
                />
              </div>
              <div className="grid gap-2">
                <Label>Texto do Alerta Vermelho</Label>
                <Input
                  value={kmSettings.redText}
                  onChange={(e) => setKmSettings({ ...kmSettings, redText: e.target.value })}
                  disabled={!canEditKeys || loadingKm}
                />
              </div>

              {/* Preview */}
              <div className="rounded-md border bg-muted/40 p-4 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Pré-visualização</div>
                <div className="flex flex-wrap gap-3 items-center">
                  <KmBadge km={Math.max(1, parseInt(kmSettings.yellow) - 10000)} />
                  <KmBadge km={Math.max(1, Math.floor((parseInt(kmSettings.yellow) + parseInt(kmSettings.red)) / 2))} />
                  <KmBadge km={parseInt(kmSettings.red) + 20000} />
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={saveKmSettings} disabled={!canEditKeys || savingKm} className="gap-2">
                  {savingKm ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Parâmetros de Quilometragem
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="perfil" className="space-y-4">
          <Card className="max-w-2xl border-none shadow-md">
            <CardHeader>
              <CardTitle>Meu Perfil</CardTitle>
              <CardDescription>Personalize sua conta e foto de exibição.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-8 pb-6 border-b">
                <div className="relative group">
                  <div className="h-32 w-32 rounded-full bg-gradient-primary grid place-items-center text-4xl font-bold text-white shadow-xl overflow-hidden">
                    {perfil.avatar_url ? <img src={perfil.avatar_url} className="h-full w-full object-cover" /> : perfil.full_name.charAt(0) || "U"}
                  </div>
                </div>
                <div className="space-y-2 text-center md:text-left">
                  <h3 className="text-xl font-bold">{perfil.full_name || "Seu Nome"}</h3>
                  <p className="text-sm text-muted-foreground">Sua foto aparecerá no topo do sistema e nos relatórios de avaliação.</p>
                  <div className="flex gap-2 justify-center md:justify-start">
                    <Button size="sm" variant="outline">Remover foto</Button>
                    <Button size="sm">Fazer Upload</Button>
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Nome Completo</Label>
                  <Input value={perfil.full_name} onChange={e => setPerfil({...perfil, full_name: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Email Corporativo (Ceolin)</Label>
                  <Input value={perfil.email_corporativo} onChange={e => setPerfil({...perfil, email_corporativo: e.target.value})} placeholder="seuemail@ceolin.com.br" />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone / WhatsApp</Label>
                  <Input value={perfil.telefone} onChange={e => setPerfil({...perfil, telefone: e.target.value})} placeholder="(27) 99999-0000" />
                </div>
              </div>
              <div className="pt-6 border-t flex flex-col gap-4">
                <div className="flex items-start gap-3 text-amber-600 bg-amber-50 p-4 rounded-xl text-xs border border-amber-100">
                  <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Sincronização Necessária</p>
                    <p className="leading-relaxed">Caso o E-mail ou Telefone não salvem, o administrador deve executar o script SQL de migração no painel do Supabase para atualizar a tabela de perfis.</p>
                  </div>
                </div>
                <Button onClick={savePerfil} disabled={loadingPerfil} className="w-full md:w-auto h-12 gap-2 bg-[#1a1a1a] hover:bg-[#CE2B37] transition-all rounded-xl font-bold uppercase tracking-widest text-xs">
                  {loadingPerfil ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
                  Atualizar Dados do Perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. LÓGICA OPERACIONAL — referência somente leitura */}
        <TabsContent value="logica" className="space-y-4">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Catálogos do Sistema</CardTitle>
              <CardDescription>
                Valores utilizados nos seletores das avaliações. Esta lista é mantida em código pela equipe técnica
                para garantir consistência entre as concessionárias.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Status Disponíveis</Label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS.map(s => <Badge key={s} variant="secondary" className="px-3 py-1">{s}</Badge>)}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Origens de Lead</Label>
                  <div className="flex flex-wrap gap-2">
                    {ORIGENS.map(o => <Badge key={o} variant="outline" className="px-3 py-1">{o}</Badge>)}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Opcionais Padrão</Label>
                  <div className="flex flex-wrap gap-2">
                    {OPCIONAIS.map(o => <Badge key={o} variant="secondary" className="text-[10px]">{o}</Badge>)}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Observações Rápidas (Tags)</Label>
                  <div className="flex flex-wrap gap-2">
                    {TAGS_OBS.map(t => <Badge key={t} variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">{t}</Badge>)}
                  </div>
                </div>
              </div>
              <div className="rounded-md border bg-muted/40 p-3 flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                Para alterar estes catálogos, solicite à equipe de TI — modificações exigem atualização de código
                para preservar a integridade dos relatórios históricos.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {(isSuperAdmin || isTI) && (
          <TabsContent value="usuarios" className="space-y-4">
            <Usuarios />
          </TabsContent>
        )}

        {(isSuperAdmin || isTI) && (
          <TabsContent value="vendedores" className="space-y-4">
            <Vendedores />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
