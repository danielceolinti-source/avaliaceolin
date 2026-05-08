import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/store/app";
import { Activity, CalendarDays, CalendarRange, Car, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, Status } from "@/data/constants";

import { dataBR, moedaBR as moeda } from "@/lib/format";

const fmt = (n: number) => n.toLocaleString("pt-BR");

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Visão geral</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Dashboard Operacional</h1>
          <p className="text-muted-foreground text-sm mt-1">Volume de avaliações, produtividade e desempenho por empresa.</p>
        </div>
        <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Link to="/nova">+ Nova Avaliação</Link>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Activity} label="Avaliações hoje" value={fmt(hoje)} />
        <Kpi icon={CalendarDays} label="Últimos 7 dias" value={fmt(semana)} accent="bg-info" />
        <Kpi icon={CalendarRange} label="No mês" value={fmt(mes)} accent="bg-warning" />
        <Kpi icon={Car} label="Comprados" value={fmt(comprados)} hint={`${data.length ? Math.round((comprados / data.length) * 100) : 0}% do total`} accent="bg-success" />
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Avaliações recentes</CardTitle>
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
              <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground shadow-glow">
                <Link to="/nova">+ Nova Avaliação</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Veículo</th>
                    <th className="text-left px-4 py-2">Placa</th>
                    <th className="text-left px-4 py-2 hidden md:table-cell">Empresa</th>
                    <th className="text-left px-4 py-2 hidden md:table-cell">Vendedor</th>
                    <th className="text-right px-4 py-2">Avaliação</th>
                    <th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 8).map((a) => (
                    <tr key={a.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3"><div className="font-medium">{a.marca} {a.modelo}</div><div className="text-xs text-muted-foreground">{a.ano}</div></td>
                      <td className="px-4 py-3 font-mono text-xs">{a.placa}</td>
                      <td className="px-4 py-3 hidden md:table-cell">{a.empresa}</td>
                      <td className="px-4 py-3 hidden md:table-cell">{a.vendedor}</td>
                      <td className="px-4 py-3 text-right font-mono">{moeda(a.avaliacao || 0)}</td>
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
