import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/utils-timeout";

const PLACA_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
const OCR_INTERVAL_MS = 3000;
const CAPTURE_QUALITY = 0.80;
const CAPTURE_MAX = 1200;

interface PlateCameraProps {
  open: boolean;
  onClose: () => void;
  onDetect: (placa: string) => void;
}

export default function PlateCamera({ open, onClose, onDetect }: PlateCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);

  const [status, setStatus] = useState<"starting" | "scanning" | "processing" | "error">("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [attempts, setAttempts] = useState(0);

  // Start camera stream
  const startStream = useCallback(async () => {
    try {
      setStatus("starting");
      setErrorMsg("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus("scanning");
    } catch (err: any) {
      console.error("[Camera] Failed to start:", err);
      setStatus("error");
      setErrorMsg(
        err.name === "NotAllowedError"
          ? "Permissão da câmera negada. Habilite nas configurações do navegador."
          : err.name === "NotFoundError"
          ? "Nenhuma câmera encontrada neste dispositivo."
          : `Erro ao acessar câmera: ${err.message}`
      );
    }
  }, []);

  // Stop camera stream completely
  const stopStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    busyRef.current = false;
  }, []);

  // Capture frame to base64
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    let w = video.videoWidth;
    let h = video.videoHeight;

    if (w > h && w > CAPTURE_MAX) {
      h = Math.round((h * CAPTURE_MAX) / w);
      w = CAPTURE_MAX;
    } else if (h > CAPTURE_MAX) {
      w = Math.round((w * CAPTURE_MAX) / h);
      h = CAPTURE_MAX;
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", CAPTURE_QUALITY);
  }, []);

  // Call OCR endpoint
  const callOcr = useCallback(async (b64: string): Promise<string> => {
    const { data, error } = await withTimeout(
      supabase.functions.invoke("ocr-placa", { body: { imageBase64: b64 } }),
      15000
    );
    if (error) throw error;
    const raw: string = (data?.placa || "")
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .trim();
    return raw.slice(0, 7);
  }, []);

  // OCR scan loop
  const doScan = useCallback(async () => {
    if (busyRef.current || !streamRef.current) return;
    busyRef.current = true;

    try {
      setStatus("processing");
      const frame = captureFrame();
      if (!frame) {
        setStatus("scanning");
        busyRef.current = false;
        return;
      }

      const detected = await callOcr(frame);
      setAttempts((a) => a + 1);

      if (detected && detected.length === 7 && PLACA_REGEX.test(detected)) {
        // Success!
        try { navigator.vibrate?.(200); } catch (_) {}
        stopStream();
        onDetect(detected);
        return;
      }

      setStatus("scanning");
    } catch (err) {
      console.warn("[OCR] Scan error:", err);
      setStatus("scanning");
    } finally {
      busyRef.current = false;
    }
  }, [captureFrame, callOcr, stopStream, onDetect]);

  // Start/stop based on open prop
  useEffect(() => {
    if (open) {
      setAttempts(0);
      startStream();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [open, startStream, stopStream]);

  // Start OCR interval when scanning
  useEffect(() => {
    if (status === "scanning" && open) {
      // First scan after 1.5s, then every OCR_INTERVAL_MS
      const firstTimeout = setTimeout(() => {
        doScan();
        intervalRef.current = setInterval(doScan, OCR_INTERVAL_MS);
      }, 1500);
      return () => {
        clearTimeout(firstTimeout);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [status, open, doScan]);

  const handleClose = () => {
    stopStream();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="text-white">
          <div className="text-sm font-bold flex items-center gap-2">
            <Camera className="h-4 w-4" /> Leitura de Placa
          </div>
          <div className="text-[10px] text-white/60 mt-0.5">
            {status === "starting" && "Iniciando câmera..."}
            {status === "scanning" && `Escaneando... (${attempts} tentativas)`}
            {status === "processing" && "Processando OCR..."}
            {status === "error" && "Erro"}
          </div>
        </div>
        <button
          onClick={handleClose}
          className="h-10 w-10 rounded-full bg-white/20 backdrop-blur grid place-items-center text-white active:bg-white/30"
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

        {/* Scan guide overlay */}
        {status !== "error" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-[85%] max-w-[400px] aspect-[3/1]">
              {/* Corner guides */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-white rounded-br-lg" />
              
              {/* Scanning line animation */}
              {status === "processing" && (
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-green-400 animate-pulse" />
              )}
            </div>
          </div>
        )}

        {/* Status indicators */}
        {status === "starting" && (
          <div className="absolute inset-0 bg-black/80 grid place-items-center">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
              <p className="text-sm">Acessando câmera...</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 bg-black/90 grid place-items-center p-6">
            <div className="text-center text-white max-w-sm">
              <Camera className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-4">{errorMsg}</p>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-white text-black rounded-full text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 inset-x-0 z-10 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-center gap-3">
          {status === "processing" ? (
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
              <Zap className="h-4 w-4 animate-pulse" />
              Analisando placa...
            </div>
          ) : status === "scanning" ? (
            <div className="text-white/60 text-xs text-center">
              Aponte a câmera para a placa do veículo.<br />
              A leitura é automática.
            </div>
          ) : null}
        </div>
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
