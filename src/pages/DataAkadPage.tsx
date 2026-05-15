import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, DataAkad } from "@/lib/types";
import { dataAkadApi } from "@/lib/api";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  Plus, Eye, Pencil, Trash2, FileText, FileSpreadsheet, Printer,
  Search, RotateCcw, AlertCircle, CheckCircle, Clock, ClipboardList,
  ChevronLeft, ChevronRight, X
} from "lucide-react";

const BANK_OPTIONS = ["BRI", "BNI", "Mandiri", "BTN", "BSI", "Bank Lainnya"];
const BANK_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#6b7280"];
const PER_PAGE = 10;

const EMPTY_FORM = {
  tanggal_akad: "", nama_user: "", blok: "", bank: "BRI", bank_lain: "",
  status: "Belum Cair" as "Cair" | "Belum Cair", tanggal_cair: "", keterangan: ""
};

type ModalMode = "add" | "edit" | "view" | null;

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-5 right-5 z-[100] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium fade-in flex items-center gap-2 ${type === "success" ? "bg-green-600" : "bg-red-500"}`}>
      {type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
    </div>
  );
}

function ConfirmDialog({ nama, blok, onConfirm, onCancel }: { nama: string; blok: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex-shrink-0 flex items-center justify-center mt-0.5">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">Hapus Data Akad?</p>
            <p className="text-sm text-muted-foreground">
              Data akad atas nama <strong>{nama}</strong> blok <strong>{blok}</strong> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
            style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90">
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DataAkadPage({ initialFilter }: { initialFilter?: string }) {
  const { user, hasAccess } = useAuth();
  const [, setLocation] = useLocation();
  const access = hasAccess("akad");

  const [allData, setAllData] = useState<DataAkad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [filterOpen, setFilterOpen] = useState(true);

  const [fNama, setFNama] = useState("");
  const [fBlok, setFBlok] = useState("");
  const [fBank, setFBank] = useState("");
  const [fStatus, setFStatus] = useState(initialFilter || "");
  const [fDari, setFDari] = useState("");
  const [fSampai, setFSampai] = useState("");

  const [appliedFilter, setAppliedFilter] = useState({ nama: "", blok: "", bank: "", status: initialFilter || "", dari: "", sampai: "" });

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await dataAkadApi.list();
      setAllData(data);
    } catch (e) {
      console.error("Gagal load data akad", e);
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => { loadData(); }, [loadData]);

  const handleApplyFilter = () => {
    setAppliedFilter({ nama: fNama, blok: fBlok, bank: fBank, status: fStatus, dari: fDari, sampai: fSampai });
    setPage(1);
  };

  const handleResetFilter = () => {
    setFNama(""); setFBlok(""); setFBank(""); setFStatus(""); setFDari(""); setFSampai("");
    setAppliedFilter({ nama: "", blok: "", bank: "", status: "", dari: "", sampai: "" });
    setPage(1);
  };

  const filteredData = useMemo(() => {
    return allData.filter(d => {
      if (appliedFilter.nama && !d.nama_user.toLowerCase().includes(appliedFilter.nama.toLowerCase())) return false;
      if (appliedFilter.blok && !d.blok.toLowerCase().includes(appliedFilter.blok.toLowerCase())) return false;
      if (appliedFilter.bank && d.bank !== appliedFilter.bank) return false;
      if (appliedFilter.status && d.status !== appliedFilter.status) return false;
      if (appliedFilter.dari && d.tanggal_akad < appliedFilter.dari) return false;
      if (appliedFilter.sampai && d.tanggal_akad > appliedFilter.sampai) return false;
      return true;
    });
  }, [allData, appliedFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PER_PAGE));
  const pagedData = filteredData.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Statistics
  const totalCair = allData.filter(d => d.status === "Cair").length;
  const totalBelum = allData.filter(d => d.status === "Belum Cair").length;
  const total = allData.length;

  const bankStats = useMemo(() => {
    const counts: Record<string, number> = {};
    allData.forEach(d => { counts[d.bank] = (counts[d.bank] || 0) + 1; });
    return Object.entries(counts).map(([bank, count]) => ({ bank, count })).sort((a, b) => b.count - a.count);
  }, [allData]);

  const pieData = [
    { name: "Cair", value: totalCair, color: "#16a34a" },
    { name: "Belum Cair", value: totalBelum, color: "#ea580c" },
  ].filter(d => d.value > 0);

  // Modal actions
  const openAdd = () => {
    setForm({ ...EMPTY_FORM, tanggal_akad: new Date().toISOString().split("T")[0] });
    setSelectedId(null);
    setModalMode("add");
  };

  const openEdit = (id: string) => {
    const d = allData.find(x => x.id === id);
    if (!d) return;
    setForm({
      tanggal_akad: d.tanggal_akad, nama_user: d.nama_user, blok: d.blok,
      bank: BANK_OPTIONS.includes(d.bank) ? d.bank : "Bank Lainnya",
      bank_lain: BANK_OPTIONS.includes(d.bank) ? "" : d.bank,
      status: d.status, tanggal_cair: d.tanggal_cair || "", keterangan: d.keterangan
    });
    setSelectedId(id);
    setModalMode("edit");
  };

  const openView = (id: string) => {
    setSelectedId(id);
    setModalMode("view");
  };

  const handleSave = async () => {
    if (!form.tanggal_akad) { showToast("Tanggal akad wajib diisi.", "error"); return; }
    if (!form.nama_user || form.nama_user.length < 3) { showToast("Nama user minimal 3 karakter.", "error"); return; }
    if (!form.blok) { showToast("Blok wajib diisi.", "error"); return; }
    if (!form.bank) { showToast("Bank wajib dipilih.", "error"); return; }
    if (form.bank === "Bank Lainnya" && !form.bank_lain) { showToast("Nama bank wajib diisi.", "error"); return; }
    if (form.status === "Cair" && !form.tanggal_cair) { showToast("Tanggal cair wajib diisi jika status Cair.", "error"); return; }

    const bankFinal = form.bank === "Bank Lainnya" ? form.bank_lain : form.bank;

    try {
      if (modalMode === "edit" && selectedId) {
        await dataAkadApi.update(selectedId, {
          tanggal_akad: form.tanggal_akad, nama_user: form.nama_user, blok: form.blok,
          bank: bankFinal, status: form.status,
          tanggal_cair: form.status === "Cair" ? form.tanggal_cair : null,
          keterangan: form.keterangan,
        });
        showToast("Data berhasil diperbarui.");
      } else {
        await dataAkadApi.create({
          tanggal_akad: form.tanggal_akad, nama_user: form.nama_user, blok: form.blok,
          bank: bankFinal, status: form.status,
          tanggal_cair: form.status === "Cair" ? form.tanggal_cair : null,
          keterangan: form.keterangan,
        });
        showToast("Data akad berhasil ditambahkan.");
      }
      loadData();
      setModalMode(null);
    } catch (e: any) {
      showToast(e?.message || "Gagal menyimpan data", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dataAkadApi.delete(id);
      loadData();
      setConfirmId(null);
      showToast("Data akad berhasil dihapus.");
    } catch (e: any) {
      showToast(e?.message || "Gagal menghapus data", "error");
    }
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Laporan Data Akad Perumahan", 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 22);
    doc.text(`Total: ${total} | Cair: ${totalCair} | Belum Cair: ${totalBelum}`, 14, 28);
    autoTable(doc, {
      head: [["No", "Tgl Akad", "Nama User", "Blok", "Bank", "Status", "Tgl Cair", "Keterangan"]],
      body: filteredData.map((d, i) => [i + 1, formatDate(d.tanggal_akad), d.nama_user, d.blok, d.bank, d.status, d.tanggal_cair ? formatDate(d.tanggal_cair) : "-", d.keterangan]),
      startY: 33,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 35, 126] },
    });
    doc.save(`laporan-akad-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const headers = ["No", "Tanggal Akad", "Nama User", "Blok", "Bank", "Status", "Tanggal Cair", "Keterangan"];
    const rows = filteredData.map((d, i) => [i + 1, formatDate(d.tanggal_akad), d.nama_user, d.blok, d.bank, d.status, d.tanggal_cair ? formatDate(d.tanggal_cair) : "-", d.keterangan]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "Data Akad");
    const bankMap: Record<string, { total: number; cair: number; belum: number }> = {};
    allData.forEach(d => {
      if (!bankMap[d.bank]) bankMap[d.bank] = { total: 0, cair: 0, belum: 0 };
      bankMap[d.bank].total++;
      if (d.status === "Cair") bankMap[d.bank].cair++; else bankMap[d.bank].belum++;
    });
    const rekap = [["Bank", "Total Akad", "Sudah Cair", "Belum Cair"], ...Object.entries(bankMap).map(([bank, v]) => [bank, v.total, v.cair, v.belum])];
    const ws2 = XLSX.utils.aoa_to_sheet(rekap);
    XLSX.utils.book_append_sheet(wb, ws2, "Rekap");
    XLSX.writeFile(wb, `laporan-akad-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const selectedItem = selectedId ? allData.find(x => x.id === selectedId) : null;

  if (access === "NONE") return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-lg font-semibold text-foreground">Akses Ditolak</p>
      <p className="text-muted-foreground text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
    </div>
  );

  if (isLoading) return (
    <div className="p-8 text-center text-muted-foreground">Memuat data akad...</div>
  );

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} />}
      {confirmId && (() => {
        const d = allData.find(x => x.id === confirmId);
        return d ? (
          <ConfirmDialog nama={d.nama_user} blok={d.blok}
            onConfirm={() => handleDelete(confirmId)}
            onCancel={() => setConfirmId(null)} />
        ) : null;
      })()}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Data Akad Perumahan</h1>
            <p className="text-sm text-muted-foreground">Manajemen data akad dan pencairan</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          {access === "CRUD" && (
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-sm"
              data-testid="button-add-akad">
              <Plus className="w-4 h-4" /> Tambah Akad
            </button>
          )}
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border bg-card hover:bg-muted transition-colors"
            style={{ borderColor: "hsl(var(--border))" }}>
            <FileText className="w-4 h-4 text-red-500" /> PDF
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border bg-card hover:bg-muted transition-colors"
            style={{ borderColor: "hsl(var(--border))" }}>
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border bg-card hover:bg-muted transition-colors"
            style={{ borderColor: "hsl(var(--border))" }}>
            <Printer className="w-4 h-4 text-blue-500" /> Cetak
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, #1a237e, #1565c0)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="text-blue-200 text-xs">Total Akad</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, #166534, #16a34a)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-green-200 text-xs">Sudah Cair</p>
              <p className="text-2xl font-bold">{totalCair}</p>
              <p className="text-green-200 text-xs">{total > 0 ? Math.round((totalCair / total) * 100) : 0}%</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, #7c2d12, #ea580c)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-orange-200 text-xs">Belum Cair</p>
              <p className="text-2xl font-bold">{totalBelum}</p>
              <p className="text-orange-200 text-xs">{total > 0 ? Math.round((totalBelum / total) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
            <h3 className="text-sm font-semibold text-foreground mb-4">Status Pencairan Akad</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(val: number) => [`${val} akad`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
            <h3 className="text-sm font-semibold text-foreground mb-4">Distribusi Akad per Bank</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bankStats} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="bank" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: number) => [`${val} akad`]} />
                <Bar dataKey="count" name="Jumlah Akad" radius={[0, 4, 4, 0]}>
                  {bankStats.map((_, i) => (
                    <Cell key={i} fill={BANK_COLORS[i % BANK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      <div className="bg-card rounded-2xl border no-print" style={{ borderColor: "hsl(var(--card-border))" }}>
        <button onClick={() => setFilterOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Filter & Pencarian
          </div>
          <span className="text-muted-foreground text-xs">{filterOpen ? "▲ Sembunyikan" : "▼ Tampilkan"}</span>
        </button>
        {filterOpen && (
          <div className="px-5 pb-5 border-t" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Cari Nama</label>
                <input type="text" placeholder="Nama pembeli..." value={fNama} onChange={e => setFNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Cari Blok</label>
                <input type="text" placeholder="Kode blok..." value={fBlok} onChange={e => setFBlok(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Pilih Bank</label>
                <select value={fBank} onChange={e => setFBank(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }}>
                  <option value="">Semua Bank</option>
                  {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status Cair</label>
                <select value={fStatus} onChange={e => setFStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }}>
                  <option value="">Semua Status</option>
                  <option value="Cair">Cair</option>
                  <option value="Belum Cair">Belum Cair</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tgl Akad Dari</label>
                <input type="date" value={fDari} onChange={e => setFDari(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tgl Akad Sampai</label>
                <input type="date" value={fSampai} onChange={e => setFSampai(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Menampilkan <strong>{filteredData.length}</strong> dari <strong>{allData.length}</strong> total data
              </p>
              <div className="flex gap-2">
                <button onClick={handleResetFilter}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted transition-colors"
                  style={{ borderColor: "hsl(var(--border))" }}>
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
                <button onClick={handleApplyFilter}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                  <Search className="w-3.5 h-3.5" /> Terapkan Filter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(var(--card-border))" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-akad">
            <thead>
              <tr style={{ background: "hsl(var(--muted))", borderBottom: "1px solid hsl(var(--border))" }}>
                {["No", "Tanggal Akad", "Nama User / Pembeli", "Blok", "Bank", "Status", "Tanggal Cair", "Aksi"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    {allData.length === 0 ? (
                      <div>
                        <ClipboardList className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                        <p>Belum ada data akad. {access === "CRUD" && 'Klik "Tambah Akad" untuk menambahkan.'}</p>
                      </div>
                    ) : (
                      "Tidak ada data yang sesuai dengan filter yang dipilih."
                    )}
                  </td>
                </tr>
              ) : (
                pagedData.map((d, i) => (
                  <tr key={d.id}
                    className="border-b transition-colors hover:bg-muted/30"
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: d.status === "Belum Cair" ? "rgba(251,191,36,0.06)" : undefined
                    }}
                    data-testid={`row-akad-${d.id}`}>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{(page - 1) * PER_PAGE + i + 1}</td>
                    <td className="px-4 py-2.5 text-xs text-foreground whitespace-nowrap">{formatDate(d.tanggal_akad)}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-foreground">{d.nama_user}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium">{d.blok}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground">{d.bank}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${d.status === "Cair" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        {d.status === "Cair" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground whitespace-nowrap">
                      {d.tanggal_cair ? formatDate(d.tanggal_cair) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => openView(d.id)} title="Lihat detail"
                          className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors"
                          data-testid={`button-view-akad-${d.id}`}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {access === "CRUD" && (
                          <>
                            <button onClick={() => openEdit(d.id)} title="Edit"
                              className="p-1.5 rounded-lg hover:bg-yellow-100 text-yellow-600 transition-colors"
                              data-testid={`button-edit-akad-${d.id}`}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirmId(d.id)} title="Hapus"
                              className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                              data-testid={`button-delete-akad-${d.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="text-xs text-muted-foreground">
              Halaman {page} dari {totalPages} ({filteredData.length} data)
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors"
                style={{ borderColor: "hsl(var(--border))" }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === p ? "bg-primary text-primary-foreground" : "border hover:bg-muted text-foreground"}`}
                    style={{ borderColor: page === p ? undefined : "hsl(var(--border))" }}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors"
                style={{ borderColor: "hsl(var(--border))" }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 my-auto">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <h3 className="font-semibold text-foreground">{modalMode === "add" ? "Tambah Data Akad Baru" : "Edit Data Akad"}</h3>
              <button onClick={() => setModalMode(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Tanggal Akad <span className="text-red-500">*</span></label>
                  <input type="date" value={form.tanggal_akad} onChange={e => setForm(f => ({ ...f, tanggal_akad: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ borderColor: "hsl(var(--border))" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Blok <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Contoh: A-05, B12" value={form.blok}
                    onChange={e => setForm(f => ({ ...f, blok: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ borderColor: "hsl(var(--border))" }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Nama User / Pembeli <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Nama lengkap pembeli" value={form.nama_user}
                  onChange={e => setForm(f => ({ ...f, nama_user: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }} data-testid="input-nama-user" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Bank <span className="text-red-500">*</span></label>
                <select value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }} data-testid="select-bank">
                  {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              {form.bank === "Bank Lainnya" && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Nama Bank <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Masukkan nama bank" value={form.bank_lain}
                    onChange={e => setForm(f => ({ ...f, bank_lain: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ borderColor: "hsl(var(--border))" }} />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Status <span className="text-red-500">*</span></label>
                <div className="flex gap-3">
                  {(["Cair", "Belum Cair"] as const).map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="status" value={s} checked={form.status === s}
                        onChange={() => setForm(f => ({ ...f, status: s, tanggal_cair: s === "Belum Cair" ? "" : f.tanggal_cair }))}
                        className="accent-primary" />
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${s === "Cair" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              {form.status === "Cair" && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Tanggal Cair <span className="text-red-500">*</span></label>
                  <input type="date" value={form.tanggal_cair} onChange={e => setForm(f => ({ ...f, tanggal_cair: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ borderColor: "hsl(var(--border))" }} data-testid="input-tanggal-cair" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Keterangan Tambahan <span className="text-muted-foreground font-normal">(opsional)</span></label>
                <textarea value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value.slice(0, 200) }))}
                  placeholder="Catatan tambahan (maks. 200 karakter)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  style={{ borderColor: "hsl(var(--border))" }} />
                <p className="text-xs text-muted-foreground mt-1 text-right">{form.keterangan.length}/200</p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t" style={{ borderColor: "hsl(var(--border))" }}>
              <button onClick={() => setModalMode(null)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
                style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
              <button onClick={handleSave}
                data-testid="button-save-akad"
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modalMode === "view" && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <h3 className="font-semibold text-foreground">Detail Data Akad</h3>
              <button onClick={() => setModalMode(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: "Tanggal Akad", value: formatDate(selectedItem.tanggal_akad) },
                { label: "Nama User / Pembeli", value: selectedItem.nama_user },
                { label: "Blok", value: selectedItem.blok },
                { label: "Bank", value: selectedItem.bank },
                { label: "Tanggal Cair", value: selectedItem.tanggal_cair ? formatDate(selectedItem.tanggal_cair) : "—" },
                { label: "Keterangan", value: selectedItem.keterangan || "—" },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-2 border-b" style={{ borderColor: "hsl(var(--border))" }}>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-medium text-foreground text-right max-w-[60%]">{item.value}</span>
                </div>
              ))}
              <div className="flex justify-between py-2">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${selectedItem.status === "Cair" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {selectedItem.status === "Cair" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {selectedItem.status}
                </span>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t" style={{ borderColor: "hsl(var(--border))" }}>
              <button onClick={() => setModalMode(null)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted"
                style={{ borderColor: "hsl(var(--border))" }}>Tutup</button>
              {access === "CRUD" && (
                <button onClick={() => openEdit(selectedItem.id)}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
                  Edit Data
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
