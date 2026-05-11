import { useEffect, useRef, useState } from "react";
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
  Camera, ScanLine, Sparkles, Save, Send, ChevronRight,
  Wrench, FileCheck2, Loader2, User, Calendar, Plus, X,
} from "lucide-react";
import {
  EMPRESAS, ESTADO_GERAL, HISTORICO_OPCOES, NIVEL_AVARIAS,
  OPCIONAIS, ORIGENS, Empresa, MODALIDADES,
} from "@/data/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVendedores } from "@/hooks/useVendedores";
import { hojeBR, moedaBR as moeda } from "@/lib/format";
import FipePicker from "@/components/FipePicker";
import PlateCamera from "@/components/PlateCamera";

function Chip({ active, onClick, children, tone = "default", onRemove }: any) {
  const tones: Record<string, string> = {
    default: "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:border-primary",
    success: "data-[active=true]:bg-success data-[active=true]:text-success-foreground data-[active=true]:border-success",
    warn: "data-[active=true]:bg-warning data-[active=true]:text-warning-foreground data-[active=true]:border-warning",
    danger: "data-[active=true]:bg-destructive data-[active=true]:text-destructive-foreground data-[active=true]:border-destructive",
    info: "data-[active=true]:bg-info data-[active=true]:text-info-foreground data-[active=true]:border-info",
  };
  return (
    <div className="relative group">
      <button type="button" onClick={onClick} data-active={active}
        className={cn("h-10 px-4 rounded-full border bg-card text-sm font-medium transition-all hover:border-primary/40", tones[tone])}
      >
        {children}
      </button>
      {onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white grid place-items-center opacity-0 group-hover:opacity-100 transition shadow-sm"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

const ESTADO_TONE: Record<string, string> = { Excelente: "success", "Muito Bom": "success", Bom: "info", Regular: "warn", Ruim: "danger" };
const AVARIA_TONE: Record<string, string> = { "Sem avarias": "success", Leve: "info", Moderado: "warn", Alto: "danger", Grave: "danger" };

export default function NovaAvaliacao() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [empresa, setEmpresa] = useState<Empresa>("Ceolin");
  const { vendedores } = useVendedores(empresa);
  const [data, setData] = useState(hojeBR());
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
  
  const [saving, setSaving] = useState(false);
  const [fipeOpen, setFipeOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [novoHist, setNovoHist] = useState("");
  const [novoOp, setNovoOp] = useState("");

  // Hydration de rascunho temporário
  useEffect(() => {
    const saved = localStorage.getItem("avaliacao_draft");
    if (saved) {
      try {
        const snap = JSON.parse(saved);
        if (Date.now() - snap.timestamp < 1800000) { // 30 min
          if (snap.placa) setPlaca(snap.placa);
          if (snap.marca) setMarca(snap.marca);
          if (snap.modelo) setModelo(snap.modelo);
          if (snap.cliente) setCliente(snap.cliente);
          // ... outros campos podem ser adicionados conforme necessidade
        }
      } catch (e) {}
    }
  }, []);

  // Persistência automática do rascunho
  useEffect(() => {
    if (placa || cliente || marca) {
      const draft = { placa, marca, modelo, cliente, timestamp: Date.now() };
      localStorage.setItem("avaliacao_draft", JSON.stringify(draft));
    }
  }, [placa, marca, modelo, cliente]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const addCustom = (val: string, setVal: (v: string) => void, arr: string[], setArr: (v: string[]) => void) => {
    if (!val.trim()) return;
    if (!arr.includes(val.trim())) setArr([...arr, val.trim()]);
    setVal("");
  };

  const onResolveFipe = (d: { marca: string; modelo: string; versao?: string; ano: string; fipe: number }) => {
    if (d.marca && !marca) setMarca(d.marca);
    if (d.versao && !modelo) setModelo(d.versao);
    if (d.ano && !ano) setAno(d.ano);
    setFipe(d.fipe);
    setAval(Math.round(d.fipe * 0.85));
    setFipeOpen(false);
  };

  const salvar = async (status: "Em Avaliação" | "Avaliado") => {
    if (!user) return toast.error("Sessão expirada");
    if (!placa.trim()) return toast.warning("Placa é obrigatória");
    
    setSaving(true);
    const { error } = await supabase.from("avaliacoes").insert({
      empresa, 
      placa: placa.toUpperCase(), 
      chassi: chassi || null,
      cliente: cliente || null, 
      modalidade, 
      data_avaliacao: data,
      marca, modelo, ano, km: km ? Number(km) : null,
      fipe: fipe || null, custo: custo || null, avaliacao: aval || null,
      vendedor, origem: (origem as any) || null,
      status, // Camada 1
      status_negociacao: "Sem definição", // Camada 2 inicial
      estado_geral: estado || null, nivel_avarias: nivel || null,
      historico, opcionais,
      observacoes: obs || null,
      created_by: user.id, updated_by: user.id,
    });
    
    setSaving(false);
    if (error) return toast.error(error.message);
    
    localStorage.removeItem("avaliacao_draft");
    toast.success(status === "Avaliado" ? "Avaliação concluída" : "Rascunho salvo");
    navigate("/avaliacoes");
  };

  return (
    <div className="space-y-5 pb-12">
      <PlateCamera 
        open={cameraOpen} 
        onClose={() => setCameraOpen(false)} 
        onDetect={(p) => {
          setPlaca(p);
          setCameraOpen(false);
          setTimeout(() => setFipeOpen(true), 400);
        }} 
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Avaliações</span><ChevronRight className="h-3 w-3" /><span className="text-foreground font-medium">Nova</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Nova Avaliação</h1>
          <p className="text-muted-foreground text-sm mt-1">Capture a placa em tempo real para iniciar o processo.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => salvar("Em Avaliação")} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Salvar rascunho
          </Button>
          <Button onClick={() => salvar("Avaliado")} disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} Concluir Avaliação
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-hero text-white p-5 md:p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
            <Sparkles className="h-3 w-3" /> Câmera Profissional · OCR Real-time
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
              <Button size="lg" variant="secondary" onClick={() => setCameraOpen(true)} className="h-14 min-w-[120px]">
                <Camera className="h-5 w-5 mr-2" /> Abrir Câmera
              </Button>
              <Button size="lg" onClick={() => setFipeOpen(true)} className="h-14 bg-primary hover:bg-primary/90">
                <ScanLine className="h-5 w-5 mr-2" /> FIPE
              </Button>
            </div>
          </div>
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
          </div>
          <div>
            <Label>Custo estimado</Label>
            <Input type="number" value={custo || ""} onChange={(e) => setCusto(+e.target.value)} className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label className="text-primary font-bold">Valor Avaliação</Label>
            <Input type="number" value={aval || ""} onChange={(e) => setAval(+e.target.value)} className="mt-1.5 font-mono border-primary/40 focus-visible:ring-primary h-11 text-lg" />
            {aval > 0 && <div className="text-xs font-semibold text-primary mt-1">{moeda(aval)}</div>}
          </div>
        </CardContent>
      </Card>

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
              <SelectContent>{vendedores.map((v) => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}</SelectContent>
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
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {HISTORICO_OPCOES.map((h) => (
                <Chip key={h} active={historico.includes(h)} onClick={() => toggle(historico, setHistorico, h)} tone="success">{h}</Chip>
              ))}
              {historico.filter(h => !HISTORICO_OPCOES.includes(h)).map(h => (
                <Chip key={h} active={true} onClick={() => toggle(historico, setHistorico, h)} tone="info" onRemove={() => toggle(historico, setHistorico, h)}>{h}</Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={novoHist} onChange={(e) => setNovoHist(e.target.value)} placeholder="Adicionar outro item..." className="h-9" onKeyDown={(e) => e.key === "Enter" && addCustom(novoHist, setNovoHist, historico, setHistorico)} />
              <Button size="sm" variant="outline" onClick={() => addCustom(novoHist, setNovoHist, historico, setHistorico)}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Opcionais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {OPCIONAIS.map((o) => (
                <Chip key={o} active={opcionais.includes(o)} onClick={() => toggle(opcionais, setOpcionais, o)}>{o}</Chip>
              ))}
              {opcionais.filter(o => !OPCIONAIS.includes(o)).map(o => (
                <Chip key={o} active={true} onClick={() => toggle(opcionais, setOpcionais, o)} tone="info" onRemove={() => toggle(opcionais, setOpcionais, o)}>{o}</Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={novoOp} onChange={(e) => setNovoOp(e.target.value)} placeholder="Outro opcional..." className="h-9" onKeyDown={(e) => e.key === "Enter" && addCustom(novoOp, setNovoOp, opcionais, setOpcionais)} />
              <Button size="sm" variant="outline" onClick={() => addCustom(novoOp, setNovoOp, opcionais, setOpcionais)}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Observações Técnicas</CardTitle></CardHeader>
        <CardContent>
          <Textarea 
            value={obs} 
            onChange={(e) => setObs(e.target.value)} 
            rows={6} 
            placeholder="Campo livre para observações, detalhes de pintura, funilaria, pneus, etc..." 
            className="text-base"
          />
        </CardContent>
      </Card>

      <Dialog open={fipeOpen} onOpenChange={setFipeOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Buscar FIPE</DialogTitle></DialogHeader>
          <FipePicker initialMarca={marca} initialModelo={modelo} initialAno={ano} onResolve={onResolveFipe} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

