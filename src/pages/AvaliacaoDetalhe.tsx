import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChevronLeft, Camera, Loader2, Trash2, Check, X, ShoppingCart, Ban, ImagePlus, Pencil, Save, ScanLine, FileDown,
  History, Clock, User as UserIcon
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { dataBR, dataHoraBR } from "@/lib/format";
import { toast } from "sonner";
import { 
  STATUS_AVALIACAO, STATUS_NEGOCIACAO, STATUS_COLORS, 
  StatusAvaliacao, StatusNegociacao, MODALIDADES, ORIGENS, EMPRESAS 
} from "@/data/constants";
import { moedaBR as moeda } from "@/lib/format";
import { useVendedores } from "@/hooks/useVendedores";
import FipePicker from "@/components/FipePicker";
import PhotoLightbox from "@/components/PhotoLightbox";
import { cn } from "@/lib/utils";

export default function AvaliacaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canEditAssessment, canDeleteAny, isSuperAdmin, isTI, isGestor } = useRole();
  const podeExcluir = canDeleteAny;
  const fileRef = useRef<HTMLInputElement>(null);
  const [aval, setAval] = useState<any>(null);
  const [fotos, setFotos] = useState<{ id: string; url: string; storage_path: string; descricao: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [fipeOpen, setFipeOpen] = useState(false);
  const [perfilAvaliador, setPerfilAvaliador] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const { vendedores } = useVendedores(draft?.empresa);

  const podeEditar = !!aval && canEditAssessment(aval.created_by);
  const podeMudarStatus = isSuperAdmin || isTI || isGestor;

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("avaliacoes").select("*").eq("id", id).maybeSingle();
    setAval(data);
    setDraft(data);

    // Fotos
    const { data: fs } = await supabase.from("avaliacao_fotos").select("*").eq("avaliacao_id", id).order("created_at");
    if (fs) {
      const withUrls = await Promise.all(fs.map(async (f) => {
        const { data: signed } = await supabase.storage.from("avaliacao-fotos").createSignedUrl(f.storage_path, 3600);
        return { id: f.id, storage_path: f.storage_path, descricao: f.descricao, url: signed?.signedUrl || "" };
      }));
      setFotos(withUrls);
    }
    
    // Perfil
    if (data?.created_by) {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", data.created_by).single();
      setPerfilAvaliador(p);
    }

    // Histórico de Status
    const { data: hist } = await supabase.from("status_history")
      .select("*")
      .eq("avaliacao_id", id)
      .order("created_at", { ascending: false });
    setHistory(hist || []);
    
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user || !id) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const ext = f.name.split(".").pop() || "jpg";
        const path = `${user.id}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avaliacao-fotos").upload(path, f, { upsert: false });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from("avaliacao_fotos").insert({ avaliacao_id: id, storage_path: path, created_by: user.id });
        if (insErr) throw insErr;
      }
      toast.success("Fotos enviadas");
      await load();
    } catch (err: any) {
      toast.error("Falha no upload", { description: err.message });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const removerFoto = async (foto: typeof fotos[number]) => {
    await supabase.storage.from("avaliacao-fotos").remove([foto.storage_path]);
    await supabase.from("avaliacao_fotos").delete().eq("id", foto.id);
    setFotos((arr) => arr.filter((x) => x.id !== foto.id));
  };

  const updateStatus = async (field: "status" | "status_negociacao", value: string) => {
    if (!id || !user || !aval) return;
    
    const prevValue = aval[field];
    if (prevValue === value) return;

    // 1. Update Avaliacao
    const { error: upErr } = await (supabase.from("avaliacoes") as any).update({ 
      [field]: value,
      updated_by: user.id 
    }).eq("id", id);
    
    if (upErr) return toast.error(upErr.message);

    // 2. Insert into History
    await supabase.from("status_history").insert({
      avaliacao_id: id,
      status_anterior: prevValue ?? null,
      status_novo: value,
      alterado_por: user.id,
    });
    
    toast.success("Status atualizado");
    load(); // Refresh data
  };

  const salvarEdicao = async () => {
    if (!id || !user || !draft) return;
    setSaving(true);
    const payload: any = {
      cliente: draft.cliente, marca: draft.marca, modelo: draft.modelo, versao: draft.versao,
      ano: draft.ano, chassi: draft.chassi, placa: (draft.placa || "").toUpperCase(),
      km: draft.km ? Number(draft.km) : null,
      fipe: draft.fipe || null, custo: draft.custo || null, avaliacao: draft.avaliacao || null,
      vendedor: draft.vendedor, origem: draft.origem || null,
      modalidade: draft.modalidade, empresa: draft.empresa,
      observacoes: draft.observacoes || null,
      data_avaliacao: draft.data_avaliacao,
      updated_by: user.id,
    };
    const { error } = await supabase.from("avaliacoes").update(payload).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Avaliação atualizada");
    setEditing(false);
    await load();
  };

  const gerarPDF = () => {
    if (!aval) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    const corEmpresa: [number, number, number] = aval.empresa === 'Ceolin' ? [206, 43, 55] : [128, 130, 133];
    
    doc.setFillColor(corEmpresa[0], corEmpresa[1], corEmpresa[2]);
    doc.rect(0, 0, pageWidth, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(aval.empresa.toUpperCase(), 15, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("RELATÓRIO DE AVALIAÇÃO TÉCNICA", 15, 32);
    
    doc.text(`Nº ${aval.numero || id?.slice(0,8)}`, pageWidth - 15, 22, { align: "right" });
    doc.text(dataBR(aval.data_avaliacao || aval.created_at), pageWidth - 15, 32, { align: "right" });

    // Vehicle Info
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${aval.marca} ${aval.modelo}`, 15, 55);

    autoTable(doc, {
      startY: 70,
      head: [["Placa", "Ano", "KM", "Status", "Negociação"]],
      body: [[aval.placa, aval.ano, aval.km?.toLocaleString('pt-BR') || '—', aval.status, aval.status_negociacao]],
      theme: 'striped',
      headStyles: { fillColor: corEmpresa }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["FIPE", "Preço Sugerido", "Valor Avaliação"]],
      body: [[moeda(aval.fipe), moeda(aval.custo), moeda(aval.avaliacao)]],
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 12, fontStyle: 'bold', halign: 'center' }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("RESPONSÁVEL PELA AVALIAÇÃO", 15, finalY);
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${perfilAvaliador?.full_name || aval.created_by_name || '—'}`, 15, finalY + 7);

    if (aval.observacoes) {
      doc.setFont("helvetica", "bold");
      doc.text("OBSERVAÇÕES TÉCNICAS", 15, finalY + 25);
      doc.setFont("helvetica", "normal");
      const splitObs = doc.splitTextToSize(aval.observacoes, pageWidth - 30);
      doc.text(splitObs, 15, finalY + 32);
    }

    doc.save(`avaliacao-${aval.placa}-${aval.modelo}.pdf`);
  };

  const onResolveFipe = (data: { marca: string; modelo: string; versao?: string; ano: string; fipe: number }) => {
    setDraft((prev: any) => ({ ...(prev || {}), ...data }));
    setFipeOpen(false);
  };

  const excluir = async () => {
    if (!id || !confirm("Excluir esta avaliação?")) return;
    const { error } = await supabase.from("avaliacoes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    navigate("/avaliacoes");
  };

  if (loading) return <div className="py-20 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!aval) return <div className="py-20 text-center"><p>Não encontrada</p></div>;

  const d = editing ? draft : aval;

  return (
    <div className="space-y-5 pb-12">
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onUpload} />

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <div className="flex items-center gap-2">
          <Badge className={cn("px-3 py-1", STATUS_COLORS[aval.status])}>{aval.status}</Badge>
          <Badge variant="outline" className={cn("px-3 py-1", STATUS_COLORS[aval.status_negociacao])}>{aval.status_negociacao}</Badge>
          {!editing && <Button size="sm" variant="outline" onClick={gerarPDF}><FileDown className="h-4 w-4 mr-2" /> PDF</Button>}
          {podeEditar && !editing && <Button size="sm" onClick={() => navigate(`/avaliacoes/${id}/editar`)} className="bg-gradient-primary text-primary-foreground"><Pencil className="h-4 w-4 mr-2" /> Continuar Avaliação</Button>}
          {podeEditar && !editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-2" /> Edição rápida</Button>}
          {editing && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button size="sm" onClick={salvarEdicao} disabled={saving} className="bg-gradient-primary text-primary-foreground">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Salvar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono">#{aval.numero} · {aval.empresa}</div>
          <h1 className="font-display text-3xl font-bold">{d.marca} {d.modelo}</h1>
          <p className="text-muted-foreground text-sm mt-1">{d.ano} • {d.km ? `${Number(d.km).toLocaleString()} km` : ""} • Placa {d.placa}</p>
        </div>
        {podeMudarStatus && !editing && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 justify-end">
              <span className="text-[10px] uppercase font-bold text-muted-foreground w-full text-right mb-1">Status Avaliação</span>
              {STATUS_AVALIACAO.map(s => (
                <Button key={s} size="sm" variant={aval.status === s ? "default" : "outline"} onClick={() => updateStatus("status", s)} className="h-8">
                  {aval.status === s && <Check className="h-3 w-3 mr-1" />}{s}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <span className="text-[10px] uppercase font-bold text-muted-foreground w-full text-right mb-1">Status Negociação</span>
              {STATUS_NEGOCIACAO.map(s => (
                <Button key={s} size="sm" variant={aval.status_negociacao === s ? "default" : "outline"} onClick={() => updateStatus("status_negociacao", s)} className="h-8">
                  {aval.status_negociacao === s && <Check className="h-3 w-3 mr-1" />}{s}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {editing ? (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Editar avaliação</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setFipeOpen(true)}><ScanLine className="h-4 w-4 mr-2" /> FIPE</Button>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Placa"><Input value={draft.placa || ""} onChange={(e) => setDraft({ ...draft, placa: e.target.value.toUpperCase() })} className="font-mono uppercase" /></Field>
            <Field label="Cliente"><Input value={draft.cliente || ""} onChange={(e) => setDraft({ ...draft, cliente: e.target.value })} /></Field>
            <Field label="Data"><Input type="date" value={draft.data_avaliacao || ""} onChange={(e) => setDraft({ ...draft, data_avaliacao: e.target.value })} /></Field>
            <Field label="Marca"><Input value={draft.marca || ""} onChange={(e) => setDraft({ ...draft, marca: e.target.value })} /></Field>
            <Field label="Modelo / Versão" cols={2}><Input value={draft.modelo || ""} onChange={(e) => setDraft({ ...draft, modelo: e.target.value })} /></Field>
            <Field label="Ano/Modelo"><Input value={draft.ano || ""} onChange={(e) => setDraft({ ...draft, ano: e.target.value })} className="font-mono" /></Field>
            <Field label="FIPE"><Input type="number" value={draft.fipe || ""} onChange={(e) => setDraft({ ...draft, fipe: +e.target.value })} className="font-mono" /></Field>
            <Field label="Custo"><Input type="number" value={draft.custo || ""} onChange={(e) => setDraft({ ...draft, custo: +e.target.value })} className="font-mono" /></Field>
            <Field label="Avaliação"><Input type="number" value={draft.avaliacao || ""} onChange={(e) => setDraft({ ...draft, avaliacao: +e.target.value })} className="font-mono border-primary/40" /></Field>
            <Field label="Vendedor">
              <Select value={draft.vendedor || ""} onValueChange={(v) => setDraft({ ...draft, vendedor: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{vendedores.map((v) => <SelectItem key={v.id} value={v.nome}>{v.nome}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Observações" cols={4}>
              <Textarea rows={3} value={draft.observacoes || ""} onChange={(e) => setDraft({ ...draft, observacoes: e.target.value })} />
            </Field>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-primary/20"><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase text-muted-foreground">Avaliação de Compra</CardTitle></CardHeader>
            <CardContent className="font-mono text-2xl font-bold text-primary">{moeda(aval.avaliacao)}</CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase text-muted-foreground">Custo Sugerido</CardTitle></CardHeader>
            <CardContent className="font-mono text-2xl font-bold">{moeda(aval.custo)}</CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-[10px] uppercase text-muted-foreground">FIPE</CardTitle></CardHeader>
            <CardContent className="font-mono text-2xl font-bold">{moeda(aval.fipe)}</CardContent></Card>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Especificações Técnicas</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <Row k="Cliente" v={aval.cliente} />
                <Row k="Chassi" v={aval.chassi} mono />
                <Row k="KM" v={aval.km ? Number(aval.km).toLocaleString() : "—"} />
                <Row k="Vendedor" v={aval.vendedor} />
              </div>
              <div className="space-y-2">
                <Row k="Estado geral" v={aval.estado_geral} />
                <Row k="Nível avarias" v={aval.nivel_avarias} />
                <Row k="Origem" v={aval.origem} />
                <Row k="Modalidade" v={aval.modalidade} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Histórico & Opcionais</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(aval.historico || []).map((h: string) => <Badge key={h} variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">{h}</Badge>)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(aval.opcionais || []).map((o: string) => <Badge key={o} variant="outline" className="border-primary/20">{o}</Badge>)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><ImagePlus className="h-4 w-4" /> Fotos ({fotos.length})</CardTitle>
              {podeEditar && <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />} Adicionar</Button>}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-full">
                {fotos.map((f, i) => (
                  <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden border bg-muted/40 group shadow-sm min-w-0 flex items-center justify-center">
                    <button type="button" onClick={() => setLightboxIdx(i)} className="absolute inset-0 w-full h-full flex items-center justify-center p-1">
                      <img src={f.url} alt="" loading="lazy" className="max-w-full max-h-full w-auto h-auto object-contain block transition" />
                    </button>
                    {podeEditar && (
                      <button onClick={(e) => { e.stopPropagation(); removerFoto(f); }} className="absolute top-1 right-1 h-7 w-7 rounded-full bg-destructive text-white grid place-items-center opacity-0 group-hover:opacity-100 sm:opacity-100 transition z-10"><Trash2 className="h-3 w-3" /></button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-gradient-primary text-primary-foreground border-none shadow-glow">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <UserIcon className="h-4 w-4 opacity-80" />
              <CardTitle className="text-xs uppercase tracking-widest opacity-80">Avaliador Responsável</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 grid place-items-center font-bold text-lg overflow-hidden border border-white/30">
                {perfilAvaliador?.avatar_url ? (
                  <img src={perfilAvaliador.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (perfilAvaliador?.full_name || aval.created_by_name || "?")[0].toUpperCase()
                )}
              </div>
              <div>
                <div className="font-bold">{perfilAvaliador?.full_name || aval.created_by_name || "Não identificado"}</div>
                <div className="text-[10px] opacity-70">Avaliação Técnica realizada em {dataBR(aval.created_at)}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader className="pb-2 flex flex-row items-center gap-2"><History className="h-4 w-4 text-muted-foreground" /><CardTitle className="text-sm">Histórico de Alterações</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {history.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">Nenhuma alteração registrada</div>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="relative pl-4 border-l-2 border-primary/20 pb-4 last:pb-0">
                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-2 border-primary" />
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {dataHoraBR(h.created_at)}</div>
                    <div className="text-xs font-bold mt-0.5">{h.campo}: {h.valor_novo}</div>
                    <div className="text-[10px] text-muted-foreground line-through opacity-50">Anterior: {h.valor_anterior || "Nenhum"}</div>
                    <div className="text-[10px] flex items-center gap-1 mt-1 text-primary/80"><UserIcon className="h-3 w-3" /> {h.user_name}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {!editing && aval.observacoes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Observações Técnicas</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap leading-relaxed">{aval.observacoes}</CardContent>
            </Card>
          )}

          {podeExcluir && !editing && (
            <Button variant="ghost" size="sm" onClick={excluir} className="w-full text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3 mr-2" /> Excluir permanentemente</Button>
          )}
        </div>
      </div>

      <Dialog open={fipeOpen} onOpenChange={setFipeOpen}>
        <DialogContent className="max-w-3xl">
          <FipePicker initialMarca={draft?.marca} initialModelo={draft?.modelo} initialAno={draft?.ano} onResolve={onResolveFipe} />
        </DialogContent>
      </Dialog>

      <PhotoLightbox
        photos={fotos}
        index={lightboxIdx}
        onClose={() => setLightboxIdx(null)}
        onIndexChange={setLightboxIdx}
        getDownloadUrl={async (p) => {
          const { data } = await supabase.storage.from("avaliacao-fotos").createSignedUrl(p.storage_path!, 3600, { download: true });
          return data?.signedUrl || p.url;
        }}
      />
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: any; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/30 pb-1.5 last:border-0">
      <span className="text-muted-foreground text-xs uppercase tracking-wider">{k}</span>
      <span className={cn("text-sm", mono && "font-mono")}>{v || "—"}</span>
    </div>
  );
}

function Field({ label, children, cols = 1 }: { label: string; children: React.ReactNode; cols?: number }) {
  const span = cols === 4 ? "lg:col-span-4 md:col-span-2" : cols === 2 ? "lg:col-span-2" : "";
  return (
    <div className={span}>
      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

