import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Camera, ScanLine, Sparkles, Save, Send, Car, ChevronRight,
  Wrench, ImagePlus, FileCheck2,
} from "lucide-react";
import {
  EMPRESAS, ESTADO_GERAL, HISTORICO_OPCOES, NIVEL_AVARIAS,
  OPCIONAIS, ORIGENS, VENDEDORES, Empresa,
} from "@/data/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const moeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Chip({ active, onClick, children, tone = "default" }: any) {
  const tones: Record<string, string> = {
    default: "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:border-primary",
    success: "data-[active=true]:bg-success data-[active=true]:text-success-foreground data-[active=true]:border-success",
    warn: "data-[active=true]:bg-warning data-[active=true]:text-warning-foreground data-[active=true]:border-warning",
    danger: "data-[active=true]:bg-destructive data-[active=true]:text-destructive-foreground data-[active=true]:border-destructive",
    info: "data-[active=true]:bg-info data-[active=true]:text-info-foreground data-[active=true]:border-info",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className={cn(
        "h-10 px-4 rounded-full border bg-card text-sm font-medium transition-all",
        "hover:border-primary/40",
        tones[tone]
      )}
    >
      {children}
    </button>
  );
}

const ESTADO_TONE: Record<string, string> = {
  Excelente: "success", "Muito Bom": "success", Bom: "info", Regular: "warn", Ruim: "danger",
};
const AVARIA_TONE: Record<string, string> = {
  "Sem avarias": "success", Leve: "info", Moderado: "warn", Alto: "danger", Grave: "danger",
};

export default function NovaAvaliacao() {
  const [empresa, setEmpresa] = useState<Empresa>("Ceolin");
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [km, setKm] = useState("");
  const [fipe, setFipe] = useState(0);
  const [custo, setCusto] = useState(0);
  const [aval, setAval] = useState(0);
  const [vendedor, setVendedor] = useState("");
  const [origem, setOrigem] = useState("");
  const [estado, setEstado] = useState("");
  const [nivel, setNivel] = useState("");
  const [historico, setHistorico] = useState<string[]>([]);
  const [opcionais, setOpcionais] = useState<string[]>([]);
  const [obs, setObs] = useState("");
  const [scanning, setScanning] = useState(false);

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const fakeScan = () => {
    setScanning(true);
    setTimeout(() => {
      setPlaca("ABC1D23");
      setMarca("Fiat");
      setModelo("Pulse Drive 1.3");
      setAno("2023/2024");
      setKm("28450");
      setFipe(89500);
      setCusto(2500);
      setAval(78000);
      setScanning(false);
      toast.success("Placa identificada via Gemini Vision", { description: "Dados FIPE preenchidos automaticamente." });
    }, 1300);
  };

  const salvar = () => toast.success("Rascunho salvo", { description: "Disponível offline." });
  const finalizar = () => toast.success("Avaliação finalizada", { description: `${marca || "Veículo"} ${modelo || ""}` });

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Avaliações</span><ChevronRight className="h-3 w-3" /><span className="text-foreground font-medium">Nova</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Nova Avaliação</h1>
          <p className="text-muted-foreground text-sm mt-1">Fluxo otimizado para uso no pátio — finalize em menos de 1 minuto.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={salvar}><Save className="h-4 w-4 mr-2" /> Salvar rascunho</Button>
          <Button onClick={finalizar} className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Send className="h-4 w-4 mr-2" /> Finalizar
          </Button>
        </div>
      </div>

      {/* IDENTIFICAÇÃO */}
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-hero text-white p-5 md:p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
            <Sparkles className="h-3 w-3" /> Identificação inteligente
          </div>
          <div className="mt-2 grid md:grid-cols-[1fr_auto] gap-4 items-end">
            <div>
              <Label className="text-white/80">Placa ou Chassi</Label>
              <Input
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC1D23"
                className="mt-2 h-14 text-2xl font-mono font-bold tracking-widest bg-white/10 border-white/20 text-white placeholder:text-white/40 uppercase"
              />
            </div>
            <div className="flex gap-2">
              <Button size="lg" variant="secondary" onClick={fakeScan} disabled={scanning} className="h-14">
                <Camera className="h-5 w-5 mr-2" />
                {scanning ? "Lendo..." : "Foto"}
              </Button>
              <Button size="lg" onClick={fakeScan} disabled={scanning} className="h-14 bg-primary hover:bg-primary/90">
                <ScanLine className="h-5 w-5 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/60">Usa Gemini 1.5 Flash Vision para OCR + consulta FIPE automática.</p>
        </div>

        <CardContent className="p-5 md:p-6 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><Label>Marca</Label><Input value={marca} onChange={(e) => setMarca(e.target.value)} className="mt-1.5" /></div>
          <div className="lg:col-span-2"><Label>Modelo / Versão</Label><Input value={modelo} onChange={(e) => setModelo(e.target.value)} className="mt-1.5" /></div>
          <div><Label>Ano/Modelo</Label><Input value={ano} onChange={(e) => setAno(e.target.value)} className="mt-1.5" /></div>
          <div><Label>Quilometragem</Label><Input value={km} onChange={(e) => setKm(e.target.value)} className="mt-1.5" /></div>
          <div>
            <Label>FIPE</Label>
            <Input type="number" value={fipe || ""} onChange={(e) => setFipe(+e.target.value)} className="mt-1.5 font-mono" />
            {fipe > 0 && <div className="text-xs text-muted-foreground mt-1">{moeda(fipe)}</div>}
          </div>
          <div>
            <Label>Custo estimado</Label>
            <Input type="number" value={custo || ""} onChange={(e) => setCusto(+e.target.value)} className="mt-1.5 font-mono" />
            {custo > 0 && <div className="text-xs text-muted-foreground mt-1">{moeda(custo)}</div>}
          </div>
          <div>
            <Label className="text-primary">Avaliação de compra</Label>
            <Input type="number" value={aval || ""} onChange={(e) => setAval(+e.target.value)} className="mt-1.5 font-mono border-primary/40 focus-visible:ring-primary" />
            {aval > 0 && <div className="text-xs font-semibold text-primary mt-1">{moeda(aval)}</div>}
          </div>
        </CardContent>
      </Card>

      {/* CLASSIFICAÇÃO COMERCIAL */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Empresa</CardTitle></CardHeader>
          <CardContent>
            <Select value={empresa} onValueChange={(v) => { setEmpresa(v as Empresa); setVendedor(""); }}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EMPRESAS.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Vendedor</CardTitle></CardHeader>
          <CardContent>
            <Select value={vendedor} onValueChange={setVendedor}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {VENDEDORES[empresa].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Origem</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {ORIGENS.map((o) => (
                <Chip key={o} active={origem === o} onClick={() => setOrigem(o)} tone="info">{o}</Chip>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ESTADO E AVARIAS */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Estado geral</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ESTADO_GERAL.map((e) => (
              <Chip key={e} active={estado === e} onClick={() => setEstado(e)} tone={ESTADO_TONE[e]}>{e}</Chip>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Nível de avarias</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {NIVEL_AVARIAS.map((e) => (
              <Chip key={e} active={nivel === e} onClick={() => setNivel(e)} tone={AVARIA_TONE[e]}>{e}</Chip>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* HISTÓRICO E OPCIONAIS */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileCheck2 className="h-4 w-4" /> Histórico do veículo</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {HISTORICO_OPCOES.map((h) => (
              <Chip key={h} active={historico.includes(h)} onClick={() => toggle(historico, setHistorico, h)} tone="success">{h}</Chip>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Opcionais</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {OPCIONAIS.map((o) => (
              <Chip key={o} active={opcionais.includes(o)} onClick={() => toggle(opcionais, setOpcionais, o)}>{o}</Chip>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* DIAGRAMA AVARIAS */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Car className="h-4 w-4" /> Diagrama de avarias</CardTitle>
          <Badge variant="outline">Toque nas peças</Badge>
        </CardHeader>
        <CardContent>
          <CarDiagram />
        </CardContent>
      </Card>

      {/* FOTOS */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ImagePlus className="h-4 w-4" /> Fotos & anexos</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors grid place-items-center text-muted-foreground">
                <Camera className="h-6 w-6" />
              </button>
            ))}
            <button className="aspect-square rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center font-medium text-sm shadow-glow">
              <ImagePlus className="h-6 w-6" />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Observações</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={4} placeholder="Notas livres do avaliador…" />
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse md:flex-row gap-3 justify-end sticky bottom-3 z-20">
        <Button variant="outline" onClick={salvar} className="h-12"><Save className="h-4 w-4 mr-2" /> Salvar rascunho</Button>
        <Button onClick={finalizar} className="h-12 bg-gradient-primary text-primary-foreground shadow-glow">
          <Send className="h-4 w-4 mr-2" /> Finalizar avaliação
        </Button>
      </div>
    </div>
  );
}

function CarDiagram() {
  const parts = [
    { id: "capo", label: "Capô", x: 35, y: 18, w: 30, h: 18 },
    { id: "teto", label: "Teto", x: 35, y: 38, w: 30, h: 22 },
    { id: "porta-malas", label: "Tampa traseira", x: 35, y: 62, w: 30, h: 16 },
    { id: "para-front", label: "Para-choque dianteiro", x: 32, y: 8, w: 36, h: 8 },
    { id: "para-tras", label: "Para-choque traseiro", x: 32, y: 80, w: 36, h: 8 },
    { id: "porta-de", label: "Porta DE", x: 18, y: 38, w: 15, h: 22 },
    { id: "porta-dd", label: "Porta DD", x: 67, y: 38, w: 15, h: 22 },
    { id: "paralama-de", label: "Paralama DE", x: 18, y: 18, w: 15, h: 18 },
    { id: "paralama-dd", label: "Paralama DD", x: 67, y: 18, w: 15, h: 18 },
    { id: "lateral-te", label: "Lateral TE", x: 18, y: 62, w: 15, h: 16 },
    { id: "lateral-td", label: "Lateral TD", x: 67, y: 62, w: 15, h: 16 },
  ];
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="grid md:grid-cols-[1fr_240px] gap-5 items-start">
      <div className="relative aspect-[3/5] max-w-[300px] mx-auto bg-muted/30 rounded-2xl border-2 border-border overflow-hidden">
        {parts.map((p) => {
          const active = sel.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              title={p.label}
              className={cn(
                "absolute rounded-md transition-all border-2",
                active ? "bg-destructive/70 border-destructive" : "bg-card/90 border-border hover:border-primary"
              )}
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%` }}
            />
          );
        })}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Peças marcadas</div>
        {sel.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">Nenhuma avaria marcada</div>
        ) : (
          <div className="space-y-1.5">
            {sel.map((id) => {
              const p = parts.find((x) => x.id === id)!;
              return (
                <div key={id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                  <span>{p.label}</span>
                  <button className="text-xs text-destructive" onClick={() => toggle(id)}>Remover</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
