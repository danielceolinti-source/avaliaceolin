import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, Camera, Loader2, Trash2, Check, X, ShoppingCart, Ban, ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { STATUS_COLORS, Status } from "@/data/constants";

const moeda = (n: number | null) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function AvaliacaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [aval, setAval] = useState<any>(null);
  const [fotos, setFotos] = useState<{ id: string; url: string; storage_path: string; descricao: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("avaliacoes").select("*").eq("id", id).maybeSingle();
    setAval(data);
    const { data: fs } = await supabase
      .from("avaliacao_fotos")
      .select("*")
      .eq("avaliacao_id", id)
      .order("created_at");
    if (fs) {
      const withUrls = await Promise.all(
        fs.map(async (f) => {
          const { data: signed } = await supabase.storage
            .from("avaliacao-fotos")
            .createSignedUrl(f.storage_path, 3600);
          return { id: f.id, storage_path: f.storage_path, descricao: f.descricao, url: signed?.signedUrl || "" };
        })
      );
      setFotos(withUrls);
    }
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
        const { error: insErr } = await supabase.from("avaliacao_fotos").insert({
          avaliacao_id: id, storage_path: path, created_by: user.id,
        });
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

  const mudarStatus = async (status: Status) => {
    if (!id || !user) return;
    const { error } = await supabase.from("avaliacoes").update({ status, updated_by: user.id }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Status: ${status}`);
    setAval({ ...aval, status });
  };

  if (loading) {
    return <div className="py-20 grid place-items-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!aval) {
    return <div className="py-20 text-center"><p>Avaliação não encontrada</p><Button asChild className="mt-4"><Link to="/avaliacoes">Voltar</Link></Button></div>;
  }

  return (
    <div className="space-y-5 pb-12">
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onUpload} />

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <Badge variant="outline" className={STATUS_COLORS[aval.status as Status]}>{aval.status}</Badge>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono">#{aval.numero} · {aval.empresa}</div>
          <h1 className="font-display text-3xl font-bold">{aval.marca} {aval.modelo}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {aval.ano} {aval.km ? `• ${aval.km.toLocaleString("pt-BR")} km` : ""} • Placa <span className="font-mono">{aval.placa}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => mudarStatus("Comprado")} className="border-success/40 text-success hover:bg-success/10">
            <ShoppingCart className="h-4 w-4 mr-2" /> Comprado
          </Button>
          <Button variant="outline" onClick={() => mudarStatus("Não Comprado")} className="border-destructive/40 text-destructive hover:bg-destructive/10">
            <X className="h-4 w-4 mr-2" /> Não Comprado
          </Button>
          <Button variant="outline" onClick={() => mudarStatus("Cancelado")}>
            <Ban className="h-4 w-4 mr-2" /> Cancelar
          </Button>
          {aval.status === "Em Avaliação" && (
            <Button onClick={() => mudarStatus("Finalizada")} className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Check className="h-4 w-4 mr-2" /> Finalizar
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">FIPE</CardTitle></CardHeader>
          <CardContent className="font-mono text-2xl font-bold">{moeda(aval.fipe)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Custo</CardTitle></CardHeader>
          <CardContent className="font-mono text-2xl font-bold">{moeda(aval.custo)}</CardContent></Card>
        <Card className="border-primary/40"><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-primary">Avaliação</CardTitle></CardHeader>
          <CardContent className="font-mono text-2xl font-bold text-primary">{moeda(aval.avaliacao)}</CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Detalhes</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <Row k="Chassi" v={aval.chassi} mono />
            <Row k="Vendedor" v={aval.vendedor} />
            <Row k="Origem" v={aval.origem} />
            <Row k="Estado geral" v={aval.estado_geral} />
            <Row k="Nível de avarias" v={aval.nivel_avarias} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Histórico & Opcionais</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(aval.historico || []).map((h: string) => <Badge key={h} variant="secondary">{h}</Badge>)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(aval.opcionais || []).map((o: string) => <Badge key={o} variant="outline">{o}</Badge>)}
            </div>
            {(aval.avarias || []).length > 0 && (
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1.5">Avarias</div>
                <div className="flex flex-wrap gap-1.5">
                  {(aval.avarias || []).map((a: any, i: number) => <Badge key={i} variant="destructive">{a.peca}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><ImagePlus className="h-4 w-4" /> Fotos ({fotos.length})</CardTitle>
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />} Adicionar fotos
          </Button>
        </CardHeader>
        <CardContent>
          {fotos.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma foto anexada ainda</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {fotos.map((f) => (
                <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden border bg-muted group">
                  <img src={f.url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removerFoto(f)}
                    className="absolute top-1 right-1 h-7 w-7 rounded-full bg-destructive text-destructive-foreground grid place-items-center opacity-0 group-hover:opacity-100 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {aval.observacoes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Observações</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{aval.observacoes}</CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: any; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 pb-1.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono" : ""}>{v || "—"}</span>
    </div>
  );
}
