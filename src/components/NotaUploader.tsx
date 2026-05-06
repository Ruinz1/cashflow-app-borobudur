import { useRef, useState } from "react";
import { Upload, X, Eye, FileText, Image } from "lucide-react";
import type { NotaItem } from "@/lib/storage";

interface NotaUploaderProps {
  notas: NotaItem[];
  onChange: (notas: NotaItem[]) => void;
  disabled?: boolean;
}

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

export default function NotaUploader({ notas, onChange, disabled }: NotaUploaderProps) {
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const errors: string[] = [];
    const valid: File[] = [];

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        errors.push(`${file.name}: terlalu besar (maks 2MB)`);
      } else if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: format tidak didukung (PDF/JPG/PNG)`);
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

  const handleRemove = (idx: number) => onChange(notas.filter((_, i) => i !== idx));

  const handleView = (nota: NotaItem) => {
    if (!nota.data) return;
    if (nota.tipe.startsWith("image/")) {
      const win = window.open();
      win?.document.write(`<img src="${nota.data}" style="max-width:100%;"/>`);
    } else {
      const link = document.createElement("a");
      link.href = nota.data;
      link.download = nota.nama;
      link.click();
    }
  };

  return (
    <div className="space-y-2">
      {notas.length > 0 && (
        <div className="space-y-1.5">
          {notas.map((n, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              {n.tipe.startsWith("image/") ? (
                <Image className="w-4 h-4 text-blue-500 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span className="flex-1 text-xs font-medium text-foreground truncate" title={n.nama}>
                {n.nama}
              </span>
              {n.data && (
                <button
                  type="button"
                  onClick={() => handleView(n)}
                  className="text-xs text-blue-500 hover:underline shrink-0"
                >
                  Lihat
                </button>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
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

      {!disabled && (
        <label
          className="flex items-center gap-3 p-3 rounded-xl border border-dashed cursor-pointer hover:bg-muted transition-colors"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">
            {notas.length > 0
              ? "Tambah nota lain (PDF, JPG, PNG, maks 2MB per file)"
              : "Klik untuk upload nota (PDF, JPG, PNG, maks 2MB)"}
          </span>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            onChange={handleChange}
          />
        </label>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
