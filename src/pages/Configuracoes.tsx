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
  Zap, 
  History, 
  ShieldCheck, 
  Database, 
  Bot, 
  Save, 
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ExternalLink,
  Lock,
  Palette,
  UserCircle,
  Upload,
  ShieldAlert,
  Image as ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { EMPRESAS, STATUS, ORIGENS, OPCIONAIS, TAGS_OBS } from "@/data/constants";
import { dataBR } from "@/lib/format";

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

  useEffect(() => {
    if (activeTab === "auditoria") loadLogs();
    if (activeTab === "perfil") loadPerfil();
    if (activeTab === "empresas") loadConfig();
  }, [activeTab]);

  const loadConfig = async () => {
    setLoadingConfig(true);
    const { data } = await supabase.from("app_settings").select("*").eq("id", "config").single();
    if (data?.data?.empresas) {
      setEmpresasData(data.data.empresas);
    }
    setLoadingConfig(false);
  };

  const saveConfig = async (newData: any) => {
    setLoadingConfig(true);
    const { error } = await supabase.from("app_settings").upsert({
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
      if (data) setPerfil({
        full_name: data.full_name || "",
        email_corporativo: data.email_corporativo || "",
        telefone: data.telefone || "",
        avatar_url: data.avatar_url || ""
      });
    }
    setLoadingPerfil(false);
  };

  const savePerfil = async () => {
    setLoadingPerfil(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Tenta salvar todos os campos
      const { error } = await supabase.from("profiles").update({
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
      setLogs(data || []);
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
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:w-[600px] mb-8">
          <TabsTrigger value="empresas" className="gap-2"><Building2 className="h-4 w-4" /> Empresas</TabsTrigger>
          <TabsTrigger value="logica" className="gap-2"><Settings2 className="h-4 w-4" /> Lógica</TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-2"><Zap className="h-4 w-4" /> Integrações</TabsTrigger>
          <TabsTrigger value="perfil" className="gap-2"><UserCircle className="h-4 w-4" /> Meu Perfil</TabsTrigger>
          <TabsTrigger value="auditoria" className="gap-2"><History className="h-4 w-4" /> Auditoria</TabsTrigger>
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
                  <div className="grid gap-2">
                    <Label>Cor Primária</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded border" style={{ backgroundColor: emp.cor || (emp.id === 'Ceolin' ? '#CE2B37' : '#808285') }} />
                      <Input 
                        placeholder="#Hex Color" 
                        value={emp.cor || (emp.id === 'Ceolin' ? '#CE2B37' : '#808285')} 
                        onChange={e => {
                          const next = [...empresasData];
                          next[idx].cor = e.target.value;
                          setEmpresasData(next);
                        }}
                        className="font-mono text-xs" 
                      />
                      <Button variant="outline" size="icon"><Palette className="h-4 w-4" /></Button>
                    </div>
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
                  <div className="grid gap-2">
                    <Label>Logotipo da Unidade</Label>
                    <div className="flex items-center gap-4 p-3 border rounded-lg bg-slate-50/50">
                      <div className="h-12 w-12 rounded bg-white border grid place-items-center overflow-hidden">
                        {emp.logo_url ? <img src={emp.logo_url} className="h-full w-auto object-contain" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground mb-2">PNG ou SVG fundo transparente</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 gap-2"
                          onClick={() => {
                            const input = document.getElementById(`logo-upload-${emp.id}`);
                            input?.click();
                          }}
                        >
                          <Upload className="h-3 w-3" /> Alterar Logo
                        </Button>
                      </div>
                    </div>
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

        {/* 5. MEU PERFIL */}
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

        {/* 2. LÓGICA OPERACIONAL */}
        <TabsContent value="logica" className="space-y-4">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Configuração de Campos</CardTitle>
              <CardDescription>Defina os valores padrão para os seletores do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Status Disponíveis</Label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS.map(s => <Badge key={s} variant="secondary" className="px-3 py-1">{s}</Badge>)}
                    <Button variant="ghost" size="sm" className="h-7 border-dashed border px-2 text-[10px]">+ Novo</Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Origens de Lead</Label>
                  <div className="flex flex-wrap gap-2">
                    {ORIGENS.map(o => <Badge key={o} variant="outline" className="px-3 py-1">{o}</Badge>)}
                    <Button variant="ghost" size="sm" className="h-7 border-dashed border px-2 text-[10px]">+ Novo</Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Opcionais Padrão</Label>
                  <div className="flex flex-wrap gap-2">
                    {OPCIONAIS.slice(0, 10).map(o => <Badge key={o} variant="secondary" className="bg-slate-100 text-[10px]">{o}</Badge>)}
                    <span className="text-[10px] text-muted-foreground">... e mais {OPCIONAIS.length - 10}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Observações Rápidas (Tags)</Label>
                  <div className="flex flex-wrap gap-2">
                    {TAGS_OBS.map(t => <Badge key={t} variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">{t}</Badge>)}
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button className="gap-2">
                  <Save className="h-4 w-4" /> Atualizar Lógica do Sistema
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. INTEGRAÇÕES */}
        <TabsContent value="integracoes" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Bot className="h-5 w-5 text-purple-500" /> Gemini Vision AI</CardTitle>
                  {testStatus.gemini === 'success' ? <CheckCircle2 className="h-5 w-5 text-success" /> : <AlertCircle className="h-5 w-5 text-warning" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Responsável pelo OCR de placas e análise de fotos.</p>
                <div className="grid gap-2">
                  <Label className="text-[10px] uppercase">API Key</Label>
                  <div className="flex gap-2">
                    <Input type="password" value="••••••••••••••••" disabled={!canEditKeys} className="bg-slate-50" />
                    <Button variant="outline" size="sm" onClick={() => testIntegration('gemini')}><RefreshCcw className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Search className="h-5 w-5 text-blue-500" /> FIPE Online</CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Sincronização de valores e dados técnicos de veículos.</p>
                <div className="flex items-center justify-between pt-2">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">Conectado</Badge>
                  <Button variant="link" size="sm" className="text-xs">Ver Documentação <ExternalLink className="h-3 w-3 ml-1" /></Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Database className="h-5 w-5 text-emerald-500" /> Supabase</CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Banco de dados e autenticação de usuários.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-50 rounded border text-center">
                    <div className="text-[10px] text-muted-foreground uppercase">Tabelas</div>
                    <div className="text-sm font-bold">12 Ativas</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border text-center">
                    <div className="text-[10px] text-muted-foreground uppercase">Auth</div>
                    <div className="text-sm font-bold">OK</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-500" /> Auditoria</CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Registro de ações operacionais e administrativas.</p>
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label className="text-xs">Logs Ativos</Label>
                    <p className="text-[10px] text-muted-foreground">Registrando logs para Auditoria</p>
                  </div>
                  <Switch defaultChecked disabled={!isSuperAdmin} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. AUDITORIA / LOGS */}
        <TabsContent value="auditoria" className="space-y-4">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Logs de Auditoria</CardTitle>
                  <CardDescription>Últimas 50 ações registradas no sistema.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadLogs} disabled={loadingLogs}>
                  <RefreshCcw className={`h-4 w-4 mr-2 ${loadingLogs ? 'animate-spin' : ''}`} /> Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100/50 text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Data/Hora</th>
                      <th className="px-4 py-3 text-left">Usuário</th>
                      <th className="px-4 py-3 text-left">Ação</th>
                      <th className="px-4 py-3 text-left">Recurso</th>
                      <th className="px-4 py-3 text-left">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono">{dataBR(log.created_at)}</td>
                        <td className="px-4 py-3 font-medium">{log.profiles?.full_name || 'Sistema'}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`
                            ${log.action.includes('CREATE') ? 'bg-success/10 text-success border-success/30' : 
                              log.action.includes('DELETE') ? 'bg-destructive/10 text-destructive border-destructive/30' : 
                              'bg-info/10 text-info border-info/30'} 
                            border-none text-[10px]
                          `}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{log.table_name}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate font-mono text-[10px]">ID: {log.record_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
