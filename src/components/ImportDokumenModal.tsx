import { useState, useRef, useCallback, useEffect } from "react";
import {
  parseFile, ParsedRow, ParseResult, SUPPORTED_EXTENSIONS, MAX_FILE_SIZE_BYTES,
} from "@/lib/importParser";
import { ImportableUnit, formatRupiah } from "@/lib/types";
import { importDokumenApi } from "@/lib/api";
import { UploadCloud, FileSpreadsheet, FileText, X, AlertCircle, Trash2, Loader2, CheckCircle2 } from "lucide-react";

type Props = {
  unit: ImportableUnit;
  open: boolean;
  onClose: () => void;
  onImported: (count: number, dilewati: number) => void;
  createdBy?: string;
};

interface PreviewRow extends ParsedRow {
  __id: string;
  __selected: boolean;
}

export default function ImportDokumenModal({ unit, open, onClose, onImported, createdBy = "user" }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setParseResult(null);
      setPreview([]);
      setError(null);
      setParsing(false);
      setImporting(false);
    }
  }, [open]);

  const validateAndParse = useCallback(async (f: File) => {
    setError(null);
    setParseResult(null);
    setPreview([]);
    if (f.size > MAX_FILE_SIZE_BYTES) {
      setError(`Ukuran file maksimal 10 MB. File Anda: ${(f.size / 1024 / 1024).toFixed(2)} MB.`);
      return;
    }
    const lower = f.name.toLowerCase();
    const ok = SUPPORTED_EXTENSIONS.some(e => lower.endsWith(e));
    if (!ok) {
      setError(`Format tidak didukung. Hanya: ${SUPPORTED_EXTENSIONS.join(", ")}`);
      return;
    }
    setFile(f);
    setParsing(true);
    try {
      const res = await parseFile(f);
      setParseResult(res);
      setPreview(res.rows.map((r, i) => ({
        ...r,
        __id: `prev-${i}-${Math.random().toString(36).slice(2, 7)}`,
        __selected: r.errors.length === 0,
      })));
    } catch (e: any) {
      setError(e?.message || "Gagal mem-parsing file.");
    } finally {
      setParsing(false);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void validateAndParse(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [validateAndParse]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void validateAndParse(f);
  }, [validateAndParse]);

  const updatePreview = (id: string, patch: Partial<PreviewRow>) => {
    setPreview(prev => prev.map(r => (r.__id === id ? { ...r, ...patch } : r)));
  };
  const removePreview = (id: string) => setPreview(prev => prev.filter(r => r.__id !== id));
  const toggleAll = (selected: boolean) => setPreview(prev => prev.map(r => ({ ...r, __selected: selected })));

  const selectedRows = preview.filter(r => r.__selected);
  const totalDebit = selectedRows.reduce((s, r) => s + (r.debit || 0), 0);
  const totalKredit = selectedRows.reduce((s, r) => s + (r.kredit || 0), 0);

  const handleImport = useCallback(async () => {
    if (!file) return;
    if (selectedRows.length === 0) { setError("Pilih minimal 1 baris untuk diimport."); return; }
    const invalid = selectedRows.find(r => !r.tanggal || (!r.debit && !r.kredit) || !r.keterangan);
    if (invalid) { setError("Ada baris terpilih yang masih invalid (tanggal/keterangan/nominal). Perbaiki dulu."); return; }
    setImporting(true);
    try {
      const res = await importDokumenApi.bulkCreate(unit, selectedRows.map(r => ({
        tanggal: r.tanggal,
        keterangan: r.keterangan,
        kategori: r.kategori,
        debit: r.debit,
        kredit: r.kredit,
        saldo: r.saldo,
        catatan: r.catatan,
      })), file.name);
      onImported(res.ditambahkan, res.dilewati);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Gagal menyimpan import.");
    } finally {
      setImporting(false);
    }
  }, [file, selectedRows, unit, createdBy, onImported, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="modal-import-dokumen">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#3b82f6)" }}>
              <UploadCloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Import Dokumen Keuangan</h3>
              <p className="text-xs text-muted-foreground">Excel (.xlsx/.xls/.csv) atau Word (.docx) — maks. 10 MB</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Tutup" data-testid="button-close-modal-import"
            className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {/* Drop Zone */}
          {!file && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-import"
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragOver ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]" : "hover:border-blue-400 hover:bg-muted/40"}`}
              style={{ borderColor: dragOver ? "#3b82f6" : "hsl(var(--border))" }}
            >
              <UploadCloud className="w-14 h-14 mx-auto mb-3 text-blue-500" />
              <p className="font-semibold text-foreground mb-1">Tarik & lepas file di sini</p>
              <p className="text-xs text-muted-foreground mb-4">atau klik untuk memilih file dari komputer</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                <FileSpreadsheet className="w-4 h-4" /> Pilih File
              </div>
              <p className="text-[11px] text-muted-foreground mt-4">Format yang didukung: {SUPPORTED_EXTENSIONS.join(", ")}</p>
              <input ref={fileInputRef} type="file" className="hidden" data-testid="input-file-import"
                accept={SUPPORTED_EXTENSIONS.join(",")} onChange={handleFileSelect} />
            </div>
          )}

          {/* Selected file info */}
          {file && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/40" style={{ borderColor: "hsl(var(--border))" }} data-testid="info-file-terpilih">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                  {file.name.toLowerCase().endsWith(".docx")
                    ? <FileText className="w-5 h-5 text-blue-600" />
                    : <FileSpreadsheet className="w-5 h-5 text-green-600" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB
                    {parseResult && ` • ${parseResult.rawCount} baris terdeteksi • ${parseResult.rows.length} baris dapat diparse`}
                  </p>
                </div>
              </div>
              <button onClick={() => { setFile(null); setParseResult(null); setPreview([]); setError(null); }}
                className="text-xs text-red-600 hover:underline" data-testid="button-ganti-file">Ganti</button>
            </div>
          )}

          {parsing && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Memproses file...
            </div>
          )}

          {parseResult?.warnings && parseResult.warnings.length > 0 && (
            <div className="rounded-xl border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 p-3 text-xs text-yellow-800 dark:text-yellow-300" data-testid="warnings-import">
              <p className="font-semibold mb-1">Peringatan:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {parseResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-700 dark:text-red-300" data-testid="error-import">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Preview Table */}
          {preview.length > 0 && (
            <div className="space-y-2" data-testid="preview-import">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Preview Data ({preview.length} baris) — pilih baris yang ingin diimport</p>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => toggleAll(true)} className="px-2 py-1 rounded-lg border hover:bg-muted" style={{ borderColor: "hsl(var(--border))" }} data-testid="button-pilih-semua-preview">Pilih Semua</button>
                  <button onClick={() => toggleAll(false)} className="px-2 py-1 rounded-lg border hover:bg-muted" style={{ borderColor: "hsl(var(--border))" }} data-testid="button-batal-pilih-preview">Batal Pilih</button>
                </div>
              </div>
              <div className="rounded-xl border overflow-x-auto max-h-[42vh] overflow-y-auto" style={{ borderColor: "hsl(var(--border))" }}>
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 w-8"><input type="checkbox" checked={preview.every(r => r.__selected)} onChange={e => toggleAll(e.target.checked)} aria-label="Pilih semua" /></th>
                      <th className="px-2 py-2 text-left">Tanggal</th>
                      <th className="px-2 py-2 text-left">Keterangan</th>
                      <th className="px-2 py-2 text-left">Kategori</th>
                      <th className="px-2 py-2 text-right">Debit</th>
                      <th className="px-2 py-2 text-right">Kredit</th>
                      <th className="px-2 py-2 text-left">Catatan</th>
                      <th className="px-2 py-2 w-10">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r) => {
                      const hasErr = r.errors.length > 0;
                      return (
                        <tr key={r.__id} className={`border-t ${hasErr ? "bg-red-50/40 dark:bg-red-950/10" : "even:bg-muted/30"}`} style={{ borderColor: "hsl(var(--border))" }} data-testid={`preview-row-${r.__id}`}>
                          <td className="px-2 py-1.5 text-center">
                            <input type="checkbox" checked={r.__selected} onChange={e => updatePreview(r.__id, { __selected: e.target.checked })} aria-label="Pilih baris" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="date" value={r.tanggal} onChange={e => updatePreview(r.__id, { tanggal: e.target.value })}
                              className="w-32 px-1.5 py-1 rounded border bg-card text-xs" style={{ borderColor: "hsl(var(--border))" }} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" value={r.keterangan} onChange={e => updatePreview(r.__id, { keterangan: e.target.value })}
                              className="w-44 px-1.5 py-1 rounded border bg-card text-xs" style={{ borderColor: "hsl(var(--border))" }} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" value={r.kategori} onChange={e => updatePreview(r.__id, { kategori: e.target.value })}
                              className="w-28 px-1.5 py-1 rounded border bg-card text-xs" style={{ borderColor: "hsl(var(--border))" }} />
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <input type="number" value={r.debit || ""} onChange={e => updatePreview(r.__id, { debit: Number(e.target.value) || 0 })}
                              className="w-24 px-1.5 py-1 rounded border bg-card text-xs text-right" style={{ borderColor: "hsl(var(--border))" }} />
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <input type="number" value={r.kredit || ""} onChange={e => updatePreview(r.__id, { kredit: Number(e.target.value) || 0 })}
                              className="w-24 px-1.5 py-1 rounded border bg-card text-xs text-right" style={{ borderColor: "hsl(var(--border))" }} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" value={r.catatan} onChange={e => updatePreview(r.__id, { catatan: e.target.value })}
                              className="w-32 px-1.5 py-1 rounded border bg-card text-xs" style={{ borderColor: "hsl(var(--border))" }} />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button onClick={() => removePreview(r.__id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600" aria-label="Hapus baris">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{selectedRows.length}</strong> dipilih</span>
                <span>•</span>
                <span>Total Debit: <strong className="text-green-600">{formatRupiah(totalDebit)}</strong></span>
                <span>•</span>
                <span>Total Kredit: <strong className="text-red-600">{formatRupiah(totalKredit)}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: "hsl(var(--border))" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted" style={{ borderColor: "hsl(var(--border))" }} data-testid="button-batal-import">
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={importing || preview.length === 0 || selectedRows.length === 0}
            data-testid="button-import-sekarang"
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Import Sekarang ({selectedRows.length})
          </button>
        </div>
      </div>
    </div>
  );
}
