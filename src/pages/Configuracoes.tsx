import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Save,
  RefreshCcw,
  Lock,
  UserCircle,
  ShieldAlert,
  Gauge,
  Users,
  UserCog,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import KmBadge from "@/components/KmBadge";
import { useQueryClient } from "@tanstack/react-query";
import Usuarios from "./Usuarios";
import Vendedores from "./Vendedores";
import { cn } from "@/lib/utils";

type SectionKey = "parametros" | "usuarios" | "vendedores" | "perfil";

export default function Configuracoes() {
  const { isSuperAdmin, isTI } = useRole();
  const canEditKeys = isSuperAdmin || isTI;
  const canAdmin = isSuperAdmin || isTI;

  const [section, setSection] = useState<SectionKey>("parametros");

  // ─────────── Perfil ───────────
  const [perfil, setPerfil] = useState({
    full_name: "",
    email_corporativo: "",
    telefone: "",
    avatar_url: "",
  });
  const [loadingPerfil, setLoadingPerfil] = useState(false);

  // ─────────── Parâmetros KM ───────────
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
    const { data } = await (supabase as any)
      .from("system_settings")
      .select("key, value")
      .in("key", [
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
    if (section === "perfil") loadPerfil();
    if (section === "parametros") loadKmSettings();
  }, [section]);

  const loadPerfil = async () => {
    setLoadingPerfil(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      const d: any = data;
      if (d)
        setPerfil({
          full_name: d.full_name || "",
          email_corporativo: d.email_corporativo || "",
          telefone: d.telefone || d.phone || "",
          avatar_url: d.avatar_url || "",
        });
    }
    setLoadingPerfil(false);
  };

  const savePerfil = async () => {
    setLoadingPerfil(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await (supabase.from("profiles").update as any)({
        full_name: perfil.full_name,
        email_corporativo: perfil.email_corporativo,
        telefone: perfil.telefone,
      }).eq("user_id", user.id);

      if (error) {
        const { error: errorBasic } = await supabase
          .from("profiles")
          .update({ full_name: perfil.full_name })
          .eq("user_id", user.id);
        if (errorBasic) toast.error("Erro ao salvar perfil básico");
        else toast.warning("Nome salvo, mas campos de contato exigem sincronização do banco.");
      } else {
        toast.success("Perfil atualizado com sucesso");
      }
    }
    setLoadingPerfil(false);
  };

  // ─────────── Navegação Apple-style ───────────
  const navItems: { key: SectionKey; label: string; description: string; icon: any; show: boolean }[] = [
    { key: "parametros", label: "Parâmetros", description: "Faixas de KM e alertas", icon: Gauge, show: true },
    { key: "usuarios", label: "Usuários", description: "Contas e permissões", icon: Users, show: canAdmin },
    { key: "vendedores", label: "Vendedores", description: "Equipe comercial", icon: UserCog, show: canAdmin },
    { key: "perfil", label: "Meu Perfil", description: "Conta pessoal", icon: UserCircle, show: true },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Apple-style */}
      <div className="space-y-1">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-[15px]">
          Personalize parâmetros, perfis e equipe do sistema Ceolin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Sidebar Apple-style */}
        <nav className="space-y-1 lg:sticky lg:top-4 lg:self-start">
          {navItems
            .filter((i) => i.show)
            .map((item) => {
              const active = section === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all",
                    "hover:bg-muted/60 active:scale-[0.99]",
                    active && "bg-muted shadow-sm"
                  )}
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-xl grid place-items-center shrink-0 transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{item.description}</div>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground/60 transition-transform",
                      active && "rotate-90 text-foreground"
                    )}
                  />
                </button>
              );
            })}
        </nav>

        {/* Conteúdo */}
        <div className="min-w-0">
          {section === "parametros" && (
            <Card className="border-none shadow-sm rounded-3xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                  <Gauge className="h-5 w-5 text-primary" /> Quilometragem e Alertas
                </CardTitle>
                <CardDescription className="text-[14px]">
                  Define os limites usados nos badges coloridos e nos banners de alerta de toda a aplicação.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {!canEditKeys && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-xs p-3 flex items-start gap-2">
                    <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                    Apenas usuários Super Admin ou TI podem alterar estes parâmetros.
                  </div>
                )}

                <section className="space-y-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Limites
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border bg-card p-4 space-y-2">
                      <Label className="text-xs">Verde → Amarelo</Label>
                      <Input
                        type="number"
                        value={kmSettings.yellow}
                        onChange={(e) => setKmSettings({ ...kmSettings, yellow: e.target.value })}
                        disabled={!canEditKeys || loadingKm}
                        className="font-mono text-lg h-12 rounded-xl"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Acima deste valor: alerta de atenção.
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-card p-4 space-y-2">
                      <Label className="text-xs">Amarelo → Vermelho</Label>
                      <Input
                        type="number"
                        value={kmSettings.red}
                        onChange={(e) => setKmSettings({ ...kmSettings, red: e.target.value })}
                        disabled={!canEditKeys || loadingKm}
                        className="font-mono text-lg h-12 rounded-xl"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Acima deste valor: alto risco.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Mensagens
                  </h3>
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <Label className="text-xs">Texto — Alerta Amarelo</Label>
                      <Input
                        value={kmSettings.yellowText}
                        onChange={(e) => setKmSettings({ ...kmSettings, yellowText: e.target.value })}
                        disabled={!canEditKeys || loadingKm}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Texto — Alerta Vermelho</Label>
                      <Input
                        value={kmSettings.redText}
                        onChange={(e) => setKmSettings({ ...kmSettings, redText: e.target.value })}
                        disabled={!canEditKeys || loadingKm}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Pré-visualização
                  </h3>
                  <div className="rounded-2xl border bg-muted/30 p-4 flex flex-wrap gap-3 items-center">
                    <KmBadge km={Math.max(1, parseInt(kmSettings.yellow) - 10000)} />
                    <KmBadge
                      km={Math.max(
                        1,
                        Math.floor((parseInt(kmSettings.yellow) + parseInt(kmSettings.red)) / 2)
                      )}
                    />
                    <KmBadge km={parseInt(kmSettings.red) + 20000} />
                  </div>
                </section>

                <div className="pt-2">
                  <Button
                    onClick={saveKmSettings}
                    disabled={!canEditKeys || savingKm}
                    className="gap-2 h-11 rounded-xl px-6"
                  >
                    {savingKm ? (
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar parâmetros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {section === "usuarios" && canAdmin && (
            <div className="rounded-3xl bg-card shadow-sm p-2">
              <Usuarios />
            </div>
          )}

          {section === "vendedores" && canAdmin && (
            <div className="rounded-3xl bg-card shadow-sm p-2">
              <Vendedores />
            </div>
          )}

          {section === "perfil" && (
            <Card className="border-none shadow-sm rounded-3xl">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold tracking-tight">Meu Perfil</CardTitle>
                <CardDescription>Personalize sua conta e foto de exibição.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex flex-col md:flex-row items-center gap-8 pb-6 border-b">
                  <div className="relative group">
                    <div className="h-28 w-28 rounded-full bg-gradient-primary grid place-items-center text-4xl font-bold text-white shadow-xl overflow-hidden">
                      {perfil.avatar_url ? (
                        <img src={perfil.avatar_url} className="h-full w-full object-cover" />
                      ) : (
                        perfil.full_name.charAt(0) || "U"
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-xl font-semibold">{perfil.full_name || "Seu Nome"}</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Sua foto aparecerá no topo do sistema e nos relatórios de avaliação.
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs">Nome Completo</Label>
                    <Input
                      className="h-11 rounded-xl"
                      value={perfil.full_name}
                      onChange={(e) => setPerfil({ ...perfil, full_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Email Corporativo</Label>
                    <Input
                      className="h-11 rounded-xl"
                      value={perfil.email_corporativo}
                      onChange={(e) => setPerfil({ ...perfil, email_corporativo: e.target.value })}
                      placeholder="seuemail@ceolin.com.br"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Telefone / WhatsApp</Label>
                    <Input
                      className="h-11 rounded-xl"
                      value={perfil.telefone}
                      onChange={(e) => setPerfil({ ...perfil, telefone: e.target.value })}
                      placeholder="(27) 99999-0000"
                    />
                  </div>
                </div>
                <div className="pt-2 flex flex-col gap-4">
                  <div className="flex items-start gap-3 text-amber-700 bg-amber-50 p-4 rounded-2xl text-xs border border-amber-100">
                    <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">Sincronização Necessária</p>
                      <p className="leading-relaxed">
                        Caso E-mail ou Telefone não salvem, o administrador deve sincronizar o
                        schema da tabela de perfis.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={savePerfil}
                    disabled={loadingPerfil}
                    className="w-full md:w-auto h-11 gap-2 rounded-xl"
                  >
                    {loadingPerfil ? (
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Atualizar Perfil
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
