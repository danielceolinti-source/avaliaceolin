import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, TrendingUp, ShoppingCart, XCircle, Wallet, Percent, BarChart3 } from "lucide-react";
import { useApp } from "@/store/app";
import { dataBR, moedaBR as moeda } from "@/lib/format";
import { downloadCSV, toCSV } from "@/lib/csv";
import { MESES, STATUS, STATUS_COLORS, Status } from "@/data/constants";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--info))", "hsl(var(--destructive))", "hsl(var(--accent))"];

export default function Relatorios() {
  const { empresaFiltro } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState<number | "todos">("todos");
  const [statusF, setStatusF] = useState<Status | "todos">("todos");
  const [vendedor, setVendedor] = useState<string>("todos");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("avaliacoes").select("*").order("data_avaliacao", { ascending: false });
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const filtrado = useMemo(() => rows.filter((a) => {
    if (empresaFiltro !== "Todas" && a.empresa !== empresaFiltro) return false;
    if (statusF !== "todos" && a.status !== statusF) return false;
    if (vendedor !== "todos" && a.vendedor !== vendedor) return false;
    const d = a.data_avaliacao || a.created_at;
    if (!d) return true;
    const dt = new Date(d);
    if (dt.getFullYear() !== ano) return false;
    if (mes !== "todos" && dt.getMonth() + 1 !== mes) return false;
    return true;
  }), [rows, empresaFiltro, ano, mes, statusF, vendedor]);

  const vendedores = useMemo(() => Array.from(new Set(rows.map((r) => r.vendedor).filter(Boolean))).sort(), [rows]);

  // KPIs
  const total = filtrado.length;
  const comprados = filtrado.filter((a) => a.status === "Comprado");
  const naoComprados = filtrado.filter((a) => a.status === "Não Comprado").length;
  const investido = comprados.reduce((s, a) => s + (Number(a.avaliacao) || 0), 0);
  const fipeTotal = comprados.reduce((s, a) => s + (Number(a.fipe) || 0), 0);
  const economia = fipeTotal - investido;
  const conversao = total ? Math.round((comprados.length / total) * 100) : 0;
  const ticketMedio = comprados.length ? investido / comprados.length : 0;

  // Por mês
  const porMes = useMemo(() => {
    const map: Record<number, { mes: string; total: number; comprados: number; investido: number }> = {};
    for (let i = 1; i <= 12; i++) map[i] = { mes: MESES[i - 1].abrev, total: 0, comprados: 0, investido: 0 };
    for (const a of filtrado) {
      const d = new Date(a.data_avaliacao || a.created_at);
      const m = d.getMonth() + 1;
      map[m].total++;
      if (a.status === "Comprado") {
        map[m].comprados++;
        map[m].investido += Number(a.avaliacao) || 0;
      }
    }
    return Object.values(map);
  }, [filtrado]);

  // Por vendedor
  const porVendedor = useMemo(() => {
    const map: Record<string, { vendedor: string; total: number; comprados: number; investido: number }> = {};
    for (const a of filtrado) {
      const v = a.vendedor || "—";
      if (!map[v]) map[v] = { vendedor: v, total: 0, comprados: 0, investido: 0 };
      map[v].total++;
      if (a.status === "Comprado") {
        map[v].comprados++;
        map[v].investido += Number(a.avaliacao) || 0;
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtrado]);

  // Por status (pie)
  const porStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of filtrado) map[a.status] = (map[a.status] || 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtrado]);

  const exportarCSV = () => {
    const csv = toCSV(
      filtrado.map((a) => ({
        numero: a.numero,
        data: dataBR(a.data_avaliacao || a.created_at),
        empresa: a.empresa,
        vendedor: a.vendedor,
        cliente: a.cliente,
        modalidade: a.modalidade,
        placa: a.placa,
        marca: a.marca,
        modelo: a.modelo,
        versao: a.versao,
        ano: a.ano,
        km: a.km,
        fipe: a.fipe,
        custo: a.custo,
        avaliacao: a.avaliacao,
        status: a.status,
        observacoes: a.observacoes,
      })),
      [
        { key: "numero", label: "Nº" },
        { key: "data", label: "Data" },
        { key: "empresa", label: "Empresa" },
        { key: "vendedor", label: "Vendedor" },
        { key: "cliente", label: "Cliente" },
        { key: "modalidade", label: "Modalidade" },
        { key: "placa", label: "Placa" },
        { key: "marca", label: "Marca" },
        { key: "modelo", label: "Modelo" },
        { key: "versao", label: "Versão" },
        { key: "ano", label: "Ano" },
        { key: "km", label: "KM" },
        { key: "fipe", label: "FIPE" },
        { key: "custo", label: "Custo" },
        { key: "avaliacao", label: "Avaliação" },
        { key: "status", label: "Status" },
        { key: "observacoes", label: "Observações" },
      ],
    );
    const periodo = mes === "todos" ? `${ano}` : `${MESES[mes - 1].abrev}-${ano}`;
    downloadCSV(`relatorio-avaliacoes-${periodo}.csv`, csv);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Análises</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">Indicadores, conversão, ticket médio e exportações.</p>
        </div>
        <Button onClick={exportarCSV} disabled={!filtrado.length} className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Download className="h-4 w-4 mr-2" /> Exportar CSV ({filtrado.length})
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          <Input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value) || ano)} placeholder="Ano" />
          <Select value={String(mes)} onValueChange={(v) => setMes(v === "todos" ? "todos" : Number(v))}>
            <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Ano todo</SelectItem>
              {MESES.map((m) => <SelectItem key={m.num} value={String(m.num)}>{m.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusF} onValueChange={(v) => setStatusF(v as any)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={vendedor} onValueChange={setVendedor}>
            <SelectTrigger><SelectValue placeholder="Vendedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos vendedores</SelectItem>
              {vendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${filtrado.length} registros`}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Kpi icon={BarChart3} label="Avaliações" value={String(total)} />
        <Kpi icon={ShoppingCart} label="Comprados" value={String(comprados.length)} tone="success" />
        <Kpi icon={XCircle} label="Não comprados" value={String(naoComprados)} tone="destructive" />
        <Kpi icon={Percent} label="Conversão" value={`${conversao}%`} tone="primary" />
        <Kpi icon={Wallet} label="Investido" value={moeda(investido)} />
        <Kpi icon={TrendingUp} label="Economia FIPE" value={moeda(economia)} tone="success" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Volume por mês</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="total" name="Avaliações" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comprados" name="Comprados" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Status</CardTitle></CardHeader>
          <CardContent className="h-72">
            {porStatus.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={porStatus} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={2}>
                    {porStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="grid place-items-center h-full text-sm text-muted-foreground">Sem dados</div>}
          </CardContent>
        </Card>
      </div>

      {/* Ranking vendedores */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Ranking de vendedores</CardTitle>
          <div className="text-xs text-muted-foreground">Ticket médio: <span className="font-mono font-semibold text-foreground">{moeda(ticketMedio)}</span></div>
        </CardHeader>
        <CardContent className="p-0">
          {porVendedor.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Sem dados no período.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5">#</th>
                    <th className="text-left px-4 py-2.5">Vendedor</th>
                    <th className="text-right px-4 py-2.5">Avaliações</th>
                    <th className="text-right px-4 py-2.5">Comprados</th>
                    <th className="text-right px-4 py-2.5">Conversão</th>
                    <th className="text-right px-4 py-2.5">Investido</th>
                  </tr>
                </thead>
                <tbody>
                  {porVendedor.map((v, i) => {
                    const conv = v.total ? Math.round((v.comprados / v.total) * 100) : 0;
                    return (
                      <tr key={v.vendedor} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium">{v.vendedor}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{v.total}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{v.comprados}</td>
                        <td className="px-4 py-2.5 text-right">
                          <Badge variant="outline" className={conv >= 50 ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground"}>{conv}%</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold">{moeda(v.investido)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista detalhada */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Detalhamento</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Data</th>
                  <th className="text-left px-3 py-2">Veículo</th>
                  <th className="text-left px-3 py-2">Placa</th>
                  <th className="text-left px-3 py-2">Vendedor</th>
                  <th className="text-right px-3 py-2">FIPE</th>
                  <th className="text-right px-3 py-2">Avaliação</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{dataBR(a.data_avaliacao || a.created_at)}</td>
                    <td className="px-3 py-2"><div className="font-medium">{a.marca} {a.modelo}</div><div className="text-xs text-muted-foreground">{a.ano}</div></td>
                    <td className="px-3 py-2 font-mono text-xs">{a.placa}</td>
                    <td className="px-3 py-2">{a.vendedor || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{moeda(a.fipe)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{moeda(a.avaliacao)}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className={STATUS_COLORS[a.status as Status]}>{a.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: "primary" | "success" | "destructive" }) {
  const cls = tone === "primary" ? "text-primary" : tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <Icon className={`h-4 w-4 ${cls}`} />
        </div>
        <div className={`mt-1.5 font-display text-2xl font-bold ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
