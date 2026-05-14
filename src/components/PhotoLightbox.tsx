import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X, Loader2 } from "lucide-react";

export interface LightboxPhoto {
  id: string;
  url: string;
  storage_path?: string;
  descricao?: string | null;
}

interface Props {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  /** Optional: provide signed URL for original (unscaled) download */
  getDownloadUrl?: (p: LightboxPhoto) => Promise<string>;
}

export default function PhotoLightbox({ photos, index, onClose, onIndexChange, getDownloadUrl }: Props) {
  const [downloading, setDownloading] = useState(false);
  const open = index !== null && index >= 0 && index < photos.length;
  const photo = open ? photos[index!] : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  if (!open || !photo) return null;

  const prev = () => onIndexChange((index! - 1 + photos.length) % photos.length);
  const next = () => onIndexChange((index! + 1) % photos.length);

  const download = async () => {
    try {
      setDownloading(true);
      const url = getDownloadUrl ? await getDownloadUrl(photo) : photo.url;
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = (photo.storage_path?.split(".").pop() || "jpg").toLowerCase();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `foto-${photo.id.slice(0, 8)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-medium">
          {index! + 1} / {photos.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={download}
            disabled={downloading}
            className="h-10 px-3 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center gap-2 text-sm"
            aria-label="Baixar foto"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="hidden sm:inline">Baixar</span>
          </button>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition grid place-items-center"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="flex-1 relative flex items-center justify-center px-2 sm:px-12" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.url}
          alt={photo.descricao || "Foto"}
          className="max-h-full max-w-full object-contain select-none touch-pinch-zoom"
          style={{ touchAction: "pinch-zoom" }}
          draggable={false}
        />

        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 transition grid place-items-center text-white"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 transition grid place-items-center text-white"
              aria-label="Próxima"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="p-3 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2 justify-center min-w-min">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => onIndexChange(i)}
                className={`h-14 w-14 flex-shrink-0 rounded-md overflow-hidden border-2 transition ${
                  i === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
