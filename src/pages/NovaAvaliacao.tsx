import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Camera, ScanLine, Sparkles, Save, Send, Car, ChevronRight,
  Wrench, ImagePlus, FileCheck2, Loader2, User, Calendar,
} from "lucide-react";
import {
  EMPRESAS, ESTADO_GERAL, HISTORICO_OPCOES, NIVEL_AVARIAS,
  OPCIONAIS, ORIGENS, Empresa, MODALIDADES, TAGS_OBS,
} from "@/data/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVendedores } from "@/hooks/useVendedores";
import { hojeBR, moedaBR as moeda } from "@/lib/format";
import FipePicker from "@/components/FipePicker";

function Chip({ active, onClick, children, tone = "default" }: any) {
  const tones: Record<string, string> = {
    default: "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:border-primary",
    success: "data-[active=true]:bg-success data-[active=true]:text-success-foreground data-[active=true]:border-success",
    warn: "data-[active=true]:bg-warning data-[active=true]:text-warning-foreground data-[active=true]:border-warning",
    danger: "data-[active=true]:bg-destructive data-[active=true]:text-destructive-foreground data-[active=true]:border-destructive",
    info: "data-[active=true]:bg-info data-[active=true]:text-info-foreground data-[active=true]:border-info",
  };
  return (
    <button type="button" onClick={onClick} data-active={active}
      className={cn("h-10 px-4 rounded-full border bg-card text-sm font-medium transition-all hover:border-primary/40", tones[tone])}
    >{children}</button>
  );
}

const ESTADO_TONE: Record<string, string> = { Excelente: "success", "Muito Bom": "success", Bom: "info", Regular: "warn", Ruim: "danger" };
const AVARIA_TONE: Record<string, string> = { "Sem avarias": "success", Leve: "info", Moderado: "warn", Alto: "danger", Grave: "danger" };

const fileToBase64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onerror = () => rej(r.error);
  r.onload = () => res(r.result as string);
  r.readAsDataURL(f);
});

export default function NovaAvaliacao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [empresa, setEmpresa] = useState<Empresa>("Ceolin");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [cliente, setCliente] = useState("");
  const [placa, setPlaca] = useState("");
  const [chassi, setChassi] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [km, setKm] = useState("");
  const [fipe, setFipe] = useState(0);
  const [custo, setCusto] = useState(0);
  const [aval, setAval] = useState(0);
  const [vendedor, setVendedor] = useState("");
  const [origem, setOrigem] = useState("");
  const [modalidade, setModalidade] = useState<"PRESENCIAL" | "FOTOS">("PRESENCIAL");
  const [estado, setEstado] = useState("");
  const [nivel, setNivel] = useState("");
  const [historico, setHistorico] = useState<string[]>([]);
  const [opcionais, setOpcionais] = useState<string[]>([]);
  const [obs, setObs] = useState("");
  const [tagsObs, setTagsObs] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avariasPecas, setAvariasPecas] = useState<string[]>([]);
  const [fipeOpen, setFipeOpen] = useState(false);

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const onPickPhoto = () => fileRef.current?.click();

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setScanning(true);
    try {
      const b64 = await fileToBase64(f);
      const { data, error } = await supabase.functions.invoke("ocr-placa", { body: { imageBase64: b64 } });
      if (error) throw error;
      if (data?.placa) {
        setPlaca(data.placa);
        if (data.vehicle) {
          if (data.vehicle.marca) setMarca(data.vehicle.marca);
          if (data.vehicle.modelo) setModelo([data.vehicle.modelo, data.vehicle.versao].filter(Boolean).join(" ").trim());
          if (data.vehicle.ano) setAno(data.vehicle.ano);
          toast.success("Veículo identificado", { description: `${data.placa} • ${data.vehicle.marca} ${data.vehicle.modelo}` });
          // sugere abrir FIPE encadeado para travar valor
          setFipeOpen(true);
        } else {
          toast.success("Placa identificada", { description: data.placa });
          setFipeOpen(true);
        }
      } else {
        toast.warning(data?.message || "Não consegui ler a placa");
      }
    } catch (err: any) {
      toast.error("Falha no OCR", { description: err.message });
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  };

  const onResolveFipe = (d: { marca: string; modelo: string; versao?: string; ano: string; fipe: number }) => {
    if (d.marca && !marca) setMarca(d.marca);
    if (d.versao && !modelo) setModelo(d.versao);
    if (d.ano && !ano) setAno(d.ano);
    setFipe(d.fipe);
    setAval(Math.round(d.fipe * 0.85));
    setFipeOpen(false);
  };

  const salvar = async (status: "Em Avaliação" | "Finalizada") => {
    if (!user) return toast.error("Sessão expirada");
    if (!placa.trim()) return toast.warning("Placa é obrigatória");
    setSaving(true);
    const { error } = await supabase.from("avaliacoes").insert({
      empresa, placa: placa.toUpperCase(), chassi: chassi || null,
      cliente: cliente || null, modalidade, data_avaliacao: data,
      marca, modelo, ano, km: km ? Number(km) : null,
      fipe: fipe || null, custo: custo || null, avaliacao: aval || null,
      vendedor, origem: (origem as any) || null, status,
      estado_geral: estado || null, nivel_avarias: nivel || null,
      historico, opcionais, avarias: avariasPecas.map((p) => ({ peca: p })),
      tags_obs: tagsObs, observacoes: obs || null,
      created_by: user.id, updated_by: user.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(status === "Finalizada" ? "Avaliação finalizada" : "Rascunho salvo");
    navigate("/avaliacoes");
  };

  return (
    <div className="space-y-5 pb-12">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handlePhoto} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Avaliações</span><ChevronRight className="h-3 w-3" /><span className="text-foreground font-medium">Nova</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Nova Avaliação</h1>
          <p className="text-muted-foreground text-sm mt-1">Foto da placa preenche placa, marca, modelo, ano, cor e combustível automaticamente.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => salvar("Em Avaliação")} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Salvar rascunho
          </Button>
          <Button onClick={() => salvar("Finalizada")} disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} Finalizar
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-hero text-white p-5 md:p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
            <Sparkles className="h-3 w-3" /> Identificação automática · SimplesAPI + FIPE.Online
          </div>
          <div className="mt-2 grid md:grid-cols-[1fr_auto] gap-4 items-end">
            <div>
              <Label className="text-white/80">Placa</Label>
              <Input
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC1D23"
                className="mt-2 h-14 text-2xl font-mono font-bold tracking-widest bg-white/10 border-white/20 text-white placeholder:text-white/40 uppercase"
              />
            </div>
            <div className="flex gap-2">
              <Button size="lg" variant="secondary" onClick={onPickPhoto} disabled={scanning} className="h-14">
                {scanning ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Camera className="h-5 w-5 mr-2" />} Foto
              </Button>
              <Button size="lg" onClick={() => setFipeOpen(true)} className="h-14 bg-primary hover:bg-primary/90">
                <ScanLine className="h-5 w-5 mr-2" /> FIPE
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/60">Foto: SimplesAPI extrai placa + dados do veículo. FIPE: seleção encadeada marca → modelo → ano.</p>
        </div>

        <CardContent className="p-5 md:p-6 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <Label className="flex items-center gap-1"><User className="h-3 w-3" /> Cliente</Label>
            <Input value={cliente} onChange={(e) => setCliente(e.target.value)} className="mt-1.5" placeholder="Nome do cliente" />
          </div>
          <div>
            <Label className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Modalidade</Label>
            <div className="mt-1.5 flex gap-2">
              {MODALIDADES.map((m) => (
                <Chip key={m} active={modalidade === m} onClick={() => setModalidade(m)} tone={m === "PRESENCIAL" ? "success" : "info"}>
                  {m}
                </Chip>
              ))}
            </div>
          </div>

          <div><Label>Marca</Label><Input value={marca} onChange={(e) => setMarca(e.target.value)} className="mt-1.5" /></div>
          <div className="lg:col-span-2"><Label>Modelo / Versão</Label><Input value={modelo} onChange={(e) => setModelo(e.target.value)} className="mt-1.5" /></div>
          <div><Label>Ano/Modelo</Label><Input value={ano} onChange={(e) => setAno(e.target.value)} placeholder="24/24" className="mt-1.5 font-mono" /></div>
          <div><Label>Chassi</Label><Input value={chassi} onChange={(e) => setChassi(e.target.value.toUpperCase())} className="mt-1.5 font-mono uppercase" /></div>
          <div><Label>Quilometragem</Label><Input type="number" value={km} onChange={(e) => setKm(e.target.value)} className="mt-1.5" /></div>
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

      <Dialog open={fipeOpen} onOpenChange={setFipeOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">Buscar FIPE — seleção encadeada</DialogTitle>
          </DialogHeader>
          <FipePicker initialMarca={marca} initialModelo={modelo} initialAno={ano} onResolve={onResolveFipe} />
        </DialogContent>
      </Dialog>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Empresa</CardTitle></CardHeader>
          <CardContent>
            <Select value={empresa} onValueChange={(v) => { setEmpresa(v as Empresa); setVendedor(""); }}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{EMPRESAS.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Vendedor</CardTitle></CardHeader>
          <CardContent>
            <Select value={vendedor} onValueChange={setVendedor}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{VENDEDORES[empresa].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Origem</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ORIGENS.map((o) => <Chip key={o} active={origem === o} onClick={() => setOrigem(o)} tone="info">{o}</Chip>)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Estado geral</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ESTADO_GERAL.map((e) => <Chip key={e} active={estado === e} onClick={() => setEstado(e)} tone={ESTADO_TONE[e]}>{e}</Chip>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Nível de avarias</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {NIVEL_AVARIAS.map((e) => <Chip key={e} active={nivel === e} onClick={() => setNivel(e)} tone={AVARIA_TONE[e]}>{e}</Chip>)}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileCheck2 className="h-4 w-4" /> Histórico do veículo</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {HISTORICO_OPCOES.map((h) => <Chip key={h} active={historico.includes(h)} onClick={() => toggle(historico, setHistorico, h)} tone="success">{h}</Chip>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Opcionais</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {OPCIONAIS.map((o) => <Chip key={o} active={opcionais.includes(o)} onClick={() => toggle(opcionais, setOpcionais, o)}>{o}</Chip>)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Car className="h-4 w-4" /> Diagrama de avarias</CardTitle>
          <Badge variant="outline">Toque nas peças</Badge>
        </CardHeader>
        <CardContent>
          <CarDiagram value={avariasPecas} onChange={setAvariasPecas} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ImagePlus className="h-4 w-4" /> Fotos & anexos</CardTitle></CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">Upload de fotos será habilitado após salvar a avaliação.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Observações</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags rápidas</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {TAGS_OBS.map((t) => <Chip key={t} active={tagsObs.includes(t)} onClick={() => toggle(tagsObs, setTagsObs, t)} tone="warn">{t}</Chip>)}
            </div>
          </div>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={4} placeholder="Notas livres do avaliador…" />
        </CardContent>
      </Card>
    </div>
  );
}

function CarDiagram({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const parts = [
    { id: "capo", label: "Capô", x: 35, y: 18, w: 30, h: 18 },
    { id: "teto", label: "Teto", x: 35, y: 38, w: 30, h: 22 },
    { id: "tampa-tras", label: "Tampa traseira", x: 35, y: 62, w: 30, h: 16 },
    { id: "para-front", label: "Para-choque dianteiro", x: 32, y: 8, w: 36, h: 8 },
    { id: "para-tras", label: "Para-choque traseiro", x: 32, y: 80, w: 36, h: 8 },
    { id: "porta-de", label: "Porta DE", x: 18, y: 38, w: 15, h: 22 },
    { id: "porta-dd", label: "Porta DD", x: 67, y: 38, w: 15, h: 22 },
    { id: "paralama-de", label: "Paralama DE", x: 18, y: 18, w: 15, h: 18 },
    { id: "paralama-dd", label: "Paralama DD", x: 67, y: 18, w: 15, h: 18 },
    { id: "lateral-te", label: "Lateral TE", x: 18, y: 62, w: 15, h: 16 },
    { id: "lateral-td", label: "Lateral TD", x: 67, y: 62, w: 15, h: 16 },
  ];
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="grid md:grid-cols-[1fr_240px] gap-5 items-start">
      <div className="relative aspect-[3/5] max-w-[300px] mx-auto bg-muted/30 rounded-2xl border-2 border-border overflow-hidden">
        {parts.map((p) => {
          const active = value.includes(p.id);
          return (
            <button key={p.id} onClick={() => toggle(p.id)} title={p.label}
              className={cn("absolute rounded-md transition-all border-2",
                active ? "bg-destructive/70 border-destructive" : "bg-card/90 border-border hover:border-primary")}
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, height: `${p.h}%` }}
            />
          );
        })}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Peças marcadas</div>
        {value.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">Nenhuma avaria marcada</div>
        ) : (
          <div className="space-y-1.5">
            {value.map((id) => {
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
