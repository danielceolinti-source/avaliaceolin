import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Camera,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  PECAS_VEICULO,
  TIPOS_AVARIA,
  SEVERIDADES_AVARIA,
  SEVERIDADE_COLORS,
} from "@/data/constants";
import { moedaBR } from "@/lib/format";
import { fixImageOrientation } from "@/utils/fixImageOrientation";
import PhotoLightbox from "@/components/PhotoLightbox";
import { cn } from "@/lib/utils";

type Avaria = {
  id: string;
  avaliacao_id: string;
  peca: string;
  tipo: string;
  severidade: string;
  descricao: string | null;
  custo_estimado: number | null;
  created_by: string | null;
};

type Foto = {
  id: string;
  avaria_id: string;
  storage_path: string;
  url: string;
  descricao: string | null;
};

interface Props {
  avaliacaoId: string | null;
  readOnly?: boolean;
}

const BUCKET = "avaliacao-fotos";

export default function AvariasManager({ avaliacaoId, readOnly = false }: Props) {
  const { user } = useAuth();
  const [avarias, setAvarias] = useState<Avaria[]>([]);
  const [fotosByAvaria, setFotosByAvaria] = useState<Record<string, Foto[]>>({});
  const [loading, setLoading] = useState(false);

  // dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Avaria | null>(null);
  const [form, setForm] = useState({
    peca: "",
    tipo: "",
    severidade: "Leve",
    descricao: "",
    custo_estimado: "",
  });
  const [saving, setSaving] = useState(false);

  // foto upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ avariaId: string; index: number } | null>(null);

  const load = async () => {
    if (!avaliacaoId) {
      setAvarias([]);
      setFotosByAvaria({});
      return;
    }
    setLoading(true);
    const { data: avs } = await (supabase as any)
      .from("avaliacao_avarias")
      .select("*")
      .eq("avaliacao_id", avaliacaoId)
      .order("created_at");
    const list: Avaria[] = avs || [];
    setAvarias(list);

    if (list.length > 0) {
      const ids = list.map((a) => a.id);
      const { data: fts } = await (supabase as any)
        .from("avaliacao_avaria_fotos")
        .select("*")
        .in("avaria_id", ids)
        .order("created_at");
      const grouped: Record<string, Foto[]> = {};
      for (const f of fts || []) {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(f.storage_path, 3600);
        const row: Foto = { ...f, url: signed?.signedUrl || "" };
        grouped[f.avaria_id] = grouped[f.avaria_id] || [];
        grouped[f.avaria_id].push(row);
      }
      setFotosByAvaria(grouped);
    } else {
      setFotosByAvaria({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avaliacaoId]);

  const resetForm = () =>
    setForm({ peca: "", tipo: "", severidade: "Leve", descricao: "", custo_estimado: "" });

  const openNew = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (a: Avaria) => {
    setEditing(a);
    setForm({
      peca: a.peca,
      tipo: a.tipo,
      severidade: a.severidade,
      descricao: a.descricao || "",
      custo_estimado: a.custo_estimado != null ? String(a.custo_estimado) : "",
    });
    setOpen(true);
  };

  const salvar = async () => {
    if (!avaliacaoId) {
      toast.warning("Salve um rascunho antes de adicionar avarias.");
      return;
    }
    if (!form.peca || !form.tipo) {
      toast.warning("Selecione a peça e o tipo da avaria.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        peca: form.peca,
        tipo: form.tipo,
        severidade: form.severidade,
        descricao: form.descricao || null,
        custo_estimado: form.custo_estimado ? parseFloat(form.custo_estimado) : null,
      };

      if (editing) {
        const { error } = await (supabase as any)
          .from("avaliacao_avarias")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Avaria atualizada");
      } else {
        const { error } = await (supabase as any).from("avaliacao_avarias").insert({
          ...payload,
          avaliacao_id: avaliacaoId,
          created_by: user?.id,
        });
        if (error) throw error;
        toast.success("Avaria adicionada");
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error("Falha ao salvar avaria", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (a: Avaria) => {
    if (!confirm(`Remover avaria de ${a.peca}?`)) return;
    // remover fotos do storage
    const fotos = fotosByAvaria[a.id] || [];
    if (fotos.length > 0) {
      await supabase.storage.from(BUCKET).remove(fotos.map((f) => f.storage_path));
    }
    const { error } = await (supabase as any).from("avaliacao_avarias").delete().eq("id", a.id);
    if (error) return toast.error("Falha ao excluir", { description: error.message });
    toast.success("Avaria removida");
    await load();
  };

  const onUploadFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !uploadingFor || !avaliacaoId) return;
    const avariaId = uploadingFor;
    try {
      for (const f of Array.from(files)) {
        const fixed = await fixImageOrientation(f);
        const ext = (fixed.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${avaliacaoId}/avarias/${avariaId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, fixed, { upsert: false });
        if (upErr) throw upErr;
        const { error: insErr } = await (supabase as any)
          .from("avaliacao_avaria_fotos")
          .insert({ avaria_id: avariaId, storage_path: path, created_by: user?.id });
        if (insErr) throw insErr;
      }
      toast.success("Fotos adicionadas");
      await load();
    } catch (err: any) {
      toast.error("Falha no upload", { description: err.message });
    } finally {
      setUploadingFor(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removerFoto = async (foto: Foto) => {
    if (!confirm("Remover esta foto?")) return;
    await supabase.storage.from(BUCKET).remove([foto.storage_path]);
    await (supabase as any).from("avaliacao_avaria_fotos").delete().eq("id", foto.id);
    await load();
  };

  const totalEstimado = avarias.reduce((sum, a) => sum + (a.custo_estimado || 0), 0);

  return (
    <Card className="border-amber-200/60 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Avarias do veículo
            {avarias.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">({avarias.length})</span>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Registre amassados, riscos, trincas e demais problemas. Cada avaria pode ter fotos próprias.
          </CardDescription>
        </div>
        {!readOnly && (
          <Button
            type="button"
            size="sm"
            onClick={openNew}
            disabled={!avaliacaoId}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Avaria
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!avaliacaoId && (
          <p className="text-xs text-muted-foreground">
            Salve o rascunho da avaliação para começar a registrar avarias.
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando avarias…
          </div>
        )}

        {avarias.length === 0 && avaliacaoId && !loading && (
          <p className="text-xs text-muted-foreground italic">Nenhuma avaria registrada.</p>
        )}

        {avarias.map((a) => {
          const fotos = fotosByAvaria[a.id] || [];
          return (
            <div
              key={a.id}
              className="rounded-2xl border bg-card p-3 sm:p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{a.peca}</span>
                    <Badge variant="outline" className="text-[10px]">{a.tipo}</Badge>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] border", SEVERIDADE_COLORS[a.severidade])}
                    >
                      {a.severidade}
                    </Badge>
                  </div>
                  {a.descricao && (
                    <p className="text-xs text-muted-foreground leading-snug">{a.descricao}</p>
                  )}
                  {a.custo_estimado != null && (
                    <p className="text-[11px] text-muted-foreground">
                      Custo estimado:{" "}
                      <span className="font-medium text-foreground">
                        {moedaBR(a.custo_estimado)}
                      </span>
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(a)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => excluir(a)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {fotos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {fotos.map((f, i) => (
                    <div
                      key={f.id}
                      className="relative group aspect-square rounded-lg overflow-hidden border bg-muted/40"
                    >
                      <button
                        type="button"
                        onClick={() => setLightbox({ avariaId: a.id, index: i })}
                        className="absolute inset-0 w-full h-full"
                      >
                        <img
                          src={f.url}
                          alt="Foto da avaria"
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </button>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removerFoto(f);
                          }}
                          className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 hover:bg-destructive text-white grid place-items-center opacity-0 group-hover:opacity-100 sm:opacity-100 transition z-10"
                          aria-label="Remover foto"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!readOnly && (
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setUploadingFor(a.id);
                      fileRef.current?.click();
                    }}
                    className="gap-1.5 h-8"
                  >
                    <ImagePlus className="h-3.5 w-3.5" /> Adicionar fotos
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {avarias.length > 0 && totalEstimado > 0 && (
          <div className="flex items-center justify-end text-xs text-muted-foreground pt-1">
            Total estimado:{" "}
            <span className="ml-2 font-semibold text-foreground">{moedaBR(totalEstimado)}</span>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onUploadFotos}
        />

        {lightbox &&
          (() => {
            const fotos = fotosByAvaria[lightbox.avariaId] || [];
            return (
              <PhotoLightbox
                photos={fotos.map((f) => ({ id: f.id, url: f.url, storage_path: f.storage_path }))}
                index={lightbox.index}
                onClose={() => setLightbox(null)}
                onIndexChange={(i) => setLightbox({ ...lightbox, index: i })}
                getDownloadUrl={async (p: any) => {
                  if (!p.storage_path) return p.url;
                  const { data } = await supabase.storage
                    .from(BUCKET)
                    .createSignedUrl(p.storage_path, 60);
                  return data?.signedUrl || p.url;
                }}
              />
            );
          })()}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar avaria" : "Nova avaria"}</DialogTitle>
            <DialogDescription>
              Informe os detalhes da peça afetada. Após salvar, você pode anexar fotos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Peça / Localização</Label>
              <Select value={form.peca} onValueChange={(v) => setForm({ ...form, peca: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PECAS_VEICULO.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_AVARIA.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Severidade</Label>
                <Select
                  value={form.severidade}
                  onValueChange={(v) => setForm({ ...form, severidade: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERIDADES_AVARIA.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex.: amassado na altura da maçaneta, ~15cm"
              />
            </div>
            <div className="grid gap-2">
              <Label>Custo estimado de reparo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.custo_estimado}
                onChange={(e) => setForm({ ...form, custo_estimado: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
