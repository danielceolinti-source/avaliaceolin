import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole, AppRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Shield, ShieldCheck, ShieldAlert, User as UserIcon, Lock } from "lucide-react";
import { toast } from "sonner";

const ROLES: { id: AppRole; label: string; tone: string; icon: any }[] = [
  { id: "super_admin", label: "Super Admin", tone: "bg-destructive/15 text-destructive border-destructive/30", icon: ShieldAlert },
  { id: "ti", label: "T.I.", tone: "bg-info/15 text-info border-info/30", icon: ShieldCheck },
  { id: "gestor", label: "Gestor", tone: "bg-warning/15 text-warning border-warning/30", icon: Shield },
  { id: "avaliador", label: "Avaliador", tone: "bg-muted text-foreground border-border", icon: UserIcon },
];

type Row = { user_id: string; full_name: string | null; phone: string | null; created_at: string; roles: AppRole[] };

export default function Usuarios() {
  const { canManageRoles, loading: roleLoading } = useRole();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: userRoles }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, phone, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map<string, AppRole[]>();
    (userRoles || []).forEach((r: any) => {
      const arr = map.get(r.user_id) || [];
      arr.push(r.role);
      map.set(r.user_id, arr);
    });
    setRows((profiles || []).map((p: any) => ({ ...p, roles: map.get(p.user_id) || [] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleRole = async (userId: string, role: AppRole, has: boolean) => {
    if (!canManageRoles) return toast.error("Sem permissão");
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
    }
    toast.success("Permissões atualizadas");
    load();
  };

  const filtered = rows.filter((r) =>
    !q || (r.full_name || "").toLowerCase().includes(q.toLowerCase()) || (r.phone || "").includes(q)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Usuários & Permissões</h1>
          <p className="text-muted-foreground text-sm mt-1">{rows.length} usuários cadastrados</p>
        </div>
      </div>

      {!roleLoading && !canManageRoles && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3 text-sm">
            <Lock className="h-4 w-4 text-warning" />
            Apenas Super Admin e T.I. podem alterar permissões. Você está em modo somente leitura.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou telefone…" className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Equipe</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Nenhum usuário encontrado</div>
          ) : (
            <div className="divide-y">
              {filtered.map((u) => (
                <div key={u.user_id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-semibold flex-shrink-0">
                      {(u.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.full_name || "Sem nome"}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.phone || "—"}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((r) => {
                      const has = u.roles.includes(r.id);
                      const Icon = r.icon;
                      return (
                        <button
                          key={r.id}
                          onClick={() => toggleRole(u.user_id, r.id, has)}
                          disabled={!canManageRoles}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                            has ? r.tone : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
                          } ${!canManageRoles ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                        >
                          <Icon className="h-3 w-3" />
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
