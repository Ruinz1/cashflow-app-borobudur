import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  getTransaksi, saveTransaksi, getSaldoAwal, saveSaldoAwal,
  recalculateSaldo, generateId, formatRupiah, formatDate,
  DIVISI_CONFIG, DivisiKey, Transaksi, getStorageUsagePercent, getStorageUsageMB,
  getSaldoAwalDivisi, getSaldoAdmSiswaSummary, SALDO_ADMSISWA_EVENT, SaldoAdmSiswaSummary,
  getSaldoManualEntries, tambahSaldoManual, updateSaldoManual, hapusSaldoManual, SaldoManualEntry,
} from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import {
  Plus, Pencil, Trash2, Download, FileText, Printer,
  Upload, Eye, AlertCircle, TrendingUp, TrendingDown, Wallet, FileSpreadsheet,
  Receipt, RefreshCw, Users, PlusCircle, X, Settings, UploadCloud,
} from "lucide-react";
import ImportDokumenModal from "@/components/ImportDokumenModal";
import ImportDokumenSection from "@/components/ImportDokumenSection";

const MONTHS = [
  { val: "", label: "Semua Bulan" },
  { val: "01", label: "Januari" }, { val: "02", label: "Februari" },
  { val: "03", label: "Maret" }, { val: "04", label: "April" },
  { val: "05", label: "Mei" }, { val: "06", label: "Juni" },
  { val: "07", label: "Juli" }, { val: "08", label: "Agustus" },
  { val: "09", label: "September" }, { val: "10", label: "Oktober" },
  { val: "11", label: "November" }, { val: "12", label: "Desember" },
];

function generateYears() {
  const now = new Date().getFullYear();
  return [{ val: "", label: "Semua Tahun" }, ...Array.from({ length: 5 }, (_, i) => ({ val: String(now - i), label: String(now - i) }))];
}

const EMPTY_FORM = { tanggal: "", uraian: "", rencana: 0, uang_masuk: 0, uang_keluar: 0, keterangan: "", nota: null as null | { nama: string; tipe: string; data: string } };

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Konfirmasi Hapus</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-muted" style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90">Hapus</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium fade-in ${type === "success" ? "bg-green-600" : "bg-red-500"}`}>
      {message}
    </div>
  );
}

export default function DivisiPage() {
  const params = useParams() as { divisi: DivisiKey };
  const divisi = params.divisi as DivisiKey;
  const config = DIVISI_CONFIG[divisi];
  const { hasAccess, user } = useAuth();
  const access = hasAccess(divisi);

  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [notaError, setNotaError] = useState("");

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const isTKYaris = divisi === "tkyaris";
  const isImportable = divisi === "amanah" || divisi === "batualam";
  const [showImportModal, setShowImportModal] = useState(false);

  // Untuk TK Yaris: dengarkan event update saldo Adm. Siswa agar
  // saldo awal selalu sinkron secara realtime.
  const [admSiswaSummary, setAdmSiswaSummary] = useState<SaldoAdmSiswaSummary>(() => getSaldoAdmSiswaSummary());
  // Modal kelola saldo manual TK Yaris
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualEntries, setManualEntries] = useState<SaldoManualEntry[]>(() => getSaldoManualEntries());
  const [manualForm, setManualForm] = useState({ keterangan: "", nominal: "", tanggal: new Date().toISOString().slice(0, 10) });
  const [manualEditId, setManualEditId] = useState<string | null>(null);
  const [confirmHapusManualId, setConfirmHapusManualId] = useState<string | null>(null);

  useEffect(() => {
    if (!isTKYaris) return;
    const onSaldoUpdated = (e: Event) => {
      const detail = (e as CustomEvent<SaldoAdmSiswaSummary>).detail;
      const next = detail || getSaldoAdmSiswaSummary();
      setAdmSiswaSummary(next);
      setManualEntries(getSaldoManualEntries());
      setRefresh(r => r + 1);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cashflow_saldo_admsiswa" || e.key === "cashflow_saldo_manual_tkyaris") {
        setAdmSiswaSummary(getSaldoAdmSiswaSummary());
        setManualEntries(getSaldoManualEntries());
        setRefresh(r => r + 1);
      }
    };
    window.addEventListener(SALDO_ADMSISWA_EVENT, onSaldoUpdated as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SALDO_ADMSISWA_EVENT, onSaldoUpdated as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [isTKYaris]);

  const totalSaldoManual = useMemo(
    () => manualEntries.reduce((s, e) => s + (Number(e.nominal) || 0), 0),
    [manualEntries]
  );

  const resetManualForm = useCallback(() => {
    setManualForm({ keterangan: "", nominal: "", tanggal: new Date().toISOString().slice(0, 10) });
    setManualEditId(null);
  }, []);

  const submitManualEntry = useCallback(() => {
    const ket = manualForm.keterangan.trim();
    const nom = Number(manualForm.nominal);
    if (ket.length < 3) { showToast("Keterangan minimal 3 karakter", "error"); return; }
    if (!Number.isFinite(nom) || nom <= 0) { showToast("Nominal harus lebih dari 0", "error"); return; }
    if (!manualForm.tanggal) { showToast("Tanggal wajib diisi", "error"); return; }
    try {
      if (manualEditId) {
        updateSaldoManual(manualEditId, { keterangan: ket, nominal: nom, tanggal: manualForm.tanggal }, "user");
        showToast("Entri saldo manual diperbarui");
      } else {
        tambahSaldoManual({ keterangan: ket, nominal: nom, tanggal: manualForm.tanggal }, "user");
        showToast("Entri saldo manual ditambahkan");
      }
      setManualEntries(getSaldoManualEntries());
      resetManualForm();
    } catch (err: any) {
      showToast(err?.message || "Gagal menyimpan entri", "error");
    }
  }, [manualForm, manualEditId, resetManualForm, showToast]);

  const startEditManual = useCallback((entry: SaldoManualEntry) => {
    setManualEditId(entry.id);
    setManualForm({ keterangan: entry.keterangan, nominal: String(entry.nominal), tanggal: entry.tanggal });
  }, []);

  const confirmHapusManual = useCallback(() => {
    if (!confirmHapusManualId) return;
    if (hapusSaldoManual(confirmHapusManualId, "user")) {
      setManualEntries(getSaldoManualEntries());
      showToast("Entri saldo manual dihapus");
    }
    setConfirmHapusManualId(null);
  }, [confirmHapusManualId, showToast]);

  const saldoAwal = getSaldoAwal();
  // Untuk TK Yaris pakai sumber kebenaran terintegrasi (admsiswa summary).
  const saldoAwalDivisi = useMemo(
    () => getSaldoAwalDivisi(divisi),
    // refresh saat data berubah / event sync
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [divisi, refresh, admSiswaSummary.total_saldo]
  );

  const allTransaksi = useMemo(() => {
    return getTransaksi(divisi);
  }, [divisi, refresh]);

  const filteredTransaksi = useMemo(() => {
    return allTransaksi.filter(t => {
      if (filterMonth && !t.tanggal.startsWith(`${filterYear || ""}-${filterMonth}`)) {
        if (filterYear) {
          return t.tanggal.startsWith(`${filterYear}-${filterMonth}`);
        }
        return t.tanggal.includes(`-${filterMonth}-`);
      }
      if (filterYear && !filterMonth) return t.tanggal.startsWith(filterYear);
      return true;
    });
  }, [allTransaksi, filterMonth, filterYear]);

  // Recalculate saldo based on filtered data
  const displayTransaksi = useMemo(() => {
    const recalc = recalculateSaldo(filteredTransaksi, saldoAwalDivisi);
    return recalc;
  }, [filteredTransaksi, saldoAwalDivisi]);

  const totalMasuk = displayTransaksi.reduce((s, t) => s + t.uang_masuk, 0);
  const totalKeluar = displayTransaksi.reduce((s, t) => s + t.uang_keluar, 0);
  const saldoAkhir = saldoAwalDivisi + totalMasuk - totalKeluar;

  const handleOpenAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, tanggal: new Date().toISOString().split("T")[0] });
    setNotaError("");
    setShowModal(true);
  };

  const handleOpenEdit = (t: Transaksi) => {
    setEditId(t.id);
    setForm({
      tanggal: t.tanggal,
      uraian: t.uraian,
      rencana: t.rencana,
      uang_masuk: t.uang_masuk,
      uang_keluar: t.uang_keluar,
      keterangan: t.keterangan,
      nota: t.nota || null,
    });
    setNotaError("");
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.tanggal || !form.uraian) {
      showToast("Tanggal dan uraian wajib diisi.", "error");
      return;
    }
    const all = getTransaksi(divisi);
    if (editId) {
      const idx = all.findIndex(t => t.id === editId);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...form, saldo_akhir: 0 };
      }
    } else {
      all.push({ id: generateId(), ...form, saldo_akhir: 0 });
    }
    const sorted = all.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const recalced = recalculateSaldo(sorted, saldoAwalDivisi);
    // TK Yaris: peringatkan jika hasil simpan membuat saldo akhir minus.
    if (isTKYaris && recalced.length > 0) {
      const last = recalced[recalced.length - 1].saldo_akhir;
      if (last < 0) {
        const ok = window.confirm(
          `⚠️ PERINGATAN!\n\nSaldo TK Yaris akan menjadi MINUS: ${formatRupiah(last)}.\n\nIngin tetap menyimpan transaksi ini?`
        );
        if (!ok) return;
      }
    }
    try {
      saveTransaksi(divisi, recalced);
    } catch (err) {
      showToast((err as Error).message || "Gagal menyimpan transaksi.", "error");
      return;
    }
    setRefresh(r => r + 1);
    setShowModal(false);
    showToast(editId ? "Transaksi berhasil diperbarui." : "Transaksi berhasil ditambahkan.");
  };

  const handleDelete = (id: string) => {
    const all = getTransaksi(divisi).filter(t => t.id !== id);
    const recalced = recalculateSaldo(all, saldoAwalDivisi);
    try {
      saveTransaksi(divisi, recalced);
    } catch (err) {
      showToast((err as Error).message || "Gagal menghapus transaksi.", "error");
      return;
    }
    setRefresh(r => r + 1);
    setConfirmDelete(null);
    showToast("Transaksi berhasil dihapus.");
  };

  const handleNotaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) { setNotaError("File terlalu besar. Maksimal 2MB."); return; }
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) { setNotaError("Format tidak didukung. Gunakan PDF, JPG, atau PNG."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({ ...f, nota: { nama: file.name, tipe: file.type, data: reader.result as string } }));
      setNotaError("");
    };
    reader.readAsDataURL(file);
  };

  const handleViewNota = (nota: { nama: string; tipe: string; data: string }) => {
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

  const getPeriodeLabel = () => {
    const m = MONTHS.find(x => x.val === filterMonth)?.label || "Semua Bulan";
    const y = filterYear || "Semua Tahun";
    return `${m} ${y}`;
  };

  const handlePrint = () => window.print();
  const handlePDF = () => exportToPDF(config.label, getPeriodeLabel(), displayTransaksi, totalMasuk, totalKeluar, saldoAkhir);
  const handleExcel = () => exportToExcel(config.label, getPeriodeLabel(), displayTransaksi, totalMasuk, totalKeluar, saldoAkhir);

  if (!config) return <div className="p-4 text-red-500">Divisi tidak ditemukan.</div>;
  if (access === "NONE") return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-lg font-semibold text-foreground">Akses Ditolak</p>
      <p className="text-muted-foreground text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
    </div>
  );

  const storageUsed = getStorageUsagePercent();
  const storageMB = getStorageUsageMB();

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} />}
      {confirmDelete && (
        <ConfirmDialog
          message="Apakah Anda yakin ingin menghapus transaksi ini?"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {confirmHapusManualId && (() => {
        const target = manualEntries.find(e => e.id === confirmHapusManualId);
        return (
          <ConfirmDialog
            message={`Entri "${target?.keterangan || ""}" sebesar ${formatRupiah(target?.nominal || 0)} akan dihapus. Saldo Awal TK Yaris akan berkurang sebesar jumlah ini.`}
            onConfirm={confirmHapusManual}
            onCancel={() => setConfirmHapusManualId(null)}
          />
        );
      })()}

      {/* Modal Kelola Saldo Awal Manual TK Yaris */}
      {isTKYaris && showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="modal-kelola-saldo-manual">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5" style={{ color: "#1565c0" }} />
                <h3 className="text-base font-bold">Kelola Saldo Awal Manual — TK Yaris</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowManualModal(false); resetManualForm(); }}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"
                aria-label="Tutup"
                data-testid="button-close-modal-saldo-manual"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {/* Tabel daftar entri */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
                <table className="w-full text-sm" data-testid="table-saldo-manual">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-10">No</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Keterangan</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Nominal</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-28">Tanggal</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground italic text-xs">
                          Belum ada entri saldo manual.
                        </td>
                      </tr>
                    ) : manualEntries.map((entry, idx) => (
                      <tr key={entry.id} className="border-t" style={{ borderColor: "hsl(var(--border))" }} data-testid={`row-saldo-manual-${entry.id}`}>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2 text-sm">{entry.keterangan}</td>
                        <td className="px-3 py-2 text-sm text-right font-semibold" style={{ color: "#15803d" }}>{formatRupiah(entry.nominal)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(entry.tanggal)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditManual(entry)}
                              className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center"
                              title="Edit"
                              data-testid={`button-edit-saldo-manual-${entry.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmHapusManualId(entry.id)}
                              className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center"
                              title="Hapus"
                              data-testid={`button-hapus-saldo-manual-${entry.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t" style={{ borderColor: "hsl(var(--border))", background: "#fef9c3" }}>
                      <td colSpan={2} className="px-3 py-2 text-sm font-bold">TOTAL SALDO AWAL MANUAL</td>
                      <td className="px-3 py-2 text-right text-sm font-bold" data-testid="text-total-saldo-manual-modal">{formatRupiah(totalSaldoManual)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Form tambah/edit entri */}
              <div className="rounded-xl border p-4" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted)/0.4)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <PlusCircle className="w-4 h-4" style={{ color: "#15803d" }} />
                  <span className="text-sm font-semibold">{manualEditId ? "Edit Entri" : "Tambah Entri Saldo Manual"}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-muted-foreground">Keterangan</label>
                    <input
                      type="text"
                      value={manualForm.keterangan}
                      onChange={e => setManualForm(f => ({ ...f, keterangan: e.target.value }))}
                      placeholder="Contoh: Saldo Awal Tahun Ajaran 2025"
                      maxLength={150}
                      className="w-full px-3 py-2 rounded-lg border text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                      style={{ borderColor: "hsl(var(--border))" }}
                      data-testid="input-saldo-manual-keterangan"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Tanggal</label>
                    <input
                      type="date"
                      value={manualForm.tanggal}
                      onChange={e => setManualForm(f => ({ ...f, tanggal: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                      style={{ borderColor: "hsl(var(--border))" }}
                      data-testid="input-saldo-manual-tanggal"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[11px] text-muted-foreground">Nominal (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={manualForm.nominal}
                      onChange={e => setManualForm(f => ({ ...f, nominal: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                      style={{ borderColor: "hsl(var(--border))" }}
                      data-testid="input-saldo-manual-nominal"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3">
                  {manualEditId && (
                    <button
                      type="button"
                      onClick={resetManualForm}
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted"
                      style={{ borderColor: "hsl(var(--border))" }}
                    >Batal Edit</button>
                  )}
                  <button
                    type="button"
                    onClick={submitManualEntry}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: "#15803d" }}
                    data-testid="button-simpan-saldo-manual"
                  >{manualEditId ? "Simpan Perubahan" : "Tambahkan"}</button>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t flex items-center justify-end gap-2" style={{ borderColor: "hsl(var(--border))" }}>
              <button
                type="button"
                onClick={() => { setShowManualModal(false); resetManualForm(); }}
                className="px-4 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted"
                style={{ borderColor: "hsl(var(--border))" }}
              >Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Storage warning banner */}
      {storageUsed >= 80 && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm ${storageUsed >= 95 ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">
              {storageUsed >= 95 ? "⚠️ Penyimpanan Hampir Penuh!" : "Peringatan: Penyimpanan Mendekati Batas"}
            </p>
            <p className="text-xs mt-0.5">
              Terpakai {storageMB} MB dari ~5 MB ({storageUsed}%). Hapus nota/file lampiran yang sudah tidak diperlukan untuk mengosongkan ruang penyimpanan.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: config.color }} />
            <h1 className="text-xl font-bold text-foreground">Cashflow — {config.label}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Manajemen arus kas divisi</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          {access === "CRUD" && (
            <button data-testid="button-add-transaksi" onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm"
              style={{ background: config.color }}>
              <Plus className="w-4 h-4" /> Tambah
            </button>
          )}
          {isImportable && access === "CRUD" && (
            <button
              data-testid="button-import-data"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm"
              style={{ background: "linear-gradient(135deg,#6366f1,#3b82f6)" }}
            >
              <UploadCloud className="w-4 h-4" /> Import Data
            </button>
          )}
          <button onClick={handlePDF} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-card transition-colors hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))" }}>
            <FileText className="w-4 h-4 text-red-500" /> PDF
          </button>
          <button onClick={handleExcel} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-card transition-colors hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))" }}>
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-card transition-colors hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))" }}>
            <Printer className="w-4 h-4 text-blue-500" /> Cetak
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 no-print">
        <select
          data-testid="select-month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="px-3 py-2 rounded-xl border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
        <select
          data-testid="select-year"
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          className="px-3 py-2 rounded-xl border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          {generateYears().map(y => <option key={y.val} value={y.val}>{y.label}</option>)}
        </select>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm text-muted-foreground bg-card"
          style={{ borderColor: "hsl(var(--border))" }}>
          <span>Saldo Awal:</span>
          <span className="font-semibold text-foreground">{formatRupiah(saldoAwalDivisi)}</span>
          {access === "CRUD" && !isTKYaris && (
            <button
              onClick={() => {
                const cur = saldoAwal[divisi];
                const curNum = typeof cur === "number" ? cur : 0;
                const val = prompt("Masukkan saldo awal baru:", String(curNum));
                if (val !== null) {
                  const num = parseFloat(val.replace(/[^0-9.-]/g, "")) || 0;
                  const updated = { ...getSaldoAwal(), [divisi]: num };
                  saveSaldoAwal(updated);
                  setRefresh(r => r + 1);
                  showToast("Saldo awal berhasil diperbarui.");
                }
              }}
              className="text-xs text-primary hover:underline font-medium"
            >Ubah</button>
          )}
          {isTKYaris && (
            <span className="text-[11px] text-muted-foreground italic">(otomatis: Adm. Siswa + Manual)</span>
          )}
        </div>
      </div>

      {/* Info box dua kolom Saldo Awal — khusus TK Yaris */}
      {isTKYaris && (
        <div
          className="rounded-2xl border p-4"
          style={{ borderColor: "#1565c0", background: "#e3f2fd" }}
          data-testid="banner-saldo-awal-tkyaris"
        >
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#1565c0" }}>
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold" style={{ color: "#0d47a1" }}>Saldo Awal Cashflow TK Yaris</h3>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "#dcfce7", color: "#166534" }}
              data-testid="sync-indicator"
              title="Sinkronisasi realtime aktif"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sinkron Aktif</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Kolom Adm. Siswa */}
            <div className="rounded-xl bg-white border p-3" style={{ borderColor: "rgba(21,101,192,0.25)" }} data-testid="kolom-saldo-adm-siswa">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4" style={{ color: "#0d47a1" }} />
                <span className="text-xs font-semibold" style={{ color: "#0d47a1" }}>Dari Adm. Keuangan Siswa</span>
              </div>
              <p className="text-xl font-bold" style={{ color: "#0d47a1" }} data-testid="text-saldo-dari-adm-siswa">
                {formatRupiah(admSiswaSummary.total_saldo)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Otomatis dari total pembayaran siswa.{" "}
                <Link href="/adm-siswa" className="underline" style={{ color: "#1565c0" }}>Buka Adm. Siswa →</Link>
              </p>
            </div>

            {/* Kolom Saldo Manual */}
            <div className="rounded-xl bg-white border p-3" style={{ borderColor: "rgba(21,101,192,0.25)" }} data-testid="kolom-saldo-manual">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" style={{ color: "#15803d" }} />
                  <span className="text-xs font-semibold" style={{ color: "#15803d" }}>Saldo Awal Manual Tambahan</span>
                </div>
                {access === "CRUD" && (
                  <button
                    type="button"
                    onClick={() => { resetManualForm(); setShowManualModal(true); }}
                    className="text-[11px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1"
                    style={{ background: "#15803d", color: "white" }}
                    data-testid="button-kelola-saldo-manual"
                  >
                    <Settings className="w-3 h-3" /> Kelola
                  </button>
                )}
              </div>
              <p className="text-xl font-bold" style={{ color: "#15803d" }} data-testid="text-saldo-manual">
                {formatRupiah(totalSaldoManual)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {manualEntries.length === 0
                  ? "Belum ada entri saldo manual."
                  : `${manualEntries.length} entri tercatat.`}
              </p>
            </div>
          </div>

          {/* Total Saldo Awal Gabungan */}
          <div
            className="mt-3 rounded-xl p-3 flex items-center justify-between text-white"
            style={{ background: "#1565c0" }}
            data-testid="row-total-saldo-awal-tkyaris"
          >
            <span className="text-sm font-semibold">TOTAL SALDO AWAL</span>
            <span className="text-lg font-bold" data-testid="text-total-saldo-awal-tkyaris">
              {formatRupiah(admSiswaSummary.total_saldo + totalSaldoManual)}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground mt-2 text-right">
            Update terakhir: {admSiswaSummary.updated_at ? new Date(admSiswaSummary.updated_at).toLocaleString("id-ID") : "-"}
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className={`grid grid-cols-1 ${isTKYaris ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"} gap-4`}>
        {isTKYaris && (
          <button
            type="button"
            onClick={() => { resetManualForm(); setShowManualModal(true); }}
            className="rounded-2xl p-4 border text-left hover:opacity-90 transition-opacity"
            style={{ borderColor: "rgba(69,39,160,0.3)", background: "linear-gradient(135deg, rgba(69,39,160,0.08), rgba(124,58,237,0.06))" }}
            data-testid="card-saldo-awal-tkyaris"
            title="Klik untuk mengelola saldo manual"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#4527a0" }}>
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs text-muted-foreground">Saldo Awal (Total)</span>
            </div>
            <p className="text-lg font-bold" style={{ color: "#4527a0" }} data-testid="saldo-awal-tkyaris">{formatRupiah(saldoAwalDivisi)}</p>
            <div className="mt-1 space-y-0.5">
              <p className="text-[10px] text-muted-foreground">📋 Adm. Siswa: <span className="font-semibold" style={{ color: "#0d47a1" }}>{formatRupiah(admSiswaSummary.total_saldo)}</span></p>
              <p className="text-[10px] text-muted-foreground">➕ Manual: <span className="font-semibold" style={{ color: "#15803d" }}>{formatRupiah(totalSaldoManual)}</span></p>
            </div>
          </button>
        )}
        <div className="bg-card rounded-2xl p-4 border" style={{ borderColor: "hsl(var(--card-border))" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs text-muted-foreground">Total Uang Masuk</span>
          </div>
          <p className="text-lg font-bold text-green-600" data-testid="total-masuk">{formatRupiah(totalMasuk)}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border" style={{ borderColor: "hsl(var(--card-border))" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-xs text-muted-foreground">Total Uang Keluar</span>
          </div>
          <p className="text-lg font-bold text-red-500" data-testid="total-keluar">{formatRupiah(totalKeluar)}</p>
        </div>
        <div className={`rounded-2xl p-4 border ${saldoAkhir >= 0 ? "bg-green-50" : "bg-red-50"}`}
          style={{ borderColor: saldoAkhir >= 0 ? "#bbf7d0" : "#fecaca" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${saldoAkhir >= 0 ? "bg-green-100" : "bg-red-100"}`}>
              <Wallet className={`w-4 h-4 ${saldoAkhir >= 0 ? "text-green-600" : "text-red-500"}`} />
            </div>
            <span className="text-xs text-muted-foreground">Saldo Akhir</span>
          </div>
          <p className={`text-lg font-bold ${saldoAkhir >= 0 ? "text-green-700" : "text-red-600"}`} data-testid="saldo-akhir">{formatRupiah(saldoAkhir)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(var(--card-border))" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-transaksi">
            <thead>
              <tr style={{ background: "hsl(var(--muted))", borderBottom: "1px solid hsl(var(--border))" }}>
                {["No", "Tanggal", "Uraian", "Rencana", "Uang Masuk", "Uang Keluar", "Saldo Akhir", "Keterangan", "Nota", "Aksi"].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayTransaksi.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    Belum ada transaksi. {access === "CRUD" && "Klik \"Tambah\" untuk menambahkan transaksi baru."}
                  </td>
                </tr>
              ) : (
                displayTransaksi.map((t, i) => (
                  <tr key={t.id} className="border-b hover:bg-muted/30 transition-colors"
                    style={{ borderColor: "hsl(var(--border))" }}
                    data-testid={`row-transaksi-${t.id}`}>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5 text-foreground whitespace-nowrap text-xs">{formatDate(t.tanggal)}</td>
                    <td className="px-3 py-2.5 text-foreground max-w-[180px] truncate" title={t.uraian}>{t.uraian}</td>
                    <td className="px-3 py-2.5 text-right text-foreground text-xs whitespace-nowrap">{t.rencana > 0 ? formatRupiah(t.rencana) : "-"}</td>
                    <td className="px-3 py-2.5 text-right text-green-600 font-medium text-xs whitespace-nowrap">{t.uang_masuk > 0 ? formatRupiah(t.uang_masuk) : "-"}</td>
                    <td className="px-3 py-2.5 text-right text-red-500 font-medium text-xs whitespace-nowrap">{t.uang_keluar > 0 ? formatRupiah(t.uang_keluar) : "-"}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold text-xs whitespace-nowrap ${t.saldo_akhir >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {formatRupiah(t.saldo_akhir)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[120px] truncate" title={t.keterangan}>{t.keterangan || "-"}</td>
                    <td className="px-3 py-2.5">
                      {t.nota ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleViewNota(t.nota!)} className="p-1 rounded-lg hover:bg-blue-100 text-blue-500" title="Lihat nota">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleViewNota(t.nota!)} className="p-1 rounded-lg hover:bg-green-100 text-green-600" title="Unduh nota">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {access === "CRUD" && (
                        <div className="flex gap-1">
                          <button onClick={() => handleOpenEdit(t)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors" title="Edit"
                            data-testid={`button-edit-${t.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors" title="Hapus"
                            data-testid={`button-delete-${t.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {displayTransaksi.length > 0 && (
              <tfoot>
                <tr style={{ background: "hsl(var(--muted))", borderTop: "2px solid hsl(var(--border))" }}>
                  <td colSpan={3} className="px-3 py-2.5 text-xs font-bold text-foreground">TOTAL</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-foreground">-</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-green-600">{formatRupiah(totalMasuk)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-red-500">{formatRupiah(totalKeluar)}</td>
                  <td className={`px-3 py-2.5 text-right text-xs font-bold ${saldoAkhir >= 0 ? "text-green-600" : "text-red-500"}`}>{formatRupiah(saldoAkhir)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Import Dokumen Section (UD Amanah & Toko Batu Alam) */}
      {isImportable && (
        <ImportDokumenSection
          unit={divisi as "amanah" | "batualam"}
          canCRUD={access === "CRUD"}
          onAfterSync={() => setRefresh(r => r + 1)}
        />
      )}

      {/* Modal Import Dokumen */}
      {isImportable && (
        <ImportDokumenModal
          unit={divisi as "amanah" | "batualam"}
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          createdBy={user?.username || "user"}
          onImported={(count, dilewati) => {
            const msg = dilewati > 0
              ? `${count} baris diimport, ${dilewati} duplikat dilewati.`
              : `${count} baris berhasil diimport ke Data Import Dokumen.`;
            showToast(msg);
          }}
        />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 my-auto">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <h3 className="font-semibold text-foreground">{editId ? "Edit Transaksi" : "Tambah Transaksi"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Tanggal <span className="text-red-500">*</span></label>
                  <input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ borderColor: "hsl(var(--border))" }} data-testid="input-tanggal" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Rencana (Rp)</label>
                  <input type="number" min={0} value={form.rencana || ""}
                    onChange={e => setForm(f => ({ ...f, rencana: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ borderColor: "hsl(var(--border))" }} data-testid="input-rencana" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Uraian <span className="text-red-500">*</span></label>
                <input type="text" value={form.uraian} onChange={e => setForm(f => ({ ...f, uraian: e.target.value }))}
                  placeholder="Keterangan transaksi"
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }} data-testid="input-uraian" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Uang Masuk (Rp)</label>
                  <input type="number" min={0} value={form.uang_masuk || ""}
                    onChange={e => setForm(f => ({ ...f, uang_masuk: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ borderColor: "hsl(var(--border))" }} data-testid="input-uang-masuk" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Uang Keluar (Rp)</label>
                  <input type="number" min={0} value={form.uang_keluar || ""}
                    onChange={e => setForm(f => ({ ...f, uang_keluar: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ borderColor: "hsl(var(--border))" }} data-testid="input-uang-keluar" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Keterangan</label>
                <textarea value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Catatan tambahan (opsional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  style={{ borderColor: "hsl(var(--border))" }} data-testid="input-keterangan" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Upload Nota</label>
                {form.nota ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: "hsl(var(--border))" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{form.nota.nama}</p>
                      <p className="text-xs text-muted-foreground">{form.nota.tipe}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleViewNota(form.nota!)} className="text-xs text-blue-500 hover:underline">Lihat</button>
                      <button onClick={() => setForm(f => ({ ...f, nota: null }))} className="text-xs text-red-500 hover:underline">Hapus</button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed cursor-pointer hover:bg-muted transition-colors"
                    style={{ borderColor: "hsl(var(--border))" }}>
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Klik untuk upload nota (PDF, JPG, PNG, maks 2MB)</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleNotaUpload} data-testid="input-nota" />
                  </label>
                )}
                {notaError && <p className="text-xs text-red-500 mt-1">{notaError}</p>}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t" style={{ borderColor: "hsl(var(--border))" }}>
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors hover:bg-muted"
                style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
              <button onClick={handleSave}
                data-testid="button-save-transaksi"
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all"
                style={{ background: config.color }}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
