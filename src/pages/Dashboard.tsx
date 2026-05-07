import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_AVALIACOES } from "@/data/mock";
import { useApp } from "@/store/app";
import {
  Activity, CalendarDays, CalendarRange, Car, ClipboardCheck,
  TrendingUp, Users, Building2, Phone,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/data/constants";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const fmt = (n: number) => n.toLocaleString("pt-BR");
const moeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

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
  const data = useMemo(
    () => MOCK_AVALIACOES.filter((a) => empresaFiltro === "Todas" || a.empresa === empresaFiltro),
    [empresaFiltro]
  );

  const hoje = data.length > 0 ? Math.max(3, Math.floor(data.length * 0.08)) : 0;
  const semana = Math.floor(data.length * 0.32);
  const mes = data.length;
  const comprados = data.filter((d) => d.status === "Comprado").length;

  const porAvaliador = ["Andre", "Adelmo"].map((a) => ({
    name: a, total: data.filter((d) => d.avaliador === a).length,
  }));

  const porOrigem = [
    { name: "WhatsApp", value: data.filter((d) => d.origem === "WhatsApp").length },
    { name: "Presencial", value: data.filter((d) => d.origem === "Presencial").length },
  ];

  const ultimos14 = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      avaliações: 2 + Math.round(Math.random() * 9),
      comprados: Math.round(Math.random() * 4),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Visão geral</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Dashboard Operacional</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Volume de avaliações, produtividade e desempenho por empresa.
          </p>
        </div>
        <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Link to="/nova">+ Nova Avaliação</Link>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Activity} label="Avaliações hoje" value={fmt(hoje)} hint="vs. ontem +12%" />
        <Kpi icon={CalendarDays} label="Esta semana" value={fmt(semana)} hint="meta: 60" accent="bg-info" />
        <Kpi icon={CalendarRange} label="No mês" value={fmt(mes)} hint="acumulado" accent="bg-warning" />
        <Kpi icon={Car} label="Comprados" value={fmt(comprados)} hint={`${Math.round((comprados / Math.max(mes, 1)) * 100)}% do total`} accent="bg-success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Volume — últimos 14 dias</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ultimos14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="avaliações" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="comprados" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" /> Por Origem</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porOrigem} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--info))" />
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Avaliadores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {porAvaliador.map((a, i) => {
              const pct = (a.total / Math.max(data.length, 1)) * 100;
              return (
                <div key={a.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-muted-foreground">{a.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${i === 0 ? "bg-gradient-primary" : "bg-info"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Por Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["Ceolin", "Viva"] as const).map((e, i) => {
              const total = MOCK_AVALIACOES.filter((d) => d.empresa === e).length;
              const pct = (total / MOCK_AVALIACOES.length) * 100;
              return (
                <div key={e}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{e === "Ceolin" ? "Ceolin Automóveis" : "Viva Automóveis"}</span>
                    <span className="text-muted-foreground">{total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: i === 0 ? "hsl(var(--primary))" : "hsl(45 70% 50%)" }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Volume financeiro (mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold">{moeda(data.reduce((s, d) => s + d.avaliacao, 0))}</div>
            <div className="text-xs text-muted-foreground mt-1">soma das avaliações de compra</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">FIPE total</div>
                <div className="font-semibold mt-1">{moeda(data.reduce((s, d) => s + d.fipe, 0))}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Custo estimado</div>
                <div className="font-semibold mt-1">{moeda(data.reduce((s, d) => s + d.custo, 0))}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Avaliações recentes</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link to="/avaliacoes">Ver todas →</Link></Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Veículo</th>
                  <th className="text-left px-4 py-2">Placa</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Empresa</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Vendedor</th>
                  <th className="text-left px-4 py-2 hidden lg:table-cell">Origem</th>
                  <th className="text-right px-4 py-2">Avaliação</th>
                  <th className="text-left px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 8).map((a) => (
                  <tr key={a.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.marca} {a.modelo}</div>
                      <div className="text-xs text-muted-foreground">{a.versao} • {a.ano}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{a.placa}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{a.empresa}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{a.vendedor}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">{a.origem}</td>
                    <td className="px-4 py-3 text-right font-mono">{moeda(a.avaliacao)}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={STATUS_COLORS[a.status]}>{a.status}</Badge></td>
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
