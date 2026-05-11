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
import { useRole } from "@/hooks/useRole";
// v1.0.3 - Fixed date timezone bug
import { dataBR, hojeBR, moedaBR as moeda, parseDate } from "@/lib/format";
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
      const dt = parseDate(d);
      if (dt.getFullYear() !== ano) continue;
      const m = dt.getMonth() + 1;
      c[m] = (c[m] || 0) + 1;
    }
    return c;
  }, [rows, ano]);
  const data = useMemo(() => rows.filter((a) => {
    if (empresaFiltro !== "Todas" && a.empresa !== empresaFiltro) return false;
    
    // Filtro inteligente para ambas as camadas de status
    if (status !== "todos") {
      const match = a.status === status || a.status_negociacao === status;
      if (!match) return false;
    }
    
    const d = a.data_avaliacao || a.created_at;
    if (d) {
      const dt = parseDate(d);
      if (dt.getFullYear() !== ano) return false;
      if (mes !== "todos" && dt.getMonth() + 1 !== mes) return false;
    }
    if (q) {
      const t = q.toLowerCase();
      return [a.placa, a.modelo, a.marca, a.vendedor, a.chassi, a.cliente].some((v) => v?.toLowerCase().includes(t));
    }
    return true;
  }), [rows, empresaFiltro, q, status, ano, mes]);

  const hojeCount = useMemo(() => {
    const hojeString = hojeBR();
    return rows.filter(a => {
      const d = a.data_avaliacao || a.created_at;
      if (!d) return false;
      const dt = parseDate(d);
      return dt.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) === hojeString;
    }).length;
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold">Avaliações</h1>
            <Badge className="bg-info text-info-foreground border-none px-2 py-0.5 rounded-full text-[10px] font-bold">
              {hojeCount} HOJE
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{data.length} resultados em {mes === "todos" ? ano : `${MESES[mes - 1].nome}/${ano}`}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!data.length} onClick={() => {
            const csv = toCSV(data.map((a) => ({
              numero: a.numero, data: dataBR(a.data_avaliacao || a.created_at), empresa: a.empresa,
              vendedor: a.vendedor, cliente: a.cliente, modalidade: a.modalidade, placa: a.placa,
              marca: a.marca, modelo: a.modelo, versao: a.versao, ano: a.ano, km: a.km,
              fipe: a.fipe, custo: a.custo, avaliacao: a.avaliacao, 
              status_avaliacao: a.status, status_negociacao: a.status_negociacao, 
              observacoes: a.observacoes,
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
            <SelectTrigger className="md:w-[220px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <optgroup label="Avaliação">
                <SelectItem value="Em Avaliação">Em Avaliação</SelectItem>
                <SelectItem value="Avaliado">Avaliado</SelectItem>
              </optgroup>
              <optgroup label="Negociação">
                <SelectItem value="Em negociação">Em negociação</SelectItem>
                <SelectItem value="Aguardando retorno">Aguardando retorno</SelectItem>
                <SelectItem value="Comprado">Comprado</SelectItem>
                <SelectItem value="Não comprado">Não comprado</SelectItem>
                <SelectItem value="Arquivado">Arquivado</SelectItem>
              </optgroup>
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
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((a) => {
                    const d = a.data_avaliacao || a.created_at;
                    return (
                      <tr key={a.id} onClick={() => navigate(`/avaliacoes/${a.id}`)} className="group border-t hover:bg-muted/40 cursor-pointer transition-premium">
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] font-medium text-muted-foreground/80">{dataBR(d)}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{a.vendedor || "—"}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{a.cliente || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold group-hover:text-primary transition-colors">{a.marca} {a.modelo}</div>
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{a.ano} {a.km ? `• ${a.km.toLocaleString("pt-BR")} km` : ""}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold tracking-tighter text-base">{a.placa}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs hidden md:table-cell text-muted-foreground">{moeda(a.fipe)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs hidden md:table-cell text-muted-foreground">{moeda(a.custo)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary">{moeda(a.avaliacao)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className={cn("text-[10px] font-bold border-none shadow-sm", STATUS_COLORS[a.status])}>
                              {a.status}
                            </Badge>
                            {a.status_negociacao !== "Sem definição" && (
                              <Badge variant="outline" className={cn("text-[10px] font-bold border-none shadow-sm", STATUS_COLORS[a.status_negociacao])}>
                                {a.status_negociacao}
                              </Badge>
                            )}
                          </div>
                        </td>
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
