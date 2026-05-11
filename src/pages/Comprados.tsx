import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Car, TrendingDown, Wallet, Hash, Download } from "lucide-react";
import { downloadCSV, toCSV } from "@/lib/csv";
import { dataBR } from "@/lib/format";

const moeda = (n: number | null) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Comprados() {
  const { empresaFiltro } = useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [allRows, setAllRows] = useState<any[]>([]); // Para calcular conversão
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Buscamos todas as avaliações para calcular conversão e métricas temporais
      const { data: allData } = await supabase.from("avaliacoes").select("*").order("data_avaliacao", { ascending: false });
      setAllRows(allData || []);
      setRows((allData || []).filter(a => a.status_negociacao === "Comprado"));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => rows.filter((a) => {
    if (empresaFiltro !== "Todas" && a.empresa !== empresaFiltro) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return [a.placa, a.modelo, a.marca, a.vendedor].some((v) => v?.toLowerCase().includes(t));
  }), [rows, empresaFiltro, q]);

  // Cálculos Estratégicos
  const stats = useMemo(() => {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    // Filtramos o pool de todas as avaliações pela empresa selecionada para métricas globais
    const poolEmpresa = allRows.filter(a => empresaFiltro === "Todas" || a.empresa === empresaFiltro);
    
    // Compras no mês atual
    const comprasMesAtual = poolEmpresa.filter(a => {
      if (a.status_negociacao !== "Comprado") return false;
      const d = new Date(a.updated_at || a.created_at);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });

    // Compras no mês anterior
    const comprasMesAnterior = poolEmpresa.filter(a => {
      if (a.status_negociacao !== "Comprado") return false;
      const d = new Date(a.updated_at || a.created_at);
      return d.getMonth() === mesAnterior && d.getFullYear() === anoAnterior;
    });

    // Taxa de Conversão (Total Comprado / Total Avaliado)
    const totalComprados = poolEmpresa.filter(a => a.status_negociacao === "Comprado").length;
    const totalAvaliacoes = poolEmpresa.length;
    const conversao = totalAvaliacoes ? (totalComprados / totalAvaliacoes) * 100 : 0;

    // Compras por empresa
    const porEmpresa: Record<string, number> = {};
    poolEmpresa.forEach(a => {
      if (a.status_negociacao === "Comprado") {
        porEmpresa[a.empresa] = (porEmpresa[a.empresa] || 0) + 1;
      }
    });
    const listaPorEmpresa = Object.entries(porEmpresa)
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd);

    // Comparação %
    let diffPercent = 0;
    if (comprasMesAnterior.length > 0) {
      diffPercent = ((comprasMesAtual.length - comprasMesAnterior.length) / comprasMesAnterior.length) * 100;
    } else if (comprasMesAtual.length > 0) {
      diffPercent = 100;
    }

    return {
      comprasMesAtual: comprasMesAtual.length,
      diffPercent,
      conversao,
      listaPorEmpresa
    };
  }, [allRows, empresaFiltro]);

  const mesNome = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][new Date().getMonth()];

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Veículos Comprados</h1>
          <p className="text-muted-foreground text-sm mt-1">Estoque adquirido pelo grupo</p>
        </div>
        <Button variant="outline" disabled={!filtered.length} onClick={() => {
          const csv = toCSV(filtered.map((a) => ({
            numero: a.numero, data: dataBR(a.data_avaliacao || a.created_at), empresa: a.empresa,
            vendedor: a.vendedor, placa: a.placa, marca: a.marca, modelo: a.modelo, ano: a.ano, km: a.km,
            fipe: a.fipe, avaliacao: a.avaliacao, economia: (Number(a.fipe) || 0) - (Number(a.avaliacao) || 0),
          })));
          downloadCSV(`comprados-${new Date().toISOString().slice(0, 10)}.csv`, csv);
        }}><Download className="h-4 w-4 mr-2" /> Exportar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi 
          icon={Car} 
          label={`Compras em ${mesNome}`} 
          value={`${stats.comprasMesAtual} unidades`}
          hint={stats.diffPercent !== 0 ? `${stats.diffPercent > 0 ? "+" : ""}${stats.diffPercent.toFixed(1)}% vs mês anterior` : "Mesmo volume que o mês anterior"}
          hintColor={stats.diffPercent >= 0 ? "text-success" : "text-destructive"}
          tone="primary" 
        />
        <Kpi 
          icon={TrendingDown} 
          label="Taxa de Conversão" 
          value={`${stats.conversao.toFixed(1)}%`}
          hint="Avaliações → Compras"
          tone="success" 
        />
        <Kpi 
          icon={Wallet} 
          label="Investimento Acumulado" 
          value={moeda(filtered.reduce((s, a) => s + (Number(a.avaliacao) || 0), 0))} 
          hint={`${filtered.length} veículos comprados`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar placa, modelo, vendedor ou marca…" className="pl-9" />
              </div>
            </CardContent>
          </Card>
        </div>

        {empresaFiltro === "Todas" && (
          <Card className="lg:row-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Compras por Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.listaPorEmpresa.map((item) => {
                const max = stats.listaPorEmpresa[0]?.qtd || 1;
                const perc = (item.qtd / max) * 100;
                return (
                  <div key={item.nome} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.nome}</span>
                      <span className="font-bold text-primary">{item.qtd}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000 ease-out" 
                        style={{ width: `${perc}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.listaPorEmpresa.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum dado por empresa</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className={empresaFiltro === "Todas" ? "lg:col-span-2" : "lg:col-span-3"}>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-16 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <Car className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <div className="font-display text-lg font-semibold">Nenhum veículo comprado</div>
                  <p className="text-sm text-muted-foreground mt-1">Marque uma avaliação como "Comprado" para ela aparecer aqui.</p>
                  <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground shadow-glow">
                    <Link to="/avaliacoes">Ver avaliações</Link>
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
                        <th className="text-right px-4 py-3">Comprado por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a) => {
                        return (
                          <tr key={a.id} onClick={() => navigate(`/avaliacoes/${a.id}`)} className="border-t hover:bg-muted/30 cursor-pointer">
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{a.numero}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-xs md:text-sm">{a.marca} {a.modelo}</div>
                              <div className="text-[10px] md:text-xs text-muted-foreground">{a.ano} {a.km ? `• ${a.km.toLocaleString("pt-BR")} km` : ""}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{a.placa}</td>
                            <td className="px-4 py-3 hidden md:table-cell text-xs">{a.empresa}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-primary">{moeda(a.avaliacao)}</td>
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
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, hintColor, tone }: { icon: any; label: string; value: string; hint?: string; hintColor?: string; tone?: "primary" | "success" }) {
  const cls = tone === "primary" ? "text-primary" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</CardTitle>
          <div className={`p-2 rounded-lg bg-muted/50 ${cls}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className={`text-2xl font-display font-bold ${cls}`}>{value}</div>
        {hint && (
          <div className={`text-[10px] font-medium mt-1.5 flex items-center gap-1 ${hintColor || "text-muted-foreground"}`}>
            {hint}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
