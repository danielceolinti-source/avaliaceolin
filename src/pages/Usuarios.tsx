import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole, AppRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, 
  Search, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  User as UserIcon, 
  Lock, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Key, 
  Building2,
  UserPlus,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

const ROLES: { id: AppRole; label: string; tone: string; icon: any }[] = [
  { id: "super_admin", label: "Super Admin", tone: "bg-destructive/15 text-destructive border-destructive/30", icon: ShieldAlert },
  { id: "ti", label: "T.I.", tone: "bg-info/15 text-info border-info/30", icon: ShieldCheck },
  { id: "gestor", label: "Gestor", tone: "bg-warning/15 text-warning border-warning/30", icon: Shield },
  { id: "avaliador", label: "Avaliador", tone: "bg-muted text-foreground border-border", icon: UserIcon },
];

const EMPRESAS = ["Ceolin", "Viva"];
const MASTER_EMAIL = "daniel@avaliaceolin.sistema";

type Row = { 
  user_id: string; 
  full_name: string | null; 
  phone: string | null; 
  email?: string; // We'll fetch email if possible or use a flag
  created_at: string; 
  roles: AppRole[]; 
  empresa: string | null;
  ativo: boolean;
  isMaster?: boolean;
};

export default function Usuarios() {
  const { canManageRoles, loading: roleLoading } = useRole();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterEmpresa, setFilterEmpresa] = useState<string>("all");
  
  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  // Form states
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    phone: "",
    password: "",
    role: "avaliador" as AppRole,
    empresa: "Ceolin" as any,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: userRoles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      
      const map = new Map<string, AppRole[]>();
      (userRoles || []).forEach((r: any) => {
        const arr = map.get(r.user_id) || [];
        arr.push(r.role);
        map.set(r.user_id, arr);
      });
      
      setRows((profiles || []).map((p: any) => {
        // Daniel is the Master (checking full_name as a proxy if email is not in profile, 
        // but ideally we'd have a specific ID or field)
        const isMaster = p.full_name === "Daniel Andrade";
        
        return { 
          ...p, 
          ativo: p.ativo ?? true,
          roles: map.get(p.user_id) || [],
          isMaster
        };
      }));
    } catch (error: any) {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createLog = async (action: string, recordId: string, oldData: any, newData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert({
      user_id: user?.id,
      action,
      table_name: "profiles/auth.users",
      record_id: recordId,
      old_data: oldData,
      new_data: newData
    });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    
    try {
      const email = `${form.username}@avaliaceolin.sistema`;
      
      // Chamada para Edge Function que usa service role
      const { data, error } = await supabase.functions.invoke("admin-user-management", {
        body: { 
          action: "create",
          userData: {
            email,
            password: form.password,
            full_name: form.fullName,
            phone: form.phone,
            role: form.role,
            empresa: form.empresa
          }
        }
      });

      if (error) throw error;

      toast.success("Usuário criado com sucesso");
      setIsAddOpen(false);
      setForm({ username: "", fullName: "", phone: "", password: "", role: "avaliador", empresa: "Ceolin" });
      load();
    } catch (error: any) {
      toast.error("Erro ao criar usuário. Verifique se a Edge Function está ativa.");
      console.error(error);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setBusy(true);

    try {
      const { error: pError } = await supabase
        .from("profiles")
        .update({ 
          full_name: form.fullName, 
          phone: form.phone, 
          empresa: form.empresa 
        })
        .eq("user_id", editingUser.user_id);

      if (pError) throw pError;

      // Update role if changed
      if (!editingUser.roles.includes(form.role)) {
        await supabase.from("user_roles").delete().eq("user_id", editingUser.user_id);
        await supabase.from("user_roles").insert({ user_id: editingUser.user_id, role: form.role });
      }

      await createLog("UPDATE_USER", editingUser.user_id, editingUser, form);
      toast.success("Usuário atualizado");
      setIsEditOpen(false);
      load();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleAtivo = async (user: Row) => {
    const novoStatus = !user.ativo;
    const { error } = await supabase.from("profiles").update({ ativo: novoStatus }).eq("user_id", user.user_id);
    
    if (error) return toast.error(error.message);
    
    await createLog(novoStatus ? "ACTIVATE_USER" : "DEACTIVATE_USER", user.user_id, { ativo: user.ativo }, { ativo: novoStatus });
    toast.success(novoStatus ? "Usuário ativado" : "Usuário desativado");
    load();
  };

  const deleteUser = async (user: Row) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente o usuário ${user.full_name}?`)) return;
    
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("admin-user-management", {
        body: { action: "delete", userId: user.user_id }
      });
      if (error) throw error;
      
      await createLog("DELETE_USER", user.user_id, user, null);
      toast.success("Usuário excluído");
      load();
    } catch (error: any) {
      toast.error("Erro ao excluir usuário.");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (user: Row) => {
    const newPass = prompt(`Digite a nova senha para ${user.full_name}:`);
    if (!newPass) return;

    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("admin-user-management", {
        body: { action: "reset-password", userId: user.user_id, password: newPass }
      });
      if (error) throw error;
      
      await createLog("RESET_PASSWORD", user.user_id, null, { action: "password_reset" });
      toast.success("Senha alterada com sucesso");
    } catch (error: any) {
      toast.error("Erro ao alterar senha.");
    } finally {
      setBusy(false);
    }
  };

  const filtered = rows.filter((r) => {
    const matchesQuery = !q || (r.full_name || "").toLowerCase().includes(q.toLowerCase()) || (r.phone || "").includes(q);
    const matchesRole = filterRole === "all" || r.roles.includes(filterRole as AppRole);
    const matchesEmpresa = filterEmpresa === "all" || r.empresa === filterEmpresa;
    return matchesQuery && matchesRole && matchesEmpresa;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">Administre acessos, funções e empresas da equipe.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-lg shadow-primary/20 gap-2">
              <UserPlus className="h-4 w-4" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>Preencha os dados do colaborador. O login será corporativo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Login (Usuário)</Label>
                <Input id="username" placeholder="ex: pedro.silva" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input id="fullName" placeholder="Nome do colaborador" required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pass">Senha Inicial</Label>
                <Input id="pass" type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Função</Label>
                  <Select value={form.role} onValueChange={(v: any) => setForm({...form, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Empresa</Label>
                  <Select value={form.empresa} onValueChange={(v: any) => setForm({...form, empresa: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Conta Corporativa"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome…" className="pl-9" />
            </div>
            
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Filter className="h-4 w-4" /> Filtros</div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todas as Funções" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Funções</SelectItem>
                  {ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              
              <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todas as Empresas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Empresas</SelectItem>
                  {EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 overflow-hidden border-none shadow-md">
          <CardHeader className="bg-slate-50/50 border-b py-3 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Colaboradores ({filtered.length})</CardTitle>
              <Badge variant="outline" className="bg-white">{rows.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <UserIcon className="h-10 w-10 text-slate-200 mx-auto" />
                <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((u) => (
                  <div key={u.user_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full grid place-items-center font-bold text-sm ${u.ativo ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}>
                        {(u.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${!u.ativo && "text-muted-foreground line-through"}`}>{u.full_name || "Sem nome"}</span>
                          {!u.ativo && <Badge variant="secondary" className="text-[10px] h-4">Inativo</Badge>}
                          {u.isMaster && <Badge className="bg-amber-500 hover:bg-amber-600 border-none text-[10px] h-4">MASTER</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {u.empresa || "Não definida"}</span>
                          {u.phone && <span>· {u.phone}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map(rId => {
                          const r = ROLES.find(x => x.id === rId);
                          if (!r) return null;
                          return <Badge key={rId} variant="outline" className={`${r.tone} border-none font-normal text-[10px]`}>{r.label}</Badge>
                        })}
                      </div>

                      {u.isMaster ? (
                        <div className="h-8 w-8 grid place-items-center"><Lock className="h-4 w-4 text-slate-300" /></div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              setEditingUser(u);
                              setForm({
                                username: "", // Cannot edit username
                                fullName: u.full_name || "",
                                phone: u.phone || "",
                                password: "",
                                role: u.roles[0] || "avaliador",
                                empresa: u.empresa as any || "Ceolin"
                              });
                              setIsEditOpen(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" /> Editar Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => resetPassword(u)}>
                              <Key className="h-4 w-4 mr-2" /> Alterar Senha
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleAtivo(u)}>
                              {u.ativo ? (
                                <><Shield className="h-4 w-4 mr-2 text-warning" /> Desativar Acesso</>
                              ) : (
                                <><ShieldCheck className="h-4 w-4 mr-2 text-success" /> Ativar Acesso</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteUser(u)} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir Conta
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>Atualize as informações de {editingUser?.full_name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editName">Nome Completo</Label>
              <Input id="editName" required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editPhone">Telefone</Label>
              <Input id="editPhone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Função</Label>
                <Select value={form.role} onValueChange={(v: any) => setForm({...form, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Empresa</Label>
                <Select value={form.empresa} onValueChange={(v: any) => setForm({...form, empresa: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
