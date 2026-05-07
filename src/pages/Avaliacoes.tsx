import { useEffect, useMemo, useState } from "react";
import { STATUS, STATUS_COLORS, Status } from "@/data/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download, Filter, Plus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "@/store/app";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const moeda = (n: number | null) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Avaliacoes() {
  const { empresaFiltro } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "todos">("todos");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("avaliacoes").select("*").order("created_at", { ascending: false });
      if (!error) setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const data = useMemo(() => rows.filter((a) => {
    if (empresaFiltro !== "Todas" && a.empresa !== empresaFiltro) return false;
    if (status !== "todos" && a.status !== status) return false;
    if (q) {
      const t = q.toLowerCase();
      return [a.placa, a.modelo, a.marca, a.vendedor, a.chassi].some((v) => v?.toLowerCase().includes(t));
    }
    return true;
  }), [rows, empresaFiltro, q, status]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Avaliações</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.length} resultados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Exportar</Button>
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Link to="/nova"><Plus className="h-4 w-4 mr-2" /> Nova Avaliação</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Placa, chassi, modelo, vendedor…" className="pl-9" />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="md:w-[200px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : data.length === 0 ? (
            <div className="py-16 text-center">
              <div className="font-display text-lg font-semibold">Nenhuma avaliação ainda</div>
              <p className="text-sm text-muted-foreground mt-1">Crie a primeira para começar a popular o sistema.</p>
              <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground shadow-glow">
                <Link to="/nova"><Plus className="h-4 w-4 mr-2" /> Nova Avaliação</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Nº</th>
                    <th className="text-left px-4 py-3">Veículo</th>
                    <th className="text-left px-4 py-3">Placa</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Empresa</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Vendedor</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Origem</th>
                    <th className="text-right px-4 py-3">FIPE</th>
                    <th className="text-right px-4 py-3">Avaliação</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((a) => (
                    <tr key={a.id} className="border-t hover:bg-muted/30 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{a.numero}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{a.marca} {a.modelo}</div>
                        <div className="text-xs text-muted-foreground">{a.ano} {a.km ? `• ${a.km.toLocaleString("pt-BR")} km` : ""}</div>
                      </td>
                      <td className="px-4 py-3 font-mono">{a.placa}</td>
                      <td className="px-4 py-3 hidden md:table-cell">{a.empresa}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">{a.vendedor}</td>
                      <td className="px-4 py-3 hidden md:table-cell">{a.origem}</td>
                      <td className="px-4 py-3 text-right font-mono">{moeda(a.fipe)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{moeda(a.avaliacao)}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className={STATUS_COLORS[a.status as Status]}>{a.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
