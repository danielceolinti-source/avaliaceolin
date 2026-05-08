import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/store/app";
import { Activity, CalendarDays, CalendarRange, Car, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_COLORS, Status, MESES } from "@/data/constants";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import { Lock, FileDown, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { dataBR, moedaBR } from "@/lib/format";

const fmt = (n: number) => n.toLocaleString("pt-BR");
const moeda = moedaBR;

function Kpi({ icon: Icon, label, value, hint, accent }: any) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent ?? "bg-gradient-primary"}`} />
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 font-display text-3xl font-bold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { canViewDashboards, canCreateAssessment, loading: roleLoading } = useRole();
  const { empresaFiltro } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("avaliacoes").select("*").order("created_at", { ascending: false });
      setRows(data || []);
      setLoading(false);
    };
    load();
    // realtime: atualização automática das últimas avaliações
    const ch = supabase.channel("avaliacoes-dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "avaliacoes" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const data = useMemo(() => rows.filter((a) => empresaFiltro === "Todas" || a.empresa === empresaFiltro), [rows, empresaFiltro]);

  const startDay = new Date(); startDay.setHours(0, 0, 0, 0);
  const startWeek = new Date(); startWeek.setDate(startWeek.getDate() - 7);
  const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);

  const hoje = data.filter((d) => new Date(d.created_at) >= startDay).length;
  const semana = data.filter((d) => new Date(d.created_at) >= startWeek).length;
  const mes = data.filter((d) => new Date(d.created_at) >= startMonth).length;
  const comprados = data.filter((d) => d.status === "Comprado").length;

  const exportarPDF = (tipo: "hoje" | "mes") => {
    const start = new Date();
    if (tipo === "hoje") start.setHours(0, 0, 0, 0);
    else start.setDate(1); start.setHours(0, 0, 0, 0);
    
    const items = data.filter(d => new Date(d.created_at) >= start);
    if (!items.length) return toast.error("Nenhum dado para exportar");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(31, 41, 55); doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text("AVALIA CEOLIN", 15, 20);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`RELATÓRIO OPERACIONAL - ${tipo.toUpperCase()}`, 15, 30);
    doc.text(`EMPRESA: ${empresaFiltro.toUpperCase()}`, pageWidth - 15, 30, { align: "right" });

    autoTable(doc, {
      startY: 50,
      head: [["Data", "Veículo", "Placa", "Vendedor", "Avaliação", "Status"]],
      body: items.map(a => [
        dataBR(a.data_avaliacao || a.created_at),
        `${a.marca} ${a.modelo}`,
        a.placa,
        a.vendedor || "—",
        moeda(a.avaliacao),
        a.status
      ]),
      headStyles: { fillColor: [31, 41, 55] },
      styles: { fontSize: 8 }
    });

    doc.save(`dashboard-${tipo}-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF exportado");
  };

  if (loading || roleLoading) return <div className="py-20 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!canViewDashboards) {
    return (
      <div className="py-20 text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">Você não possui permissão para visualizar o dashboard operacional. Utilize a listagem de avaliações.</p>
        <Button asChild><Link to="/avaliacoes">Ir para Avaliações</Link></Button>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Visão geral</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Dashboard Operacional</h1>
          <p className="text-muted-foreground text-sm mt-1">Volume de avaliações, produtividade e desempenho por empresa.</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg">
                <FileDown className="h-4 w-4 mr-2" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Relatório Rápido</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportarPDF("hoje")}>
                <Download className="h-4 w-4 mr-2" /> Avaliações do dia
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportarPDF("mes")}>
                <Download className="h-4 w-4 mr-2" /> Avaliações do mês
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/relatorios">Relatórios completos</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {canCreateAssessment && (
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Link to="/nova">+ Nova Avaliação</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Activity} label="Avaliações hoje" value={fmt(hoje)} />
        <Kpi icon={CalendarDays} label="Últimos 7 dias" value={fmt(semana)} accent="bg-info" />
        <Kpi icon={CalendarRange} label="No mês" value={fmt(mes)} accent="bg-warning" />
        <Kpi icon={Car} label="Comprados" value={fmt(comprados)} hint={`${data.length ? Math.round((comprados / data.length) * 100) : 0}% do total`} accent="bg-success" />
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Últimas avaliações</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Top 10 · atualização em tempo real · UTC-3</p>
          </div>
          <Button asChild variant="ghost" size="sm"><Link to="/avaliacoes">Ver todas →</Link></Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : data.length === 0 ? (
            <div className="py-16 text-center">
              <Car className="h-10 w-10 text-muted-foreground mx-auto" />
              <div className="font-display text-lg font-semibold mt-3">Comece sua primeira avaliação</div>
              <p className="text-sm text-muted-foreground mt-1">O dashboard ganha vida assim que houver dados reais.</p>
              {canCreateAssessment && (
                <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground shadow-glow">
                  <Link to="/nova">+ Nova Avaliação</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-left px-3 py-2">Veículo</th>
                    <th className="text-left px-3 py-2">Placa</th>
                    <th className="text-left px-3 py-2 hidden md:table-cell">Vendedor</th>
                    <th className="text-left px-3 py-2 hidden lg:table-cell">Cliente</th>
                    <th className="text-left px-3 py-2 hidden lg:table-cell">Origem</th>
                    <th className="text-left px-3 py-2 hidden md:table-cell">Empresa</th>
                    <th className="text-right px-3 py-2 hidden md:table-cell">FIPE</th>
                    <th className="text-right px-3 py-2">Avaliação</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((a) => (
                    <tr key={a.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => window.location.assign(`/avaliacoes/${a.id}`)}>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{dataBR(a.data_avaliacao || a.created_at)}</td>
                      <td className="px-3 py-2.5"><div className="font-medium truncate max-w-[180px]">{a.marca} {a.modelo}</div><div className="text-xs text-muted-foreground">{a.ano}</div></td>
                      <td className="px-3 py-2.5 font-mono text-xs">{a.placa}</td>
                      <td className="px-3 py-2.5 hidden md:table-cell">{a.vendedor || "—"}</td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground">{a.cliente || "—"}</td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground">{a.origem || "—"}</td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-xs">{a.empresa}</td>
                      <td className="px-3 py-2.5 text-right font-mono hidden md:table-cell text-muted-foreground">{moeda(a.fipe || 0)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{moeda(a.avaliacao || 0)}</td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className={STATUS_COLORS[a.status as Status]}>{a.status}</Badge></td>
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
