import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Car, TrendingDown, Wallet, Hash, Download } from "lucide-react";

const moeda = (n: number | null) => (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Comprados() {
  const { empresaFiltro } = useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("avaliacoes").select("*").eq("status", "Comprado").order("updated_at", { ascending: false });
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => rows.filter((a) => {
    if (empresaFiltro !== "Todas" && a.empresa !== empresaFiltro) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return [a.placa, a.modelo, a.marca, a.vendedor].some((v) => v?.toLowerCase().includes(t));
  }), [rows, empresaFiltro, q]);

  const totalAvaliacao = filtered.reduce((s, a) => s + (Number(a.avaliacao) || 0), 0);
  const totalFipe = filtered.reduce((s, a) => s + (Number(a.fipe) || 0), 0);
  const economia = totalFipe - totalAvaliacao;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Veículos Comprados</h1>
          <p className="text-muted-foreground text-sm mt-1">Estoque adquirido pelo grupo</p>
        </div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Exportar</Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Kpi icon={Hash} label="Veículos" value={String(filtered.length)} tone="primary" />
        <Kpi icon={Wallet} label="Investido" value={moeda(totalAvaliacao)} />
        <Kpi icon={Car} label="FIPE total" value={moeda(totalFipe)} />
        <Kpi icon={TrendingDown} label="Economia vs FIPE" value={moeda(economia)} tone="success" />
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Placa, modelo, vendedor…" className="pl-9" />
          </div>
        </CardContent>
      </Card>

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
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Vendedor</th>
                    <th className="text-right px-4 py-3">FIPE</th>
                    <th className="text-right px-4 py-3">Comprado por</th>
                    <th className="text-right px-4 py-3 hidden md:table-cell">Economia</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const eco = (Number(a.fipe) || 0) - (Number(a.avaliacao) || 0);
                    return (
                      <tr key={a.id} onClick={() => navigate(`/avaliacoes/${a.id}`)} className="border-t hover:bg-muted/30 cursor-pointer">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{a.numero}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{a.marca} {a.modelo}</div>
                          <div className="text-xs text-muted-foreground">{a.ano} {a.km ? `• ${a.km.toLocaleString("pt-BR")} km` : ""}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">{a.placa}</td>
                        <td className="px-4 py-3 hidden md:table-cell">{a.empresa}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">{a.vendedor}</td>
                        <td className="px-4 py-3 text-right font-mono">{moeda(a.fipe)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-primary">{moeda(a.avaliacao)}</td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-mono">{moeda(eco)}</Badge>
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

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: "primary" | "success" }) {
  const cls = tone === "primary" ? "text-primary" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${cls}`} />
      </CardHeader>
      <CardContent className={`text-2xl font-display font-bold ${cls}`}>{value}</CardContent>
    </Card>
  );
}
