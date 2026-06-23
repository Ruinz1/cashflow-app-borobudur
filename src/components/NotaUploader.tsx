import { useRef, useState } from "react";
import { Upload, X, Eye, FileText, Image, Download } from "lucide-react";
import type { NotaItem } from "@/lib/types";
import ImageLightbox, { type LightboxImage } from "./ImageLightbox";

interface NotaUploaderProps {
  notas: NotaItem[];
  onChange: (notas: NotaItem[]) => void;
  disabled?: boolean;
  /** Maximum number of files allowed (0 = unlimited) */
  maxFiles?: number;
}

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function NotaUploader({ notas, onChange, disabled, maxFiles = 0 }: NotaUploaderProps) {
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const errors: string[] = [];
    const valid: File[] = [];

    for (const file of files) {
      if (maxFiles > 0 && notas.length + valid.length >= maxFiles) {
        errors.push(`Maksimal ${maxFiles} file.`);
        break;
      }
      if (file.size > MAX_SIZE) {
        errors.push(`${file.name}: terlalu besar (maks 2MB)`);
      } else if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: format tidak didukung (PDF/JPG/PNG/WebP)`);
      } else if (notas.some((n) => n.nama === file.name)) {
        errors.push(`${file.name}: sudah ditambahkan`);
      } else {
        valid.push(file);
      }
    }

    setError(errors.join(" | "));
    if (!valid.length) return;

    Promise.all(
      valid.map(
        (file) =>
          new Promise<NotaItem>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ nama: file.name, tipe: file.type, data: reader.result as string });
            reader.onerror = () => reject(new Error(`Gagal membaca ${file.name}`));
            reader.readAsDataURL(file);
          })
      )
    )
      .then((loaded) => {
        onChange([...notas, ...loaded]);
        if (inputRef.current) inputRef.current.value = "";
      })
      .catch((err: Error) => setError(err.message));
  };

  const handleRemove = (idx: number) => {
    onChange(notas.filter((_, i) => i !== idx));
  };

  // Separate image and non-image notas
  const imageNotas = notas
    .map((n, i) => ({ ...n, originalIndex: i }))
    .filter((n) => n.tipe.startsWith("image/"));
  const fileNotas = notas
    .map((n, i) => ({ ...n, originalIndex: i }))
    .filter((n) => !n.tipe.startsWith("image/"));

  // Build lightbox images
  const lightboxImages: LightboxImage[] = imageNotas
    .filter((n) => n.data)
    .map((n) => ({
      src: n.data,
      alt: n.nama,
    }));

  const openLightbox = (imageIndex: number) => {
    setLightboxIndex(imageIndex);
    setLightboxOpen(true);
  };

  const handleDownloadFile = (nota: NotaItem) => {
    if (!nota.data) return;
    const link = document.createElement("a");
    link.href = nota.data;
    link.download = nota.nama;
    link.click();
  };

  const acceptTypes = maxFiles === 0 ? ".pdf,.jpg,.jpeg,.png,.webp" : ".pdf,.jpg,.jpeg,.png,.webp";
  const canAddMore = maxFiles === 0 || notas.length < maxFiles;

  return (
    <div className="space-y-3">
      {/* Image thumbnails grid */}
      {imageNotas.length > 0 && (
        <div className="nota-thumb-grid">
          {imageNotas.map((n, thumbIdx) => (
            <div key={n.originalIndex} className="nota-thumb-item">
              {n.data && (
                <img
                  src={n.data}
                  alt={n.nama}
                  onClick={() => openLightbox(thumbIdx)}
                />
              )}
              <div
                className="nota-thumb-overlay"
                onClick={() => openLightbox(thumbIdx)}
              >
                <span className="nota-thumb-action">
                  <Eye className="w-4 h-4" /> Lihat
                </span>
              </div>
              {!disabled && (
                <button
                  type="button"
                  className="nota-thumb-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(n.originalIndex);
                  }}
                  title="Hapus"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Non-image files list */}
      {fileNotas.length > 0 && (
        <div className="space-y-1.5">
          {fileNotas.map((n) => (
            <div key={n.originalIndex} className="nota-file-item">
              <FileText className="w-4 h-4 text-red-500 shrink-0" />
              <span
                className="flex-1 text-xs font-medium text-foreground truncate"
                title={n.nama}
              >
                {n.nama}
              </span>
              {n.data && (
                <button
                  type="button"
                  onClick={() => handleDownloadFile(n)}
                  className="text-xs text-blue-500 hover:underline shrink-0 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Unduh
                </button>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(n.originalIndex)}
                  className="p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors shrink-0"
                  title="Hapus"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {!disabled && canAddMore && (
        <label
          className="flex items-center gap-3 p-3 rounded-xl border border-dashed cursor-pointer hover:bg-muted transition-colors"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Upload className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-foreground block">
              {notas.length > 0
                ? "Tambah file lain"
                : "Klik untuk upload nota/gambar"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              PDF, JPG, PNG, WebP — maks 2MB per file
              {maxFiles > 0 ? ` — maks ${maxFiles} file` : " — bisa lebih dari 1"}
            </span>
          </div>
          <Image className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={acceptTypes}
            multiple
            onChange={handleChange}
          />
        </label>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
