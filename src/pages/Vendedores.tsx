import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Trash2, UserCog, Power } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendedores } from "@/hooks/useVendedores";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { EMPRESAS } from "@/data/constants";

export default function Vendedores() {
  const { user } = useAuth();
  const { isAdmin, roles } = useRole();
  const podeExcluir = roles.includes("super_admin") || roles.includes("ti");
  const { vendedores, loading, reload } = useVendedores(undefined, false);
  const [q, setQ] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaEmpresa, setNovaEmpresa] = useState<string>("Ceolin");

  const filtrados = vendedores.filter((v) => !q || v.nome.toLowerCase().includes(q.toLowerCase()));

  const adicionar = async () => {
    if (!novoNome.trim() || !user) return;
    const { error } = await supabase.from("vendedores").insert({ nome: novoNome.trim(), empresa: novaEmpresa, created_by: user.id });
    if (error) return toast.error(error.message);
    toast.success("Vendedor cadastrado");
    setNovoNome("");
    reload();
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    const { error } = await supabase.from("vendedores").update({ ativo: !ativo }).eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir vendedor?")) return;
    const { error } = await supabase.from("vendedores").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    reload();
  };

  const renomear = async (id: string, nome: string) => {
    const { error } = await supabase.from("vendedores").update({ nome }).eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><UserCog className="h-7 w-7" /> Vendedores</h1>
        <p className="text-muted-foreground text-sm mt-1">{vendedores.length} cadastrados · {vendedores.filter(v=>v.ativo).length} ativos</p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Novo vendedor</CardTitle></CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-2">
            <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome" className="md:flex-1" />
            <Select value={novaEmpresa} onValueChange={setNovaEmpresa}>
              <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{EMPRESAS.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={adicionar} className="bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-2" /> Cadastrar</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar vendedor…" className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="divide-y">
              {filtrados.map((v) => (
                <div key={v.id} className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-semibold flex-shrink-0">
                    {v.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isAdmin ? (
                      <Input defaultValue={v.nome} onBlur={(e) => e.target.value !== v.nome && renomear(v.id, e.target.value)} className="h-8 border-transparent hover:border-input" />
                    ) : (
                      <div className="font-medium">{v.nome}</div>
                    )}
                    <div className="text-xs text-muted-foreground">{v.empresa || "—"}</div>
                  </div>
                  <Badge variant="outline" className={v.ativo ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                    {v.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => toggleAtivo(v.id, v.ativo)}><Power className="h-4 w-4" /></Button>
                  )}
                  {podeExcluir && (
                    <Button variant="ghost" size="icon" onClick={() => excluir(v.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
