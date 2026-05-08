import { useEffect, useMemo, useState } from "react";
import { STATUS, STATUS_COLORS, Status, MESES } from "@/data/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download, Filter, Plus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/store/app";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import { dataBR, moedaBR as moeda } from "@/lib/format";
import { downloadCSV, toCSV } from "@/lib/csv";

export default function Avaliacoes() {
  const navigate = useNavigate();
  const { canCreateAssessment } = useRole();
  const { empresaFiltro } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "todos">("todos");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState<number | "todos">(new Date().getMonth() + 1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("avaliacoes").select("*").order("data_avaliacao", { ascending: false }).order("created_at", { ascending: false });
      if (!error) setRows(data || []);
      setLoading(false);
    })();
  }, []);

  // Contadores por mês
  const contadores = useMemo(() => {
    const c: Record<number, number> = {};
    for (const a of rows) {
      const d = a.data_avaliacao || a.created_at;
      if (!d) continue;
      const dt = new Date(d);
      if (dt.getFullYear() !== ano) continue;
      const m = dt.getMonth() + 1;
      c[m] = (c[m] || 0) + 1;
    }
    return c;
  }, [rows, ano]);

  const data = useMemo(() => rows.filter((a) => {
    if (empresaFiltro !== "Todas" && a.empresa !== empresaFiltro) return false;
    if (status !== "todos" && a.status !== status) return false;
    const d = a.data_avaliacao || a.created_at;
    if (d) {
      const dt = new Date(d);
      if (dt.getFullYear() !== ano) return false;
      if (mes !== "todos" && dt.getMonth() + 1 !== mes) return false;
    }
    if (q) {
      const t = q.toLowerCase();
      return [a.placa, a.modelo, a.marca, a.vendedor, a.chassi, a.cliente].some((v) => v?.toLowerCase().includes(t));
    }
    return true;
  }), [rows, empresaFiltro, q, status, ano, mes]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Avaliações</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.length} resultados em {mes === "todos" ? ano : `${MESES[mes - 1].nome}/${ano}`}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!data.length} onClick={() => {
            const csv = toCSV(data.map((a) => ({
              numero: a.numero, data: dataBR(a.data_avaliacao || a.created_at), empresa: a.empresa,
              vendedor: a.vendedor, cliente: a.cliente, modalidade: a.modalidade, placa: a.placa,
              marca: a.marca, modelo: a.modelo, versao: a.versao, ano: a.ano, km: a.km,
              fipe: a.fipe, custo: a.custo, avaliacao: a.avaliacao, status: a.status, observacoes: a.observacoes,
            })));
            const periodo = mes === "todos" ? `${ano}` : `${MESES[mes - 1].abrev}-${ano}`;
            downloadCSV(`avaliacoes-${periodo}.csv`, csv);
          }}><Download className="h-4 w-4 mr-2" /> Exportar</Button>
          {canCreateAssessment && (
            <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Link to="/nova"><Plus className="h-4 w-4 mr-2" /> Nova Avaliação</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Navegação mensal estilo abas da planilha */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setAno(ano - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="font-display font-bold text-lg w-16 text-center">{ano}</div>
            <Button variant="ghost" size="icon" onClick={() => setAno(ano + 1)}><ChevronRight className="h-4 w-4" /></Button>
            <div className="h-6 w-px bg-border mx-2" />
            <div className="flex flex-wrap gap-1.5 flex-1">
              <button
                onClick={() => setMes("todos")}
                data-active={mes === "todos"}
                className="h-9 px-3 rounded-md border bg-card text-xs font-semibold transition-all data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:border-primary hover:border-primary/40"
              >
                ANO TODO
              </button>
              {MESES.map((m) => {
                const count = contadores[m.num] || 0;
                return (
                  <button
                    key={m.num}
                    onClick={() => setMes(m.num)}
                    data-active={mes === m.num}
                    className={cn(
                      "h-9 px-3 rounded-md border bg-card text-xs font-semibold transition-all flex items-center gap-1.5",
                      "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:border-primary",
                      "hover:border-primary/40",
                      count === 0 && mes !== m.num && "text-muted-foreground"
                    )}
                  >
                    {m.abrev}
                    {count > 0 && (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">{count}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Placa, cliente, modelo, vendedor…" className="pl-9" />
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
              <div className="font-display text-lg font-semibold">Nenhuma avaliação neste período</div>
              <p className="text-sm text-muted-foreground mt-1">Crie a primeira ou troque de mês.</p>
              {canCreateAssessment && (
                <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground shadow-glow">
                  <Link to="/nova"><Plus className="h-4 w-4 mr-2" /> Nova Avaliação</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Vendedor</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Cliente</th>
                    <th className="text-left px-4 py-3">Veículo</th>
                    <th className="text-left px-4 py-3">Placa</th>
                    <th className="text-right px-4 py-3 hidden md:table-cell">FIPE</th>
                    <th className="text-right px-4 py-3 hidden md:table-cell">Custo</th>
                    <th className="text-right px-4 py-3">Avaliação</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Modal.</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((a) => {
                    const d = a.data_avaliacao || a.created_at;
                    return (
                      <tr key={a.id} onClick={() => navigate(`/avaliacoes/${a.id}`)} className="border-t hover:bg-muted/30 cursor-pointer">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{dataBR(d)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{a.vendedor || "—"}</td>
                        <td className="px-4 py-3 hidden md:table-cell">{a.cliente || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{a.marca} {a.modelo}</div>
                          <div className="text-xs text-muted-foreground">{a.ano} {a.km ? `• ${a.km.toLocaleString("pt-BR")} km` : ""}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">{a.placa}</td>
                        <td className="px-4 py-3 text-right font-mono hidden md:table-cell">{moeda(a.fipe)}</td>
                        <td className="px-4 py-3 text-right font-mono hidden md:table-cell">{moeda(a.custo)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">{moeda(a.avaliacao)}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {a.modalidade && <Badge variant="outline" className={a.modalidade === "PRESENCIAL" ? "bg-success/10 text-success border-success/30" : "bg-info/10 text-info border-info/30"}>{a.modalidade}</Badge>}
                        </td>
                        <td className="px-4 py-3"><Badge variant="outline" className={STATUS_COLORS[a.status as Status]}>{a.status}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
