import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  calcCashLunak, generateId,
  formatDate, CashLunak, Cicilan
} from "@/lib/types";
import { cashLunakApi } from "@/lib/api";

// Cash Lunak — local Rupiah formatter (strict spec: "Rp 173.000.000")
function formatRupiah(angka: number | null | undefined): string {
  if (angka === null || angka === undefined || (typeof angka === "number" && isNaN(angka))) return "Rp 0";
  const nilai = Number(angka) || 0;
  const negatif = nilai < 0;
  const absolut = Math.abs(Math.trunc(nilai));
  const formatted = absolut.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return negatif ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

// Parse a Rupiah-formatted input back to a number (strip everything except digits)
function parseRupiah(str: string): number {
  if (!str) return 0;
  const digits = String(str).replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  Plus, Eye, Pencil, Trash2, FileText, FileSpreadsheet, Printer,
  Search, RotateCcw, AlertCircle, CheckCircle, Clock, Coins,
  ChevronLeft, ChevronRight, X, CreditCard, Home, Wallet, TrendingUp
} from "lucide-react";

const PER_PAGE = 10;
const TENOR_OPTIONS = [12, 24, 36, 48, 60];
const PERUMAHAN_COLOR = "#1b5e20";
const STATUS_COLORS = { Lunas: "#16a34a", "Belum Lunas": "#ea580c" };

const EMPTY_FORM = {
  nama_pembeli: "", blok: "", tanggal_dp: "", harga_unit: 0, jumlah_dp: 0,
  tenor: 12, keterangan: "",
};

type ModalMode = "add" | "edit" | "view" | "cicilan" | null;

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-5 right-5 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium fade-in flex items-center gap-2 ${type === "success" ? "bg-green-600" : "bg-red-500"}`}>
      {type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
    </div>
  );
}

function ConfirmDialog({ title, message, onConfirm, onCancel, confirmText = "Ya, Hapus" }: { title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmText?: string }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex-shrink-0 flex items-center justify-center mt-0.5">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">{title}</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
            style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "20", color }}>
          {icon}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// For controlled input fields — display "Rp X.XXX.XXX" while typing, blank when 0
function formatRupiahInput(v: number): string {
  if (!v) return "";
  return "Rp " + new Intl.NumberFormat("id-ID").format(v);
}

export default function CashLunakPage() {
  const { hasAccess } = useAuth();
  const access = hasAccess("cashlunak");
  const canEdit = access === "CRUD";

  const [allData, setAllData] = useState<CashLunak[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmCicilanId, setConfirmCicilanId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [filterOpen, setFilterOpen] = useState(true);

  const [fNama, setFNama] = useState("");
  const [fBlok, setFBlok] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fTenor, setFTenor] = useState("");
  const [fDari, setFDari] = useState("");
  const [fSampai, setFSampai] = useState("");

  // Cicilan form state (within the cicilan modal)
  const [cicilanForm, setCicilanForm] = useState({ tanggal_bayar: "", jumlah_bayar: 0, keterangan: "" });

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await cashLunakApi.list();
      setAllData(data);
    } catch (e) {
      console.error("Gagal load data", e);
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    return allData.filter(item => {
      if (fNama && !item.nama_pembeli.toLowerCase().includes(fNama.toLowerCase())) return false;
      if (fBlok && !item.blok.toLowerCase().includes(fBlok.toLowerCase())) return false;
      if (fStatus) {
        const c = calcCashLunak(item);
        if (c.status !== fStatus) return false;
      }
      if (fTenor) {
        if (fTenor === "lainnya") {
          if (TENOR_OPTIONS.includes(item.tenor)) return false;
        } else if (item.tenor !== Number(fTenor)) return false;
      }
      if (fDari && item.tanggal_dp < fDari) return false;
      if (fSampai && item.tanggal_dp > fSampai) return false;
      return true;
    });
  }, [allData, fNama, fBlok, fStatus, fTenor, fDari, fSampai]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageData = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // Stats
  const stats = useMemo(() => {
    const totalUnit = allData.length;
    let lunas = 0, belum = 0, totalTerima = 0;
    allData.forEach(item => {
      const c = calcCashLunak(item);
      if (c.status === "Lunas") lunas++;
      else belum++;
      totalTerima += c.totalTerbayar;
    });
    return { totalUnit, lunas, belum, totalTerima };
  }, [allData]);

  // Chart data
  const donutData = useMemo(() => [
    { name: "Lunas", value: stats.lunas, color: STATUS_COLORS.Lunas },
    { name: "Belum Lunas", value: stats.belum, color: STATUS_COLORS["Belum Lunas"] },
  ], [stats]);

  const barData = useMemo(() => {
    return allData.slice(0, 10).map(item => {
      const c = calcCashLunak(item);
      return {
        name: `${item.nama_pembeli} (${item.blok})`,
        Terbayar: c.totalTerbayar / 1_000_000,
        Sisa: c.sisaBayar / 1_000_000,
      };
    });
  }, [allData]);

  // Reset filter
  const resetFilter = () => {
    setFNama(""); setFBlok(""); setFStatus(""); setFTenor(""); setFDari(""); setFSampai("");
    setPage(1);
  };

  // Open add modal
  const openAdd = () => {
    setForm({ ...EMPTY_FORM, tanggal_dp: new Date().toISOString().slice(0, 10) });
    setSelectedId(null);
    setModalMode("add");
  };

  // Open edit modal
  const openEdit = (item: CashLunak) => {
    setForm({
      nama_pembeli: item.nama_pembeli,
      blok: item.blok,
      tanggal_dp: item.tanggal_dp,
      harga_unit: item.harga_unit,
      jumlah_dp: item.jumlah_dp,
      tenor: item.tenor,
      keterangan: item.keterangan,
    });
    setSelectedId(item.id);
    setModalMode("edit");
  };

  // Open detail modal
  const openDetail = (item: CashLunak) => {
    setSelectedId(item.id);
    setModalMode("view");
  };

  // Open cicilan modal
  const openCicilan = (item: CashLunak) => {
    const c = calcCashLunak(item);
    setSelectedId(item.id);
    setCicilanForm({
      tanggal_bayar: new Date().toISOString().slice(0, 10),
      jumlah_bayar: Math.min(c.cicilanPerBulan, c.sisaBayar),
      keterangan: "",
    });
    setModalMode("cicilan");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedId(null);
    setForm({ ...EMPTY_FORM });
  };

  // Save (add/edit)
  const handleSave = async () => {
    if (!canEdit) { showToast("Anda tidak memiliki izin", "error"); return; }
    if (!form.nama_pembeli.trim() || form.nama_pembeli.trim().length < 3) {
      showToast("Nama pembeli minimal 3 karakter", "error"); return;
    }
    if (!form.blok.trim()) { showToast("Blok unit wajib diisi", "error"); return; }
    if (!form.tanggal_dp) { showToast("Tanggal DP wajib diisi", "error"); return; }
    if (form.harga_unit <= 0) { showToast("Harga unit harus lebih dari 0", "error"); return; }
    if (form.jumlah_dp <= 0) { showToast("Jumlah DP harus lebih dari Rp 0", "error"); return; }
    if (form.jumlah_dp >= form.harga_unit) {
      showToast("Jumlah DP tidak boleh sama dengan atau melebihi Harga Unit", "error"); return;
    }
    if (form.tenor < 1) { showToast("Tenor minimal 1 bulan", "error"); return; }
    if ((form.keterangan || "").length > 300) { showToast("Keterangan maks 300 karakter", "error"); return; }

    try {
      if (modalMode === "edit" && selectedId) {
        await cashLunakApi.update(selectedId, {
          nama_pembeli: form.nama_pembeli.trim(),
          blok: form.blok.trim(),
          tanggal_dp: form.tanggal_dp,
          harga_unit: form.harga_unit,
          jumlah_dp: form.jumlah_dp,
          tenor: form.tenor,
          keterangan: form.keterangan,
        });
      } else {
        await cashLunakApi.create({
          nama_pembeli: form.nama_pembeli.trim(),
          blok: form.blok.trim(),
          tanggal_dp: form.tanggal_dp,
          harga_unit: form.harga_unit,
          jumlah_dp: form.jumlah_dp,
          tenor: form.tenor,
          keterangan: form.keterangan,
        });
      }
      loadData();
      closeModal();
      showToast(modalMode === "edit" ? "Data berhasil diperbarui" : "Data berhasil ditambahkan");
    } catch (e: any) {
      showToast(e?.message || "Gagal menyimpan data", "error");
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!canEdit) { showToast("Anda tidak memiliki izin", "error"); return; }
    try {
      await cashLunakApi.delete(id);
      loadData();
      setConfirmId(null);
      showToast("Data berhasil dihapus");
    } catch (e: any) {
      showToast(e?.message || "Gagal menghapus data", "error");
    }
  };

  // Add cicilan
  const handleAddCicilan = async () => {
    if (!canEdit) { showToast("Anda tidak memiliki izin", "error"); return; }
    if (!selectedId) return;
    const all = allData;
    const idx = all.findIndex(x => x.id === selectedId);
    if (idx === -1) return;
    const item = all[idx];
    const c = calcCashLunak(item);
    if (!cicilanForm.tanggal_bayar) { showToast("Tanggal bayar wajib diisi", "error"); return; }
    if (cicilanForm.jumlah_bayar <= 0) { showToast("Jumlah bayar harus > 0", "error"); return; }
    if (cicilanForm.jumlah_bayar > c.sisaBayar) {
      showToast(`Jumlah bayar melebihi sisa (${formatRupiah(c.sisaBayar)})`, "error"); return;
    }
    try {
      await cashLunakApi.addCicilan(selectedId, {
        tanggal_bayar: cicilanForm.tanggal_bayar,
        jumlah_bayar: cicilanForm.jumlah_bayar,
        keterangan: cicilanForm.keterangan,
      });
      loadData();
      setCicilanForm({ tanggal_bayar: new Date().toISOString().slice(0, 10), jumlah_bayar: 0, keterangan: "" });
      showToast("Pembayaran berhasil dicatat");
    } catch (e: any) {
      showToast(e?.message || "Gagal menyimpan", "error");
    }
  };

  // Delete cicilan
  const handleDeleteCicilan = async (cicilanId: string) => {
    if (!selectedId) return;
    try {
      await cashLunakApi.deleteCicilan(selectedId, cicilanId);
      loadData();
      setConfirmCicilanId(null);
      showToast("Cicilan berhasil dihapus");
    } catch (e: any) {
      showToast(e?.message || "Gagal menghapus", "error");
    }
  };

  // Export PDF (rekap)
  const exportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(15);
      doc.text("Rekap Cash Lunak — Divisi Perumahan", 14, 14);
      doc.setFontSize(9);
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 21);
      doc.text(`Total Data: ${filtered.length} | Lunas: ${stats.lunas} | Belum Lunas: ${stats.belum}`, 14, 27);

      const head = [["No", "Nama", "Blok", "Tgl DP", "Harga Unit", "DP", "Tenor", "Cicilan/Bln", "Terbayar", "Sisa", "Status"]];
      let totHarga = 0, totDP = 0, totTerbayar = 0, totSisa = 0;
      const body = filtered.map((item, i) => {
        const c = calcCashLunak(item);
        totHarga += item.harga_unit; totDP += item.jumlah_dp;
        totTerbayar += c.totalTerbayar; totSisa += c.sisaBayar;
        return [
          i + 1, item.nama_pembeli, item.blok, formatDate(item.tanggal_dp),
          formatRupiah(item.harga_unit), formatRupiah(item.jumlah_dp),
          `${item.tenor} bln`, formatRupiah(c.cicilanPerBulan),
          formatRupiah(c.totalTerbayar), formatRupiah(c.sisaBayar), c.status,
        ];
      });
      autoTable(doc, {
        head, body, startY: 32,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [27, 94, 32] },
        foot: [
          ["", "TOTAL", "", "", formatRupiah(totHarga), formatRupiah(totDP), "", "", formatRupiah(totTerbayar), formatRupiah(totSisa), ""],
        ],
        footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
      });
      const finalY = (doc as any).lastAutoTable?.finalY || 40;
      doc.setFontSize(9);
      doc.text(`Total Harga Seluruh Unit : ${formatRupiah(totHarga)}`, 14, finalY + 8);
      doc.text(`Total DP Diterima        : ${formatRupiah(totDP)}`, 14, finalY + 14);
      doc.text(`Total Terbayar           : ${formatRupiah(totTerbayar)}`, 14, finalY + 20);
      doc.text(`Total Sisa               : ${formatRupiah(totSisa)}`, 14, finalY + 26);
      doc.save(`rekap-cash-lunak-${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast("PDF berhasil diunduh");
    } catch (e: any) {
      showToast(e?.message || "Gagal export PDF", "error");
    }
  };

  // Export Excel
  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const headers1 = ["No", "Nama Pembeli", "Blok", "Tanggal DP", "Harga Unit", "Jumlah DP", "Tenor (bln)", "Cicilan/Bulan", "Total Terbayar", "Sisa Pembayaran", "Status", "Keterangan"];
      let totHarga = 0, totDP = 0, totTerbayar = 0, totSisa = 0;
      const rows1 = filtered.map((item, i) => {
        const c = calcCashLunak(item);
        totHarga += item.harga_unit; totDP += item.jumlah_dp;
        totTerbayar += c.totalTerbayar; totSisa += c.sisaBayar;
        return [
          i + 1, item.nama_pembeli, item.blok, formatDate(item.tanggal_dp),
          formatRupiah(item.harga_unit), formatRupiah(item.jumlah_dp),
          item.tenor, formatRupiah(c.cicilanPerBulan),
          formatRupiah(c.totalTerbayar), formatRupiah(c.sisaBayar),
          c.status, item.keterangan,
        ];
      });
      const totalRow = ["", "TOTAL", "", "", formatRupiah(totHarga), formatRupiah(totDP), "", "", formatRupiah(totTerbayar), formatRupiah(totSisa), "", ""];
      const ws1 = XLSX.utils.aoa_to_sheet([headers1, ...rows1, [], totalRow]);
      XLSX.utils.book_append_sheet(wb, ws1, "Rekap Cash Lunak");

      const headers2 = ["No", "Nama Pembeli", "Blok", "Tanggal Bayar", "Cicilan Ke-", "Jumlah Bayar", "Keterangan"];
      const rows2: any[][] = [];
      let no = 1;
      filtered.forEach(item => {
        (item.cicilan || []).forEach((c, ci) => {
          rows2.push([no++, item.nama_pembeli, item.blok, formatDate(c.tanggal_bayar), ci + 1, formatRupiah(c.jumlah_bayar), c.keterangan]);
        });
      });
      const ws2 = XLSX.utils.aoa_to_sheet([headers2, ...rows2]);
      XLSX.utils.book_append_sheet(wb, ws2, "Histori Cicilan");

      XLSX.writeFile(wb, `rekap-cash-lunak-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast("Excel berhasil diunduh");
    } catch (e: any) {
      showToast(e?.message || "Gagal export Excel", "error");
    }
  };

  // Print
  const handlePrint = () => window.print();

  // Selected item & calc
  const selectedItem = selectedId ? allData.find(x => x.id === selectedId) : null;
  const selectedCalc = selectedItem ? calcCashLunak(selectedItem) : null;

  // Form preview calc
  const formCalc = useMemo(() => {
    const sisaPokok = Math.max(0, form.harga_unit - form.jumlah_dp);
    const cicilanPerBulan = form.tenor > 0 ? Math.ceil(sisaPokok / form.tenor) : 0;
    const totalCicilan = cicilanPerBulan * form.tenor;
    return { sisaPokok, cicilanPerBulan, totalCicilan, totalBayar: form.jumlah_dp + totalCicilan };
  }, [form.harga_unit, form.jumlah_dp, form.tenor]);

  if (access === "NONE") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-2xl text-red-500 font-bold">!</span>
        </div>
        <p className="text-lg font-semibold text-foreground">Akses Ditolak</p>
        <p className="text-muted-foreground text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Memuat data cash lunak...</div>;
  }

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} />}
      {confirmId && (() => {
        const it = allData.find(x => x.id === confirmId);
        return (
          <ConfirmDialog
            title="Hapus Data Cash Lunak?"
            message={`Data atas nama ${it?.nama_pembeli || "-"} blok ${it?.blok || "-"} beserta seluruh histori cicilan akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
            onConfirm={() => handleDelete(confirmId)}
            onCancel={() => setConfirmId(null)}
          />
        );
      })()}
      {confirmCicilanId && (
        <ConfirmDialog
          title="Hapus Pembayaran?"
          message="Pembayaran cicilan ini akan dihapus dan total terbayar akan dihitung ulang."
          onConfirm={() => handleDeleteCicilan(confirmCicilanId)}
          onCancel={() => setConfirmCicilanId(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: PERUMAHAN_COLOR }} />
            <h1 className="text-xl font-bold text-foreground">Cash Lunak — Divisi Perumahan</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Pencatatan penjualan unit dengan cicilan tanpa bank/KPR</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportPDF} data-testid="btn-export-pdf" className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5"
            style={{ borderColor: "hsl(var(--border))" }}>
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={exportExcel} data-testid="btn-export-excel" className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5"
            style={{ borderColor: "hsl(var(--border))" }}>
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={handlePrint} className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5"
            style={{ borderColor: "hsl(var(--border))" }}>
            <Printer className="w-3.5 h-3.5" /> Cetak
          </button>
          {canEdit && (
            <button onClick={openAdd} data-testid="btn-add-cashlunak" className="px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5"
              style={{ background: PERUMAHAN_COLOR }}>
              <Plus className="w-3.5 h-3.5" /> Tambah Data
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Unit" value={String(stats.totalUnit)} sub="unit terdaftar" icon={<Home className="w-5 h-5" />} color="#3b82f6" />
        <StatCard label="Sudah Lunas" value={String(stats.lunas)} sub={stats.totalUnit > 0 ? `${Math.round((stats.lunas / stats.totalUnit) * 100)}% dari total` : "-"} icon={<CheckCircle className="w-5 h-5" />} color="#16a34a" />
        <StatCard label="Belum Lunas" value={String(stats.belum)} sub={stats.totalUnit > 0 ? `${Math.round((stats.belum / stats.totalUnit) * 100)}% dari total` : "-"} icon={<Clock className="w-5 h-5" />} color="#ea580c" />
        <StatCard label="Total Diterima" value={formatRupiah(stats.totalTerima)} sub="DP + cicilan" icon={<Wallet className="w-5 h-5" />} color="#8b5cf6" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
          <h3 className="text-sm font-semibold text-foreground mb-3">Status Pembayaran Cash Lunak</h3>
          {stats.totalUnit === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} label={(e: any) => `${e.value}`}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: any, _n, p: any) => [`${v} unit (${stats.totalUnit > 0 ? Math.round((Number(v) / stats.totalUnit) * 100) : 0}%)`, p.payload.name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
          <h3 className="text-sm font-semibold text-foreground mb-3">Progres Pembayaran per Pembeli</h3>
          {barData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${v}jt`} fontSize={10} />
                <YAxis type="category" dataKey="name" width={100} fontSize={9} />
                <Tooltip formatter={(v: any, name: any) => [formatRupiah(Number(v) * 1_000_000), name]} />
                <Legend />
                <Bar dataKey="Terbayar" stackId="a" fill={STATUS_COLORS.Lunas} />
                <Bar dataKey="Sisa" stackId="a" fill={STATUS_COLORS["Belum Lunas"]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="bg-card rounded-2xl border" style={{ borderColor: "hsl(var(--card-border))" }}>
        <button onClick={() => setFilterOpen(o => !o)} className="w-full flex items-center justify-between p-4 text-left">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Search className="w-4 h-4" /> Filter & Pencarian
          </div>
          <ChevronRight className={`w-4 h-4 transition-transform ${filterOpen ? "rotate-90" : ""}`} />
        </button>
        {filterOpen && (
          <div className="p-4 pt-0 space-y-3 border-t" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cari Nama</label>
                <input type="text" value={fNama} onChange={e => { setFNama(e.target.value); setPage(1); }}
                  data-testid="filter-nama"
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cari Blok</label>
                <input type="text" value={fBlok} onChange={e => { setFBlok(e.target.value); setPage(1); }}
                  data-testid="filter-blok"
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status Lunas</label>
                <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1); }}
                  data-testid="filter-status"
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}>
                  <option value="">Semua Status</option>
                  <option value="Lunas">Lunas</option>
                  <option value="Belum Lunas">Belum Lunas</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tenor</label>
                <select value={fTenor} onChange={e => { setFTenor(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}>
                  <option value="">Semua Tenor</option>
                  {TENOR_OPTIONS.map(t => <option key={t} value={t}>{t} bulan</option>)}
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tanggal DP Dari</label>
                <input type="date" value={fDari} onChange={e => { setFDari(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tanggal DP Sampai</label>
                <input type="date" value={fSampai} onChange={e => { setFSampai(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
              </div>
            </div>
            <div className="flex justify-between items-center pt-1">
              <p className="text-xs text-muted-foreground">Menampilkan {filtered.length} dari {allData.length} total data</p>
              <button onClick={resetFilter} className="px-3 py-1.5 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5"
                style={{ borderColor: "hsl(var(--border))" }}>
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(var(--card-border))" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: PERUMAHAN_COLOR }}>
              <tr className="text-white">
                <th className="px-3 py-3 text-left text-xs font-semibold">No</th>
                <th className="px-3 py-3 text-left text-xs font-semibold">Nama / Pembeli</th>
                <th className="px-3 py-3 text-left text-xs font-semibold">Blok</th>
                <th className="px-3 py-3 text-left text-xs font-semibold">Tgl DP</th>
                <th className="px-3 py-3 text-right text-xs font-semibold">Harga Unit</th>
                <th className="px-3 py-3 text-right text-xs font-semibold">DP</th>
                <th className="px-3 py-3 text-center text-xs font-semibold">Tenor</th>
                <th className="px-3 py-3 text-right text-xs font-semibold">Cicilan/Bln</th>
                <th className="px-3 py-3 text-right text-xs font-semibold">Terbayar</th>
                <th className="px-3 py-3 text-right text-xs font-semibold">Sisa</th>
                <th className="px-3 py-3 text-center text-xs font-semibold">Status</th>
                <th className="px-3 py-3 text-center text-xs font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={12} className="px-3 py-10 text-center text-muted-foreground text-sm">
                  {allData.length === 0 ? "Belum ada data Cash Lunak. Klik 'Tambah Data' untuk memulai." : "Tidak ada data yang sesuai dengan filter"}
                </td></tr>
              ) : pageData.map((item, i) => {
                const c = calcCashLunak(item);
                const rowBg = c.status === "Lunas" ? "#f1f8e9" : "transparent";
                return (
                  <tr key={item.id} className="border-b text-xs hover:bg-muted/20" style={{ borderColor: "hsl(var(--border))", background: rowBg }} data-testid={`row-${item.id}`}>
                    <td className="px-3 py-3">{(currentPage - 1) * PER_PAGE + i + 1}</td>
                    <td className="px-3 py-3 font-medium text-foreground">{item.nama_pembeli}</td>
                    <td className="px-3 py-3">{item.blok}</td>
                    <td className="px-3 py-3">{formatDate(item.tanggal_dp)}</td>
                    <td className="px-3 py-3 text-right">{formatRupiah(item.harga_unit)}</td>
                    <td className="px-3 py-3 text-right font-semibold" style={{ color: item.jumlah_dp > 0 ? "#1b5e20" : "#9ca3af" }}>{formatRupiah(item.jumlah_dp)}</td>
                    <td className="px-3 py-3 text-center">{item.tenor} bln</td>
                    <td className="px-3 py-3 text-right font-semibold" style={{ color: "#0d47a1" }}>{formatRupiah(c.cicilanPerBulan)}</td>
                    <td className="px-3 py-3 text-right text-green-700 font-medium">{formatRupiah(c.totalTerbayar)}</td>
                    <td className={`px-3 py-3 text-right font-medium ${c.sisaBayar > 0 ? "text-red-600" : "text-green-700"}`}>{formatRupiah(c.sisaBayar)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${c.status === "Lunas" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => openDetail(item)} title="Detail" className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600" data-testid={`btn-view-${item.id}`}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <>
                            <button onClick={() => openCicilan(item)} title="Bayar Cicilan" className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-600" data-testid={`btn-cicilan-${item.id}`}>
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(item)} title="Edit" className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600" data-testid={`btn-edit-${item.id}`}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirmId(item.id)} title="Hapus" className="p-1.5 rounded-lg hover:bg-red-100 text-red-600" data-testid={`btn-delete-${item.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="text-xs text-muted-foreground">
              Menampilkan {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} dari {filtered.length} data
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "hsl(var(--border))" }}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs">Hal {currentPage} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "hsl(var(--border))" }}>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <h3 className="text-base font-bold text-foreground">{modalMode === "add" ? "Tambah Data Cash Lunak Baru" : "Edit Data Cash Lunak"}</h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {modalMode === "edit" && selectedItem && (selectedItem.cicilan?.length || 0) > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>Mengubah harga/tenor akan mempengaruhi kalkulasi cicilan. Histori pembayaran tidak berubah, namun sisa pembayaran dihitung ulang.</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nama Pembeli *</label>
                  <input type="text" value={form.nama_pembeli} onChange={e => setForm({ ...form, nama_pembeli: e.target.value })}
                    data-testid="input-nama"
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Blok Unit *</label>
                  <input type="text" value={form.blok} onChange={e => setForm({ ...form, blok: e.target.value })}
                    placeholder="Contoh: A-01"
                    data-testid="input-blok"
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tanggal DP *</label>
                  <input type="date" value={form.tanggal_dp} onChange={e => setForm({ ...form, tanggal_dp: e.target.value })}
                    data-testid="input-tanggal-dp"
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tenor (bulan) *</label>
                  <div className="flex gap-2">
                    <select value={TENOR_OPTIONS.includes(form.tenor) ? String(form.tenor) : "custom"}
                      onChange={e => { if (e.target.value !== "custom") setForm({ ...form, tenor: Number(e.target.value) }); }}
                      className="px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}>
                      {TENOR_OPTIONS.map(t => <option key={t} value={t}>{t} bln</option>)}
                      <option value="custom">Custom</option>
                    </select>
                    <input type="number" min={1} value={form.tenor} onChange={e => setForm({ ...form, tenor: Math.max(1, Number(e.target.value) || 1) })}
                      data-testid="input-tenor"
                      className="flex-1 px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Harga Unit *</label>
                  <input type="text" value={formatRupiahInput(form.harga_unit)} onChange={e => setForm({ ...form, harga_unit: parseRupiah(e.target.value) })}
                    placeholder="0"
                    data-testid="input-harga"
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Jumlah DP *</label>
                  <input type="text" value={formatRupiahInput(form.jumlah_dp)} onChange={e => setForm({ ...form, jumlah_dp: parseRupiah(e.target.value) })}
                    placeholder="0"
                    data-testid="input-dp"
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Keterangan (opsional, maks 300 karakter)</label>
                  <textarea value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value.slice(0, 300) })}
                    rows={2} className="w-full px-3 py-2 rounded-xl border text-sm bg-background resize-none" style={{ borderColor: "hsl(var(--border))" }} />
                </div>
              </div>
              {/* Real-time calculation preview */}
              <div className="rounded-xl p-4 bg-muted/40 border" style={{ borderColor: "hsl(var(--border))" }}>
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Preview Kalkulasi
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Sisa Pokok</span><span className="font-medium">{formatRupiah(formCalc.sisaPokok)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Cicilan/Bln</span><span className="font-semibold text-green-700">{formatRupiah(formCalc.cicilanPerBulan)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Cicilan</span><span className="font-medium">{formatRupiah(formCalc.totalCicilan)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Bayar</span><span className="font-medium">{formatRupiah(formCalc.totalBayar)}</span></div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: "hsl(var(--border))" }}>
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted"
                style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
              <button onClick={handleSave} data-testid="btn-save-cashlunak" className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: PERUMAHAN_COLOR }}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {modalMode === "view" && selectedItem && selectedCalc && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <h3 className="text-base font-bold text-foreground">Detail Cash Lunak</h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Nama Pembeli</p><p className="font-semibold">{selectedItem.nama_pembeli}</p></div>
                <div><p className="text-xs text-muted-foreground">Blok Unit</p><p className="font-semibold">{selectedItem.blok}</p></div>
                <div><p className="text-xs text-muted-foreground">Tanggal DP</p><p className="font-semibold">{formatDate(selectedItem.tanggal_dp)}</p></div>
                <div><p className="text-xs text-muted-foreground">Tenor</p><p className="font-semibold">{selectedItem.tenor} bulan</p></div>
                <div><p className="text-xs text-muted-foreground">Harga Unit</p><p className="font-semibold">{formatRupiah(selectedItem.harga_unit)}</p></div>
                <div><p className="text-xs text-muted-foreground">Jumlah DP</p><p className="font-semibold">{formatRupiah(selectedItem.jumlah_dp)}</p></div>
                <div><p className="text-xs text-muted-foreground">Cicilan/Bulan</p><p className="font-semibold text-green-700">{formatRupiah(selectedCalc.cicilanPerBulan)}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${selectedCalc.status === "Lunas" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {selectedCalc.status}
                  </span>
                </div>
                <div><p className="text-xs text-muted-foreground">Total Terbayar</p><p className="font-semibold text-green-700">{formatRupiah(selectedCalc.totalTerbayar)}</p></div>
                <div><p className="text-xs text-muted-foreground">Sisa Pembayaran</p><p className={`font-semibold ${selectedCalc.sisaBayar > 0 ? "text-red-600" : "text-green-700"}`}>{formatRupiah(selectedCalc.sisaBayar)}</p></div>
              </div>
              {selectedItem.keterangan && (
                <div className="p-3 rounded-xl bg-muted/40 text-xs">
                  <p className="text-muted-foreground mb-1">Keterangan:</p>
                  <p>{selectedItem.keterangan}</p>
                </div>
              )}
              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progres Pembayaran</span>
                  <span className="font-semibold">{selectedCalc.progress.toFixed(1)}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${selectedCalc.progress}%`, background: PERUMAHAN_COLOR }} />
                </div>
              </div>
              {/* Recent cicilan */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">5 Pembayaran Terakhir</p>
                {(selectedItem.cicilan?.length || 0) === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-xl">Belum ada pembayaran cicilan</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "hsl(var(--border))" }}>
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40"><tr>
                        <th className="px-2 py-2 text-left">Tanggal</th>
                        <th className="px-2 py-2 text-right">Jumlah</th>
                        <th className="px-2 py-2 text-center">Ke-</th>
                        <th className="px-2 py-2 text-left">Keterangan</th>
                      </tr></thead>
                      <tbody>
                        {[...(selectedItem.cicilan || [])].slice(-5).reverse().map((c, ci, arr) => {
                          const idx = (selectedItem.cicilan || []).indexOf(c);
                          return (
                            <tr key={c.id} className="border-t" style={{ borderColor: "hsl(var(--border))" }}>
                              <td className="px-2 py-1.5">{formatDate(c.tanggal_bayar)}</td>
                              <td className="px-2 py-1.5 text-right">{formatRupiah(c.jumlah_bayar)}</td>
                              <td className="px-2 py-1.5 text-center">{idx + 1}</td>
                              <td className="px-2 py-1.5">{c.keterangan || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: "hsl(var(--border))" }}>
              {canEdit && (
                <button onClick={() => openCicilan(selectedItem)} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                  style={{ background: PERUMAHAN_COLOR }}>
                  <CreditCard className="w-4 h-4" /> Lihat Histori Lengkap
                </button>
              )}
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted"
                style={{ borderColor: "hsl(var(--border))" }}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Cicilan Modal */}
      {modalMode === "cicilan" && selectedItem && selectedCalc && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <h3 className="text-base font-bold text-foreground">Histori Cicilan — {selectedItem.nama_pembeli} | Blok {selectedItem.blok}</h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Ringkasan Kontrak */}
              <div className="rounded-xl p-4 bg-muted/40 border" style={{ borderColor: "hsl(var(--border))" }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div><p className="text-muted-foreground">Harga</p><p className="font-semibold">{formatRupiah(selectedItem.harga_unit)}</p></div>
                  <div><p className="text-muted-foreground">DP</p><p className="font-semibold">{formatRupiah(selectedItem.jumlah_dp)}</p></div>
                  <div><p className="text-muted-foreground">Tenor</p><p className="font-semibold">{selectedItem.tenor} bln</p></div>
                  <div><p className="text-muted-foreground">Cicilan/Bln</p><p className="font-semibold text-green-700">{formatRupiah(selectedCalc.cicilanPerBulan)}</p></div>
                  <div><p className="text-muted-foreground">Terbayar</p><p className="font-semibold text-green-700">{formatRupiah(selectedCalc.totalTerbayar)}</p></div>
                  <div><p className="text-muted-foreground">Sisa</p><p className={`font-semibold ${selectedCalc.sisaBayar > 0 ? "text-red-600" : "text-green-700"}`}>{formatRupiah(selectedCalc.sisaBayar)}</p></div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Progress: {selectedCalc.progress.toFixed(1)}%</p>
                    <div className="w-full h-2 rounded-full bg-background overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${selectedCalc.progress}%`, background: PERUMAHAN_COLOR }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form input cicilan baru */}
              {canEdit && selectedCalc.status !== "Lunas" && (
                <div className="rounded-xl p-4 border" style={{ borderColor: "hsl(var(--border))" }}>
                  <p className="text-xs font-semibold mb-3 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Catat Pembayaran Baru</p>
                  {/* Info kontekstual */}
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-3 text-xs space-y-1">
                    <p className="text-blue-900"><span className="font-semibold">ℹ️ Cicilan normal/bulan:</span> <span style={{ color: "#0d47a1" }} className="font-semibold">{formatRupiah(selectedCalc.cicilanPerBulan)}</span></p>
                    <p className="text-blue-900"><span className="font-semibold">💰 Sisa pembayaran:</span> <span className="text-red-600 font-semibold">{formatRupiah(selectedCalc.sisaBayar)}</span></p>
                    <p className="text-blue-900"><span className="font-semibold">📅 Ini adalah cicilan ke-:</span> <span className="font-semibold">{(selectedItem.cicilan?.length || 0) + 1} dari {selectedItem.tenor}</span></p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tanggal Bayar</label>
                      <input type="date" value={cicilanForm.tanggal_bayar} onChange={e => setCicilanForm({ ...cicilanForm, tanggal_bayar: e.target.value })}
                        data-testid="input-cicilan-tanggal"
                        className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Jumlah Bayar</label>
                      <input type="text" value={formatRupiahInput(cicilanForm.jumlah_bayar)} onChange={e => setCicilanForm({ ...cicilanForm, jumlah_bayar: parseRupiah(e.target.value) })}
                        placeholder={`Contoh: ${formatRupiah(selectedCalc.cicilanPerBulan)}`}
                        data-testid="input-cicilan-jumlah"
                        className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Keterangan</label>
                      <input type="text" value={cicilanForm.keterangan} onChange={e => setCicilanForm({ ...cicilanForm, keterangan: e.target.value })}
                        placeholder="Contoh: Cicilan Bulan Juli 2025"
                        className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={handleAddCicilan} data-testid="btn-save-cicilan" className="px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5"
                      style={{ background: PERUMAHAN_COLOR }}>
                      <CreditCard className="w-3.5 h-3.5" /> Catat Pembayaran
                    </button>
                    <button
                      type="button"
                      onClick={() => setCicilanForm({ ...cicilanForm, jumlah_bayar: selectedCalc.sisaBayar, keterangan: cicilanForm.keterangan || "Pelunasan sekaligus" })}
                      data-testid="btn-bayar-lunas"
                      className="px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-50"
                      style={{ borderColor: "#f59e0b", color: "#b45309" }}
                      title="Isi otomatis nilai sisa pembayaran untuk pelunasan sekaligus"
                    >
                      💰 Bayar Lunas ({formatRupiah(selectedCalc.sisaBayar)})
                    </button>
                  </div>
                </div>
              )}

              {/* Tabel histori */}
              <div>
                <p className="text-xs font-semibold mb-2">Tabel Histori Cicilan</p>
                {(selectedItem.cicilan?.length || 0) === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 bg-muted/30 rounded-xl text-center">Belum ada pembayaran cicilan</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "hsl(var(--border))" }}>
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40"><tr>
                        <th className="px-3 py-2 text-left">No</th>
                        <th className="px-3 py-2 text-left">Tanggal</th>
                        <th className="px-3 py-2 text-right">Jumlah Bayar</th>
                        <th className="px-3 py-2 text-center">Cicilan Ke-</th>
                        <th className="px-3 py-2 text-left">Keterangan</th>
                        {canEdit && <th className="px-3 py-2 text-center">Aksi</th>}
                      </tr></thead>
                      <tbody>
                        {(selectedItem.cicilan || []).map((c, ci) => (
                          <tr key={c.id} className="border-t" style={{ borderColor: "hsl(var(--border))" }}>
                            <td className="px-3 py-2">{ci + 1}</td>
                            <td className="px-3 py-2">{formatDate(c.tanggal_bayar)}</td>
                            <td className="px-3 py-2 text-right font-semibold" style={{ color: "#1b5e20" }}>{formatRupiah(c.jumlah_bayar)}</td>
                            <td className="px-3 py-2 text-center">{ci + 1}</td>
                            <td className="px-3 py-2">{c.keterangan || "-"}</td>
                            {canEdit && (
                              <td className="px-3 py-2 text-center">
                                <button onClick={() => setConfirmCicilanId(c.id)} className="p-1 rounded-lg hover:bg-red-100 text-red-600" data-testid={`btn-del-cicilan-${c.id}`}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/40 font-bold">
                        <tr className="border-t-2" style={{ borderColor: "hsl(var(--border))" }}>
                          <td className="px-3 py-2 text-right" colSpan={2}>Total Terbayar (Cicilan):</td>
                          <td className="px-3 py-2 text-right" style={{ color: "#1b5e20" }} data-testid="total-cicilan">
                            {formatRupiah((selectedItem.cicilan || []).reduce((s, c) => s + c.jumlah_bayar, 0))}
                          </td>
                          <td colSpan={canEdit ? 3 : 2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: "hsl(var(--border))" }}>
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted"
                style={{ borderColor: "hsl(var(--border))" }}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
