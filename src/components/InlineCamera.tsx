import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera, Loader2, Image as ImageIcon, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";

interface InlineCameraProps {
  open: boolean;
  onClose: () => void;
  /** Called when user confirms one or more captured photos. */
  onCapture: (files: File[]) => void | Promise<void>;
  /** Allow capturing multiple shots before closing (default true). */
  multi?: boolean;
}

const MAX_DIM = 1600;
const QUALITY = 0.85;

export default function InlineCamera({ open, onClose, onCapture, multi = true }: InlineCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<"starting" | "ready" | "error" | "saving">("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [shots, setShots] = useState<{ url: string; file: File }[]>([]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startStream = useCallback(async () => {
    try {
      setStatus("starting");
      setErrorMsg("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("ready");
    } catch (err: any) {
      console.error("[InlineCamera] error:", err);
      setStatus("error");
      setErrorMsg(
        err?.name === "NotAllowedError"
          ? "Permissão da câmera negada. Habilite nas configurações do navegador."
          : err?.name === "NotFoundError"
          ? "Nenhuma câmera encontrada neste dispositivo."
          : `Erro ao acessar câmera: ${err?.message || err}`
      );
    }
  }, []);

  useEffect(() => {
    if (open) {
      setShots([]);
      startStream();
    } else {
      stopStream();
      shots.forEach((s) => URL.revokeObjectURL(s.url));
      setShots([]);
    }
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const takeShot = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    let w = video.videoWidth;
    let h = video.videoHeight;
    const scale = Math.min(1, MAX_DIM / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", QUALITY)
    );
    if (!blob) return;
    const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    try { navigator.vibrate?.(60); } catch (_) {}

    if (!multi) {
      setStatus("saving");
      try {
        await onCapture([file]);
        URL.revokeObjectURL(url);
        onClose();
      } catch (err: any) {
        toast.error("Falha ao salvar foto", { description: err?.message });
        setStatus("ready");
      }
      return;
    }
    setShots((arr) => [...arr, { url, file }]);
  }, [multi, onCapture, onClose]);

  const removeShot = (idx: number) => {
    setShots((arr) => {
      const next = [...arr];
      const [rm] = next.splice(idx, 1);
      if (rm) URL.revokeObjectURL(rm.url);
      return next;
    });
  };

  const confirmAll = async () => {
    if (!shots.length) { onClose(); return; }
    setStatus("saving");
    try {
      await onCapture(shots.map((s) => s.file));
      shots.forEach((s) => URL.revokeObjectURL(s.url));
      onClose();
    } catch (err: any) {
      toast.error("Falha ao salvar fotos", { description: err?.message });
      setStatus("ready");
    }
  };

  const handleFileFallback = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setStatus("saving");
    try {
      await onCapture(files);
      onClose();
    } catch (err: any) {
      toast.error("Falha no upload", { description: err?.message });
      setStatus("ready");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileFallback}
      />

      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="text-white text-sm font-bold flex items-center gap-2">
          <Camera className="h-4 w-4" /> Foto do veículo
          {shots.length > 0 && <span className="text-xs font-normal text-white/70">({shots.length})</span>}
        </div>
        <button
          onClick={onClose}
          disabled={status === "saving"}
          className="h-10 w-10 rounded-full bg-white/20 backdrop-blur grid place-items-center text-white active:bg-white/30 disabled:opacity-50"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {status === "starting" && (
          <div className="absolute inset-0 bg-black/80 grid place-items-center">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
              <p className="text-sm">Acessando câmera...</p>
            </div>
          </div>
        )}

        {status === "saving" && (
          <div className="absolute inset-0 bg-black/80 grid place-items-center">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
              <p className="text-sm">Salvando...</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 bg-black/90 grid place-items-center p-6">
            <div className="text-center text-white max-w-sm space-y-3">
              <Camera className="h-10 w-10 mx-auto opacity-50" />
              <p className="text-sm">{errorMsg}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={startStream}
                  className="px-4 py-2 bg-white/15 border border-white/20 text-white rounded-full text-sm flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" /> Tentar novamente
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white text-black rounded-full text-sm flex items-center gap-2"
                >
                  <ImageIcon className="h-4 w-4" /> Upload
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnails strip */}
      {shots.length > 0 && (
        <div className="absolute bottom-32 inset-x-0 z-10 px-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {shots.map((s, i) => (
              <div key={i} className="relative shrink-0 h-16 w-16 rounded-md overflow-hidden border-2 border-white/40">
                <img src={s.url} alt={`Captura ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeShot(i)}
                  className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/70 text-white grid place-items-center"
                  aria-label="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer controls */}
      <div className="absolute bottom-0 inset-x-0 z-10 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={status === "saving"}
            className="h-12 w-12 rounded-full bg-white/15 border border-white/20 text-white grid place-items-center disabled:opacity-50"
            aria-label="Upload"
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          <button
            onClick={takeShot}
            disabled={status !== "ready"}
            className="h-20 w-20 rounded-full bg-white grid place-items-center active:scale-95 transition disabled:opacity-50"
            aria-label="Capturar"
          >
            <div className="h-16 w-16 rounded-full border-4 border-black/80" />
          </button>

          {multi ? (
            <button
              onClick={confirmAll}
              disabled={status === "saving" || !shots.length}
              className="h-12 w-12 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-40"
              aria-label="Concluir"
            >
              <Check className="h-5 w-5" />
            </button>
          ) : (
            <div className="h-12 w-12" />
          )}
        </div>
      </div>
    </div>
  );
}
