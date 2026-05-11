import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, TrendingUp, ShoppingCart, XCircle, Wallet, Percent, BarChart3, Settings } from "lucide-react";
import { useApp } from "@/store/app";
import { dataBR, moedaBR as moeda, parseDate } from "@/lib/format";
import { downloadCSV, toCSV } from "@/lib/csv";
import { MESES, STATUS, STATUS_COLORS, Status } from "@/data/constants";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--info))", "hsl(var(--destructive))", "hsl(var(--accent))"];
const ORIGENS = ["Showroom", "Online", "Indicação", "Frotista", "Outros"];

export default function Relatorios() {
  const { empresaFiltro } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState<number | "todos">("todos");
  const [statusF, setStatusF] = useState<Status | "todos">("todos");
  const [vendedor, setVendedor] = useState<string>("todos");
  const [avaliador, setAvaliador] = useState<string>("todos");
  const [origem, setOrigem] = useState<string>("todos");
  
  // Personalização do Relatório
  const [showKPIs, setShowKPIs] = useState(() => JSON.parse(localStorage.getItem("rel_show_kpis") || '{"investido": true, "conversao": true, "graficos": true}'));

  useEffect(() => {
    localStorage.setItem("rel_show_kpis", JSON.stringify(showKPIs));
  }, [showKPIs]);

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
    
    // Filtro inteligente para ambas as camadas
    if (statusF !== "todos") {
      const match = a.status === statusF || a.status_negociacao === statusF;
      if (!match) return false;
    }

    if (vendedor !== "todos" && a.vendedor !== vendedor) return false;
    if (avaliador !== "todos" && a.created_by_name !== avaliador) return false;
    if (origem !== "todos" && a.origem !== origem) return false;
    const d = a.data_avaliacao || a.created_at;
    if (!d) return true;
    const dt = parseDate(d);
    if (dt.getFullYear() !== ano) return false;
    if (mes !== "todos" && dt.getMonth() + 1 !== mes) return false;
    return true;
  }), [rows, empresaFiltro, ano, mes, statusF, vendedor, avaliador, origem]);

  const listaVendedores = useMemo(() => Array.from(new Set(rows.map((r) => r.vendedor).filter(Boolean))).sort(), [rows]);
  const listaAvaliadores = useMemo(() => Array.from(new Set(rows.map((r) => r.created_by_name).filter(Boolean))).sort(), [rows]);

  // KPIs
  const total = filtrado.length;
  const comprados = filtrado.filter((a) => a.status_negociacao === "Comprado");
  const naoComprados = filtrado.filter((a) => a.status_negociacao === "Não comprado").length;
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
      const d = parseDate(a.data_avaliacao || a.created_at);
      const m = d.getMonth() + 1;
      map[m].total++;
      if (a.status_negociacao === "Comprado") {
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
      if (a.status_negociacao === "Comprado") {
        map[v].comprados++;
        map[v].investido += Number(a.avaliacao) || 0;
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtrado]);

  // Por status (pie) — Camada de Negociação
  const porStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of filtrado) {
      const s = a.status_negociacao !== "Sem definição" ? a.status_negociacao : a.status;
      map[s] = (map[s] || 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtrado]);

  const exportarPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, pageWidth, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("AVALIA CEOLIN", 15, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("RELATÓRIO OPERACIONAL DE AVALIAÇÕES", 15, 30);
    
    const periodoCompleto = mes === "todos" ? `Ano de ${ano}` : `${MESES[mes-1].nome} de ${ano}`;
    doc.text(`RELATÓRIO: ${periodoCompleto}`, pageWidth - 15, 20, { align: "right" });
    doc.text(`EMPRESA: ${empresaFiltro.toUpperCase()}`, pageWidth - 15, 30, { align: "right" });

    // KPIs Row
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO DO PERÍODO", 15, 55);
    
    const kpiHead = ["Avaliações", "Comprados"];
    const kpiBody = [total.toString(), comprados.length.toString()];
    
    if (showKPIs.conversao) { kpiHead.push("Conversão"); kpiBody.push(`${conversao}%`); }
    if (showKPIs.investido) { kpiHead.push("Total Investido"); kpiBody.push(moeda(investido)); }

    autoTable(doc, {
      startY: 60,
      head: [kpiHead],
      body: [kpiBody],
      theme: "grid",
      headStyles: { fillColor: [71, 85, 105], fontSize: 8 },
      styles: { fontSize: 10, halign: "center" }
    });

    // Main Table
    doc.setFontSize(10);
    doc.text("DETALHAMENTO DE AVALIAÇÕES", 15, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [["Data", "Veículo", "Placa", "Avaliador", "Vendedor", "Avaliação", "Status Negoc."]],
      body: filtrado.map(a => [
        dataBR(a.data_avaliacao || a.created_at),
        `${a.marca} ${a.modelo}`,
        a.placa,
        a.created_by_name || "Não identificado",
        a.vendedor || "—",
        moeda(a.avaliacao),
        a.status_negociacao !== "Sem definição" ? a.status_negociacao : a.status
      ]),
      theme: "striped",
      headStyles: { fillColor: [31, 41, 55], fontSize: 7 },
      styles: { fontSize: 7 },
      margin: { left: 15, right: 15 }
    });

    doc.save(`relatorio-viva-${periodoCompleto.replace(/\s/g, "-")}.pdf`);
    toast.success("PDF gerado com sucesso");
  };

  const exportarCSV = () => {
    const csv = toCSV(
      filtrado.map((a) => ({
        numero: a.numero,
        data: dataBR(a.data_avaliacao || a.created_at),
        empresa: a.empresa,
        avaliador: a.created_by_name || "Não identificado",
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
        negociacao: a.status_negociacao,
        observacoes: a.observacoes,
      }))
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
          <p className="text-muted-foreground text-sm mt-1">
            Relatório referente a {mes === "todos" ? `ano de ${ano}` : `${MESES[mes-1].nome} de ${ano}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Settings className="h-4 w-4 mr-2" /> Personalizar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Exibir no Relatório</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Investido</span>
                  <Switch checked={showKPIs.investido} onCheckedChange={(v) => setShowKPIs({...showKPIs, investido: v})} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Conversão</span>
                  <Switch checked={showKPIs.conversao} onCheckedChange={(v) => setShowKPIs({...showKPIs, conversao: v})} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Gráficos</span>
                  <Switch checked={showKPIs.graficos} onCheckedChange={(v) => setShowKPIs({...showKPIs, graficos: v})} />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={exportarCSV} disabled={!filtrado.length}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button onClick={exportarPDF} disabled={!filtrado.length} className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Download className="h-4 w-4 mr-2" /> Gerar PDF Profissional
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
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
              <optgroup label="Avaliação">
                <SelectItem value="Em Avaliação">Em Avaliação</SelectItem>
                <SelectItem value="Avaliado">Avaliado</SelectItem>
              </optgroup>
              <optgroup label="Negociação">
                <SelectItem value="Em negociação">Em negociação</SelectItem>
                <SelectItem value="Comprado">Comprado</SelectItem>
                <SelectItem value="Não comprado">Não comprado</SelectItem>
                <SelectItem value="Arquivado">Arquivado</SelectItem>
              </optgroup>
            </SelectContent>
          </Select>
          <Select value={vendedor} onValueChange={setVendedor}>
            <SelectTrigger><SelectValue placeholder="Vendedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos vendedores</SelectItem>
              {listaVendedores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={avaliador} onValueChange={setAvaliador}>
            <SelectTrigger><SelectValue placeholder="Avaliador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos avaliadores</SelectItem>
              {listaAvaliadores.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={origem} onValueChange={setOrigem}>
            <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas origens</SelectItem>
              {ORIGENS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-center text-xs font-semibold bg-muted rounded-md px-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `${filtrado.length} reg.`}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={BarChart3} label="Avaliações" value={String(total)} />
        {showKPIs.conversao && <Kpi icon={Percent} label="Conversão" value={`${conversao}%`} tone="primary" />}
        {showKPIs.investido && <Kpi icon={Wallet} label="Investido" value={moeda(investido)} />}
        <Kpi icon={ShoppingCart} label="Comprados" value={String(comprados.length)} tone="success" />
      </div>

      {/* Charts */}
      {showKPIs.graficos && (
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
            <CardHeader className="pb-2"><CardTitle className="text-base">Status (Principal)</CardTitle></CardHeader>
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
      )}

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
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[a.status])}>{a.status}</Badge>
                        {a.status_negociacao !== "Sem definição" && (
                          <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[a.status_negociacao])}>{a.status_negociacao}</Badge>
                        )}
                      </div>
                    </td>
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
