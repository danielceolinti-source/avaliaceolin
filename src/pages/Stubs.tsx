import { Car, BarChart3, Users, FileSearch, Shield, Settings } from "lucide-react";
import { PageStub } from "@/components/PageStub";
import { MOCK_AVALIACOES } from "@/data/mock";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/store/app";

const moeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function Comprados() {
  const { empresaFiltro } = useApp();
  const data = MOCK_AVALIACOES.filter((a) => a.status === "Comprado" && (empresaFiltro === "Todas" || a.empresa === empresaFiltro));
  return (
    <PageStub title="Veículos Comprados" description={`${data.length} veículos adquiridos`} icon={Car}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((a) => (
          <Card key={a.id} className="overflow-hidden hover:shadow-elegant transition-shadow">
            <div className="h-1 bg-gradient-primary" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display font-bold text-lg">{a.marca} {a.modelo}</div>
                  <div className="text-xs text-muted-foreground">{a.versao}</div>
                </div>
                <Badge variant="outline" className="bg-success/15 text-success border-success/30">Comprado</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><div className="text-xs text-muted-foreground">Placa</div><div className="font-mono">{a.placa}</div></div>
                <div><div className="text-xs text-muted-foreground">Ano</div><div>{a.ano}</div></div>
                <div><div className="text-xs text-muted-foreground">Vendedor</div><div>{a.vendedor}</div></div>
                <div><div className="text-xs text-muted-foreground">Avaliador</div><div>{a.avaliador}</div></div>
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between items-baseline">
                <div className="text-xs text-muted-foreground">Compra</div>
                <div className="font-mono font-bold text-primary">{moeda(a.avaliacao)}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageStub>
  );
}

export function Relatorios() { return <PageStub title="Relatórios" description="Exporte PDF, Excel e compartilhe via WhatsApp" icon={BarChart3} />; }
export function Usuarios() { return <PageStub title="Usuários & Permissões" description="Avaliadores, Gestores, T.I e Super Admin" icon={Users} />; }
export function Auditoria() { return <PageStub title="Auditoria" description="Histórico completo de ações" icon={FileSearch} />; }
export function Logs() { return <PageStub title="Logs do Sistema" description="Eventos críticos e operacionais" icon={Shield} />; }
export function Configuracoes() { return <PageStub title="Configurações" description="Tema, integrações, sincronização e backups" icon={Settings} />; }
