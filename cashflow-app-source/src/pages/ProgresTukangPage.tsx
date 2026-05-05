import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProgresTukang, saveProgresTukang, migrateProgresTukang,
  generateId, formatDate, calcProgresTukang,
  ProgresTukang, HistoriProgres, StatusKontrak,
} from "@/lib/storage";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Plus, Pencil, Trash2, Eye, ClipboardList, FileDown, FileSpreadsheet, Printer,
  Search, Users, Hammer, AlertCircle, X, ChevronLeft, ChevronRight, Image as ImageIcon, FileText,
} from "lucide-react";

// ===== Helpers =====
function progrestukang_formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "Rp 0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.trunc(Math.abs(value));
  return `${sign}Rp ${abs.toLocaleString("id-ID")}`;
}

function progrestukang_parseRupiah(str: string): number {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^\d-]/g, "");
  return parseInt(cleaned, 10) || 0;
}

function progrestukang_formatRupiahInput(value: number | string): string {
  const n = typeof value === "number" ? value : progrestukang_parseRupiah(value);
  if (n === 0) return "";
  return `Rp ${Math.trunc(Math.abs(n)).toLocaleString("id-ID")}`;
}

function truncateMiddle(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.substring(0, max) + "..." : s;
}

const AKSEN = "#1b5e20";

function getStatusBadgeClass(status: StatusKontrak): string {
  if (status === "Selesai") return "bg-green-100 text-green-700";
  if (status === "Berjalan") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

function getStatusRowClass(status: StatusKontrak): string {
  if (status === "Selesai") return "bg-green-50/40";
  if (status === "Berjalan") return "bg-blue-50/30";
  return "";
}

function getProgressBarColor(pct: number): string {
  if (pct >= 100) return "#2e7d32";
  if (pct >= 71) return "#0288d1";
  if (pct >= 31) return "#f9a825";
  return "#c62828";
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium fade-in ${type === "success" ? "bg-green-600" : "bg-red-500"}`}>
      {message}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// ===== Page =====
export default function ProgresTukangPage() {
  const { user, hasAccess } = useAuth();
  const access = hasAccess("progrestukang");
  const canEdit = access === "CRUD";

  // Run migration once on mount before initial state load is completed
  useEffect(() => {
    migrateProgresTukang();
    setProgresData(getProgresTukang());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [progresData, setProgresData] = useState<ProgresTukang[]>(getProgresTukang());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const refresh = () => {
    setProgresData(getProgresTukang());
  };

  // ===== Filter state =====
  const [filterCariNama, setFilterCariNama] = useState("");
  const [filterCariLokasi, setFilterCariLokasi] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProgres, setFilterProgres] = useState("");
  const [filterDari, setFilterDari] = useState("");
  const [filterSampai, setFilterSampai] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const resetFilter = () => {
    setFilterCariNama(""); setFilterCariLokasi(""); setFilterStatus("");
    setFilterProgres(""); setFilterDari(""); setFilterSampai(""); setPage(1);
  };

  // dashboard deeplink: ?status=berjalan
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const s = sp.get("status");
      if (s === "berjalan") setFilterStatus("Berjalan");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let arr = [...progresData];
    if (filterCariNama) {
      const q = filterCariNama.toLowerCase();
      arr = arr.filter(p => p.nama_tukang.toLowerCase().includes(q));
    }
    if (filterCariLokasi) {
      const q = filterCariLokasi.toLowerCase();
      arr = arr.filter(p => (p.lokasi || "").toLowerCase().includes(q));
    }
    if (filterStatus) arr = arr.filter(p => p.status === filterStatus);
    if (filterProgres) {
      arr = arr.filter(p => {
        const v = p.persen_selesai;
        if (filterProgres === "0") return v === 0;
        if (filterProgres === "1-25") return v >= 1 && v <= 25;
        if (filterProgres === "26-50") return v >= 26 && v <= 50;
        if (filterProgres === "51-75") return v >= 51 && v <= 75;
        if (filterProgres === "76-99") return v >= 76 && v <= 99;
        if (filterProgres === "100") return v === 100;
        return true;
      });
    }
    if (filterDari) arr = arr.filter(p => p.tanggal_mulai && p.tanggal_mulai >= filterDari);
    if (filterSampai) arr = arr.filter(p => p.tanggal_mulai && p.tanggal_mulai <= filterSampai);
    return arr.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }, [progresData, filterCariNama, filterCariLokasi, filterStatus, filterProgres, filterDari, filterSampai]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);

  // ===== Stats =====
  const stats = useMemo(() => {
    const totalKontrak = filtered.length;
    const selesai = filtered.filter(p => p.status === "Selesai").length;
    const berjalan = filtered.filter(p => p.status === "Berjalan").length;
    const belumMulai = filtered.filter(p => p.status === "Belum Mulai").length;
    const totalNilai = filtered.reduce((s, p) => s + p.total_kontrak, 0);
    const totalTerbayar = filtered.reduce((s, p) => s + p.total_terbayar, 0);
    const totalSisa = filtered.reduce((s, p) => s + p.sisa_progres, 0);
    return { totalKontrak, selesai, berjalan, belumMulai, totalNilai, totalTerbayar, totalSisa };
  }, [filtered]);

  // ===== Charts =====
  const donutData = useMemo(() => [
    { name: "Selesai", value: stats.selesai, color: "#2e7d32" },
    { name: "Berjalan", value: stats.berjalan, color: "#1565c0" },
    { name: "Belum Mulai", value: stats.belumMulai, color: "#757575" },
  ].filter(d => d.value > 0), [stats]);

  const barData = useMemo(() => filtered.map(p => ({
    nama: `${p.nama_tukang}${p.lokasi ? " — " + (p.lokasi.length > 20 ? p.lokasi.substring(0, 20) + "..." : p.lokasi) : ""}`,
    Terbayar: p.total_terbayar,
    Sisa: p.sisa_progres,
  })).slice(0, 12), [filtered]);

  // ===== Modal: Kontrak Add/Edit =====
  const [showKontrakModal, setShowKontrakModal] = useState(false);
  const [kontrakEditId, setKontrakEditId] = useState<string | null>(null);
  const emptyKontrakForm = {
    nama_tukang: "",
    lokasi: "",
    total_kontrak: 0,
    tanggal_mulai: new Date().toISOString().slice(0, 10),
    estimasi_selesai: "",
    keterangan: "",
  };
  const [kontrakForm, setKontrakForm] = useState(emptyKontrakForm);

  const openAddKontrak = () => {
    setKontrakEditId(null);
    setKontrakForm({ ...emptyKontrakForm });
    setShowKontrakModal(true);
  };
  const openEditKontrak = (item: ProgresTukang) => {
    setKontrakEditId(item.id);
    setKontrakForm({
      nama_tukang: item.nama_tukang,
      lokasi: item.lokasi || "",
      total_kontrak: item.total_kontrak,
      tanggal_mulai: item.tanggal_mulai || new Date().toISOString().slice(0, 10),
      estimasi_selesai: item.estimasi_selesai || "",
      keterangan: item.keterangan || "",
    });
    setShowKontrakModal(true);
  };

  const handleSaveKontrak = () => {
    const namaTrim = kontrakForm.nama_tukang.trim();
    const lokasiTrim = kontrakForm.lokasi.trim();
    if (!namaTrim || namaTrim.length < 3) { showToast("Nama tukang minimal 3 karakter.", "error"); return; }
    if (namaTrim.length > 100) { showToast("Nama tukang maksimal 100 karakter.", "error"); return; }
    if (!lokasiTrim) { showToast("Lokasi wajib diisi.", "error"); return; }
    if (lokasiTrim.length > 200) { showToast("Lokasi maksimal 200 karakter.", "error"); return; }
    if (kontrakForm.total_kontrak <= 0) { showToast("Total kontrak harus > 0.", "error"); return; }
    if (!kontrakForm.tanggal_mulai) { showToast("Tanggal mulai wajib diisi.", "error"); return; }

    const all = getProgresTukang();
    const now = new Date().toISOString();
    if (kontrakEditId) {
      const idx = all.findIndex(p => p.id === kontrakEditId);
      if (idx >= 0) {
        const oldKontrak = all[idx].total_kontrak;
        if (oldKontrak !== kontrakForm.total_kontrak && (all[idx].histori_progres || []).length > 0) {
          const ok = window.confirm("Mengubah nilai kontrak akan mempengaruhi kalkulasi Sisa Progres dan persentase selesai. Histori progres yang sudah ada tidak akan berubah. Lanjutkan?");
          if (!ok) return;
        }
        const calc = calcProgresTukang({ total_kontrak: kontrakForm.total_kontrak, histori_progres: all[idx].histori_progres });
        all[idx] = {
          ...all[idx],
          nama_tukang: namaTrim,
          lokasi: lokasiTrim,
          total_kontrak: kontrakForm.total_kontrak,
          tanggal_mulai: kontrakForm.tanggal_mulai,
          estimasi_selesai: kontrakForm.estimasi_selesai,
          keterangan: kontrakForm.keterangan,
          ...calc,
          updated_at: now,
        };
      }
    } else {
      const calc = calcProgresTukang({ total_kontrak: kontrakForm.total_kontrak, histori_progres: [] });
      all.unshift({
        id: "progres-" + generateId(),
        nama_tukang: namaTrim,
        lokasi: lokasiTrim,
        total_kontrak: kontrakForm.total_kontrak,
        tanggal_mulai: kontrakForm.tanggal_mulai,
        estimasi_selesai: kontrakForm.estimasi_selesai,
        keterangan: kontrakForm.keterangan,
        histori_progres: [],
        ...calc,
        created_at: now,
        updated_at: now,
        created_by: user?.username || "",
      });
    }
    try { saveProgresTukang(all); } catch (e: any) { showToast(e?.message || "Gagal menyimpan", "error"); return; }
    refresh();
    setShowKontrakModal(false);
    showToast(kontrakEditId
      ? `Kontrak ${namaTrim} di lokasi ${lokasiTrim} berhasil diperbarui!`
      : `Kontrak ${namaTrim} berhasil ditambahkan untuk lokasi ${lokasiTrim}!`);
  };

  // ===== Modal: Detail =====
  const [detailItem, setDetailItem] = useState<ProgresTukang | null>(null);

  // ===== Modal: Histori & Catat Progres =====
  const [historiItem, setHistoriItem] = useState<ProgresTukang | null>(null);
  const [progresForm, setProgresForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    nominal: 0,
    blok: "",
    foto: null as null | { nama_file: string; tipe: string; ukuran: number; data_base64: string },
  });

  const openHistori = (item: ProgresTukang) => {
    setHistoriItem(item);
    setProgresForm({
      tanggal: new Date().toISOString().slice(0, 10),
      nominal: item.sisa_progres,
      blok: "",
      foto: null,
    });
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) { setProgresForm(f => ({ ...f, foto: null })); return; }
    if (file.size > 3.5 * 1024 * 1024) { showToast("Ukuran file maksimal 3.5MB (akan disimpan sebagai base64).", "error"); return; }
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) { showToast("Format file harus JPG/PNG/PDF.", "error"); return; }
    try {
      const base64 = await fileToBase64(file);
      setProgresForm(f => ({ ...f, foto: { nama_file: file.name, tipe: file.type, ukuran: file.size, data_base64: base64 } }));
    } catch {
      showToast("Gagal memproses file.", "error");
    }
  };

  const handleSaveProgres = () => {
    if (!historiItem) return;
    if (progresForm.nominal <= 0) { showToast("Nominal progres harus > 0.", "error"); return; }
    if (progresForm.nominal > historiItem.sisa_progres) {
      const ok = window.confirm("Nominal melebihi sisa kontrak. Status akan tetap Selesai. Lanjutkan menyimpan?");
      if (!ok) return;
    }
    const blokTrim = progresForm.blok.trim();
    if (!blokTrim) { showToast("Blok wajib diisi.", "error"); return; }
    if (blokTrim.length > 150) { showToast("Blok maksimal 150 karakter.", "error"); return; }
    if (!progresForm.tanggal) { showToast("Tanggal progres wajib diisi.", "error"); return; }

    const all = getProgresTukang();
    const idx = all.findIndex(p => p.id === historiItem.id);
    if (idx < 0) return;
    const newHistori: HistoriProgres = {
      id_progres: "hp-" + generateId(),
      tanggal: progresForm.tanggal,
      minggu_ke: (all[idx].histori_progres?.length || 0) + 1,
      nominal: progresForm.nominal,
      blok: blokTrim,
      foto: progresForm.foto,
    };
    const newHistArr = [...(all[idx].histori_progres || []), newHistori];
    const calc = calcProgresTukang({ total_kontrak: all[idx].total_kontrak, histori_progres: newHistArr });
    all[idx] = { ...all[idx], histori_progres: newHistArr, ...calc, updated_at: new Date().toISOString() };
    try { saveProgresTukang(all); } catch (e: any) { showToast(e?.message || "Gagal menyimpan", "error"); return; }
    setHistoriItem(all[idx]);
    refresh();
    showToast(`Progres minggu ke-${newHistori.minggu_ke} sebesar ${progrestukang_formatRupiah(newHistori.nominal)} berhasil dicatat!`);
    setProgresForm({ tanggal: new Date().toISOString().slice(0, 10), nominal: all[idx].sisa_progres, blok: "", foto: null });
  };

  const handleDeleteHistori = (h: HistoriProgres) => {
    if (!historiItem) return;
    const ok = window.confirm(`Hapus data progres minggu ke-${h.minggu_ke} sebesar ${progrestukang_formatRupiah(h.nominal)} untuk blok ${h.blok || "-"}? Total terbayar dan sisa akan dihitung ulang otomatis.`);
    if (!ok) return;
    const all = getProgresTukang();
    const idx = all.findIndex(p => p.id === historiItem.id);
    if (idx < 0) return;
    const newHistArr = (all[idx].histori_progres || []).filter(x => x.id_progres !== h.id_progres)
      .map((x, i) => ({ ...x, minggu_ke: i + 1 }));
    const calc = calcProgresTukang({ total_kontrak: all[idx].total_kontrak, histori_progres: newHistArr });
    all[idx] = { ...all[idx], histori_progres: newHistArr, ...calc, updated_at: new Date().toISOString() };
    saveProgresTukang(all);
    setHistoriItem(all[idx]);
    refresh();
    showToast("Data progres berhasil dihapus.");
  };

  // ===== Delete Kontrak =====
  const [confirmDel, setConfirmDel] = useState<ProgresTukang | null>(null);
  const handleDeleteKontrak = () => {
    if (!confirmDel) return;
    const all = getProgresTukang().filter(p => p.id !== confirmDel.id);
    saveProgresTukang(all);
    refresh();
    setConfirmDel(null);
    showToast("Kontrak berhasil dihapus.");
  };

  // ===== Rekap per Tukang =====
  const [showRekap, setShowRekap] = useState(false);
  const [rekapNama, setRekapNama] = useState<string>("");

  const namaTukangUnik = useMemo(() => {
    const set = new Set<string>();
    progresData.forEach(p => { if (p.nama_tukang) set.add(p.nama_tukang); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [progresData]);

  const rekapData = useMemo(() => {
    if (!rekapNama) return null;
    const items = progresData.filter(p => p.nama_tukang === rekapNama);
    const totalKontrak = items.reduce((s, p) => s + p.total_kontrak, 0);
    const totalTerbayar = items.reduce((s, p) => s + p.total_terbayar, 0);
    const totalSisa = items.reduce((s, p) => s + p.sisa_progres, 0);
    const progress = totalKontrak > 0 ? Math.min(100, Math.round((totalTerbayar / totalKontrak) * 100)) : 0;
    return { items, totalKontrak, totalTerbayar, totalSisa, progress };
  }, [rekapNama, progresData]);

  // ===== Exports =====
  const exportRekapTukangPDF = async (nama: string) => {
    try {
      if (!nama) { showToast("Pilih tukang terlebih dahulu.", "error"); return; }
      const items = progresData.filter(p => p.nama_tukang === nama);
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait" });
      doc.setFontSize(13); doc.setFont("helvetica", "bold");
      doc.text(`Rekap Pekerjaan — ${nama}`, 14, 14);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      const totK = items.reduce((x, p) => x + p.total_kontrak, 0);
      const totT = items.reduce((x, p) => x + p.total_terbayar, 0);
      const totS = items.reduce((x, p) => x + p.sisa_progres, 0);
      const prog = totK > 0 ? Math.round((totT / totK) * 100) : 0;
      doc.text(`Progres keseluruhan: ${prog}% | Tanggal cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 20);
      autoTable(doc, {
        startY: 26,
        head: [["Lokasi", "Total Kontrak", "Terbayar", "Sisa", "% Selesai", "Status"]],
        body: items.map(p => [
          p.lokasi || "-",
          progrestukang_formatRupiah(p.total_kontrak),
          progrestukang_formatRupiah(p.total_terbayar),
          progrestukang_formatRupiah(p.sisa_progres),
          `${p.persen_selesai}%`,
          p.status,
        ]),
        foot: [["TOTAL", progrestukang_formatRupiah(totK), progrestukang_formatRupiah(totT), progrestukang_formatRupiah(totS), `${prog}%`, ""]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [27, 94, 32] },
        footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
      });
      doc.save(`rekap-tukang-${nama.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast("PDF berhasil diunduh");
    } catch (e: any) { showToast(e?.message || "Gagal export PDF", "error"); }
  };

  const exportPDF = async (mode: "all" | "detail" = "all") => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("Laporan Progres Tukang — Divisi Perumahan", 14, 14);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 20);
      doc.text(`Total Kontrak: ${stats.totalKontrak} | Selesai: ${stats.selesai} | Berjalan: ${stats.berjalan} | Belum Mulai: ${stats.belumMulai}`, 14, 26);

      if (mode === "all") {
        const head = [["No", "Tukang", "Lokasi", "Total Kontrak", "Terbayar", "Sisa", "% Selesai", "Status", "Keterangan"]];
        const body = filtered.map((p, i) => [
          i + 1, p.nama_tukang, p.lokasi || "-",
          progrestukang_formatRupiah(p.total_kontrak), progrestukang_formatRupiah(p.total_terbayar),
          progrestukang_formatRupiah(p.sisa_progres), `${p.persen_selesai}%`, p.status, p.keterangan || "-",
        ]);
        const totK = filtered.reduce((s, p) => s + p.total_kontrak, 0);
        const totT = filtered.reduce((s, p) => s + p.total_terbayar, 0);
        const totS = filtered.reduce((s, p) => s + p.sisa_progres, 0);
        autoTable(doc, {
          head, body, startY: 32, styles: { fontSize: 8 },
          headStyles: { fillColor: [27, 94, 32] },
          foot: [["", "TOTAL", "", progrestukang_formatRupiah(totK), progrestukang_formatRupiah(totT), progrestukang_formatRupiah(totS), "", "", ""]],
          footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
        });
        doc.save(`laporan-progres-tukang-${new Date().toISOString().slice(0, 10)}.pdf`);
      } else {
        // detail per tukang — group by nama_tukang
        let firstSection = true;
        const grouped: Record<string, ProgresTukang[]> = {};
        progresData.forEach(p => { (grouped[p.nama_tukang] = grouped[p.nama_tukang] || []).push(p); });
        for (const tName of Object.keys(grouped)) {
          if (!firstSection) doc.addPage();
          firstSection = false;
          doc.setFontSize(13); doc.setFont("helvetica", "bold");
          doc.text(`${tName}`, 14, 14);
          let cursorY = 22;
          for (const p of grouped[tName]) {
            doc.setFontSize(10); doc.setFont("helvetica", "bold");
            doc.text(`Lokasi: ${p.lokasi || "-"}  |  ${p.status}  |  ${p.persen_selesai}%`, 14, cursorY);
            doc.setFont("helvetica", "normal"); doc.setFontSize(9);
            doc.text(`Kontrak ${progrestukang_formatRupiah(p.total_kontrak)} | Terbayar ${progrestukang_formatRupiah(p.total_terbayar)} | Sisa ${progrestukang_formatRupiah(p.sisa_progres)}`, 14, cursorY + 5);
            autoTable(doc, {
              startY: cursorY + 8,
              head: [["Mgg", "Tanggal", "Nominal", "Blok"]],
              body: (p.histori_progres || []).map(h => [h.minggu_ke, formatDate(h.tanggal), progrestukang_formatRupiah(h.nominal), h.blok || "-"]),
              styles: { fontSize: 8 },
              headStyles: { fillColor: [27, 94, 32] },
              margin: { left: 14, right: 14 },
            });
            cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 8;
            if (cursorY > 180) { doc.addPage(); cursorY = 14; }
          }
        }
        if (firstSection) doc.text("Belum ada data.", 14, 30);
        doc.save(`detail-progres-tukang-${new Date().toISOString().slice(0, 10)}.pdf`);
      }
      showToast("PDF berhasil diunduh");
    } catch (e: any) { showToast(e?.message || "Gagal export PDF", "error"); }
  };

  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      // Sheet 1: Rekap Kontrak
      const h1 = ["No", "Nama Tukang", "Lokasi", "Total Kontrak", "Terbayar", "Sisa", "% Selesai", "Status", "Tgl Mulai", "Estimasi Selesai", "Keterangan"];
      const r1 = filtered.map((p, i) => [
        i + 1, p.nama_tukang, p.lokasi || "-",
        progrestukang_formatRupiah(p.total_kontrak), progrestukang_formatRupiah(p.total_terbayar),
        progrestukang_formatRupiah(p.sisa_progres), `${p.persen_selesai}%`, p.status,
        p.tanggal_mulai ? formatDate(p.tanggal_mulai) : "-",
        p.estimasi_selesai ? formatDate(p.estimasi_selesai) : "-",
        p.keterangan || "",
      ]);
      const totK = filtered.reduce((s, p) => s + p.total_kontrak, 0);
      const totT = filtered.reduce((s, p) => s + p.total_terbayar, 0);
      const totS = filtered.reduce((s, p) => s + p.sisa_progres, 0);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h1, ...r1, [], ["", "TOTAL", "", progrestukang_formatRupiah(totK), progrestukang_formatRupiah(totT), progrestukang_formatRupiah(totS), "", "", "", "", ""]]), "Rekap Kontrak");

      // Sheet 2: Histori Progres
      const h2 = ["No", "Nama Tukang", "Lokasi Kontrak", "Tanggal", "Minggu Ke-", "Nominal", "Blok"];
      const r2: any[] = [];
      let no = 1;
      progresData.forEach(p => {
        (p.histori_progres || []).forEach(h => {
          r2.push([no++, p.nama_tukang, p.lokasi || "-", h.tanggal ? formatDate(h.tanggal) : "-", h.minggu_ke, progrestukang_formatRupiah(h.nominal), h.blok || "-"]);
        });
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h2, ...r2]), "Histori Progres");

      // Sheet 3: Rekap per Tukang (dari nama unik)
      const h3 = ["Nama Tukang", "Total Kontrak", "Terbayar", "Sisa", "% Selesai"];
      const r3 = namaTukangUnik.map(nama => {
        const items = progresData.filter(p => p.nama_tukang === nama);
        const tt = items.reduce((s, p) => s + p.total_kontrak, 0);
        const td = items.reduce((s, p) => s + p.total_terbayar, 0);
        const ts = items.reduce((s, p) => s + p.sisa_progres, 0);
        const pr = tt > 0 ? Math.round((td / tt) * 100) : 0;
        return [nama, progrestukang_formatRupiah(tt), progrestukang_formatRupiah(td), progrestukang_formatRupiah(ts), `${pr}%`];
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h3, ...r3]), "Rekap per Tukang");

      XLSX.writeFile(wb, `laporan-progres-tukang-${new Date().getFullYear()}.xlsx`);
      showToast("Excel berhasil diunduh");
    } catch (e: any) { showToast(e?.message || "Gagal export Excel", "error"); }
  };

  const exportWord = () => {
    try {
      const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const rows = filtered.map((p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(p.nama_tukang)}</td>
          <td>${escapeHtml(p.lokasi || "-")}</td>
          <td>${progrestukang_formatRupiah(p.total_kontrak)}</td>
          <td>${progrestukang_formatRupiah(p.total_terbayar)}</td>
          <td>${progrestukang_formatRupiah(p.sisa_progres)}</td>
          <td>${p.persen_selesai}%</td>
          <td>${p.status}</td>
        </tr>
      `).join("");
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Laporan Progres Tukang</title>
        <style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #555;padding:6px;font-size:11px}th{background:#1b5e20;color:#fff}</style>
        </head><body>
        <h2>Laporan Progres Tukang — Divisi Perumahan</h2>
        <p>Tanggal cetak: ${new Date().toLocaleDateString("id-ID")}</p>
        <table>
          <thead><tr><th>No</th><th>Tukang</th><th>Lokasi</th><th>Total Kontrak</th><th>Terbayar</th><th>Sisa</th><th>% Selesai</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        </body></html>`;
      const blob = new Blob(["\ufeff", html], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-progres-tukang-${new Date().toISOString().slice(0, 10)}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Word berhasil diunduh");
    } catch (e: any) { showToast(e?.message || "Gagal export Word", "error"); }
  };

  const handlePrint = () => window.print();

  // ===== Active filter chips =====
  const activeFilterChips: Array<{ label: string; clear: () => void }> = [];
  if (filterCariNama) activeFilterChips.push({ label: `Tukang: ${filterCariNama}`, clear: () => setFilterCariNama("") });
  if (filterCariLokasi) activeFilterChips.push({ label: `Lokasi: ${filterCariLokasi}`, clear: () => setFilterCariLokasi("") });
  if (filterStatus) activeFilterChips.push({ label: filterStatus, clear: () => setFilterStatus("") });
  if (filterProgres) activeFilterChips.push({ label: `${filterProgres}%`, clear: () => setFilterProgres("") });
  if (filterDari) activeFilterChips.push({ label: `Dari: ${filterDari}`, clear: () => setFilterDari("") });
  if (filterSampai) activeFilterChips.push({ label: `Sampai: ${filterSampai}`, clear: () => setFilterSampai("") });

  // ===== Render =====
  if (access === "NONE") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-lg font-semibold text-foreground">Akses Ditolak</p>
        <p className="text-muted-foreground text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="page-progres-tukang">
      <style>{`
        @media print {
          aside, header, .no-print { display: none !important; }
          main { overflow: visible !important; }
          @page { size: A4 landscape; margin: 1cm; }
          .print-area { padding: 0 !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 no-print">
        <div>
          <p className="text-xs text-muted-foreground">Dashboard &gt; Perumahan &gt; Progres Tukang</p>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: AKSEN }}>
            <Hammer className="w-5 h-5" /> Progres Tukang — Divisi Perumahan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pencatatan & monitoring progres pekerjaan tukang per lokasi pekerjaan</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setRekapNama(namaTukangUnik[0] || ""); setShowRekap(true); }}
            className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5"
            data-testid="btn-rekap-tukang">
            <Users className="w-3.5 h-3.5" /> Rekap per Tukang
          </button>
          <button onClick={() => exportPDF("all")} data-testid="btn-export-pdf"
            className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <FileDown className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={() => exportPDF("detail")} data-testid="btn-export-pdf-detail"
            className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <FileDown className="w-3.5 h-3.5" /> PDF Detail
          </button>
          <button onClick={exportExcel} data-testid="btn-export-excel"
            className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={exportWord} data-testid="btn-export-word"
            className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Word
          </button>
          <button onClick={handlePrint} data-testid="btn-print"
            className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Cetak
          </button>
          {canEdit && (
            <button onClick={openAddKontrak} data-testid="btn-add-kontrak"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm hover:opacity-90 flex items-center gap-1.5"
              style={{ background: AKSEN }}>
              <Plus className="w-3.5 h-3.5" /> Tambah Kontrak Tukang
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 print-area">
        {/* Stats — status cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon="👷" label="Total Kontrak" big={`${stats.totalKontrak}`} sub={progrestukang_formatRupiah(stats.totalNilai)} color="#1565c0" testid="card-total" />
          <StatCard icon="✅" label="Selesai" big={`${stats.selesai}`} sub={`${stats.totalKontrak ? Math.round(stats.selesai / stats.totalKontrak * 100) : 0}% dari total`} color="#1b5e20" testid="card-selesai" />
          <StatCard icon="🔵" label="Berjalan" big={`${stats.berjalan}`} sub={`${stats.totalKontrak ? Math.round(stats.berjalan / stats.totalKontrak * 100) : 0}% dari total`} color="#0288d1" testid="card-berjalan" />
          <StatCard icon="⚪" label="Belum Mulai" big={`${stats.belumMulai}`} sub={`${stats.totalKontrak ? Math.round(stats.belumMulai / stats.totalKontrak * 100) : 0}% dari total`} color="#616161" testid="card-belum" />
        </div>
        {/* Stats — money */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon="💰" label="Total Nilai Kontrak" big={progrestukang_formatRupiah(stats.totalNilai)} sub={`${stats.totalKontrak} kontrak`} color={AKSEN} testid="card-nilai" />
          <StatCard icon="✅" label="Total Terbayar" big={progrestukang_formatRupiah(stats.totalTerbayar)} sub="semua tukang" color="#2e7d32" testid="card-terbayar" />
          <StatCard icon="🔴" label="Total Sisa" big={progrestukang_formatRupiah(stats.totalSisa)} sub="belum terbayar" color="#c62828" testid="card-sisa" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 no-print">
          <div className="bg-card p-4 rounded-2xl border" style={{ borderColor: "hsl(var(--card-border))" }}>
            <p className="text-sm font-semibold text-foreground mb-2">Status Progres Pekerjaan</p>
            {donutData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Belum ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [`${v} kontrak`, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-card p-4 rounded-2xl border" style={{ borderColor: "hsl(var(--card-border))" }}>
            <p className="text-sm font-semibold text-foreground mb-2">Progres Pembayaran per Tukang (+ lokasi)</p>
            {barData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Belum ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, barData.length * 28)}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}Jt` : `${(v / 1000).toFixed(0)}Rb`} style={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="nama" width={160} style={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => progrestukang_formatRupiah(Number(v))} />
                  <Legend />
                  <Bar dataKey="Terbayar" stackId="a" fill="#2e7d32" />
                  <Bar dataKey="Sisa" stackId="a" fill="#c62828" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="bg-card p-4 rounded-2xl border no-print" style={{ borderColor: "hsl(var(--card-border))" }}>
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4" style={{ color: AKSEN }} />
            <p className="text-sm font-semibold text-foreground">Filter & Pencarian</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input value={filterCariNama} onChange={e => setFilterCariNama(e.target.value)} placeholder="Cari nama tukang..."
              className="px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }}
              data-testid="filter-cari-nama" />
            <input value={filterCariLokasi} onChange={e => setFilterCariLokasi(e.target.value)} placeholder="Cari berdasarkan lokasi pekerjaan..."
              className="px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }}
              data-testid="filter-cari-lokasi" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }}
              data-testid="filter-status">
              <option value="">Semua Status</option>
              <option value="Selesai">Selesai</option>
              <option value="Berjalan">Berjalan</option>
              <option value="Belum Mulai">Belum Mulai</option>
            </select>
            <select value={filterProgres} onChange={e => setFilterProgres(e.target.value)}
              className="px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }}>
              <option value="">Semua %</option>
              <option value="0">0%</option>
              <option value="1-25">1–25%</option>
              <option value="26-50">26–50%</option>
              <option value="51-75">51–75%</option>
              <option value="76-99">76–99%</option>
              <option value="100">100%</option>
            </select>
            <input type="date" value={filterDari} onChange={e => setFilterDari(e.target.value)}
              className="px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }} />
            <input type="date" value={filterSampai} onChange={e => setFilterSampai(e.target.value)}
              className="px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }} />
            <button onClick={resetFilter} className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted"
              style={{ borderColor: "hsl(var(--border))" }} data-testid="btn-reset-filter">
              🔄 Reset Semua
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <p className="text-xs text-muted-foreground">Menampilkan {filtered.length} dari {progresData.length} total kontrak</p>
          </div>
          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {activeFilterChips.map((c, i) => (
                <button key={i} onClick={c.clear}
                  className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                  style={{ background: "rgba(27,94,32,0.1)", color: AKSEN }}>
                  <X className="w-3 h-3" /> {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(var(--card-border))" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-progres">
              <thead>
                <tr style={{ background: AKSEN, color: "white" }}>
                  {["No", "Tukang", "Lokasi", "Total Kontrak", "Terbayar", "Sisa", "% Selesai", "Status", "Tgl Mulai", "Aksi"].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground text-sm">Tidak ada data yang sesuai dengan filter.</td></tr>
                )}
                {pageData.map((p, i) => {
                  const rowIdx = (page - 1) * PAGE_SIZE + i;
                  const namaDisplay = truncateMiddle(p.nama_tukang, 30);
                  const lokasiDisplay = truncateMiddle(p.lokasi || "-", 30);
                  return (
                    <tr key={p.id} className={`border-b hover:bg-muted/30 ${getStatusRowClass(p.status)}`} style={{ borderColor: "hsl(var(--border))" }}
                      data-testid={`row-progres-${p.id}`}>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{rowIdx + 1}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-foreground text-xs" title={p.nama_tukang}>{namaDisplay}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-foreground" title={p.lokasi || ""}>{lokasiDisplay}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: AKSEN }}>{progrestukang_formatRupiah(p.total_kontrak)}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: "#2e7d32" }}>
                        {progrestukang_formatRupiah(p.total_terbayar)}
                        {p.total_terbayar > p.total_kontrak && (
                          <span title="Pembayaran melebihi nilai kontrak" className="ml-1 px-1 py-0.5 rounded text-xs font-bold" style={{ background: "#fef3c7", color: "#92400e" }}>⚠ Lebih</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: p.sisa_progres > 0 ? "#c62828" : "#1b5e20" }}>{progrestukang_formatRupiah(p.sisa_progres)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${p.persen_selesai}%`, background: getProgressBarColor(p.persen_selesai) }} />
                          </div>
                          <span className="text-xs font-medium">{p.persen_selesai}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(p.status)}`}>{p.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.tanggal_mulai ? formatDate(p.tanggal_mulai) : "-"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 no-print">
                          <button onClick={() => setDetailItem(p)} aria-label={`Lihat detail kontrak ${p.nama_tukang}`} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500" title="Detail" data-testid={`btn-detail-${p.id}`}>
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openHistori(p)} aria-label={`Catat progres untuk ${p.nama_tukang}`} className="p-1.5 rounded-lg hover:bg-green-100 text-green-700" title="Catat Progres" data-testid={`btn-histori-${p.id}`}>
                            <ClipboardList className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <>
                              <button onClick={() => openEditKontrak(p)} aria-label={`Edit kontrak ${p.nama_tukang}`} className="p-1.5 rounded-lg hover:bg-yellow-100 text-yellow-600" title="Edit" data-testid={`btn-edit-${p.id}`}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setConfirmDel(p)} aria-label={`Hapus kontrak ${p.nama_tukang}`} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500" title="Hapus" data-testid={`btn-del-${p.id}`}>
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t no-print" style={{ borderColor: "hsl(var(--border))" }}>
              <p className="text-xs text-muted-foreground">
                Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} total
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Halaman sebelumnya"
                  className="p-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: "hsl(var(--border))" }}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 py-1.5 text-xs">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Halaman berikutnya"
                  className="p-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: "hsl(var(--border))" }}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==== MODAL: Kontrak Add/Edit ==== */}
      {showKontrakModal && (
        <ModalShell onClose={() => setShowKontrakModal(false)} title={kontrakEditId ? "Edit Kontrak Pekerjaan Tukang" : "Tambah Data Kontrak Pekerjaan Tukang"} size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nama Tukang *">
              <input type="text" value={kontrakForm.nama_tukang}
                onChange={e => setKontrakForm(f => ({ ...f, nama_tukang: e.target.value }))}
                placeholder="Contoh: Budi Hartono"
                maxLength={100}
                autoComplete="off"
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="kontrak-input-nama-tukang" />
              <p className="text-xs text-muted-foreground mt-1">3–100 karakter.</p>
            </Field>
            <Field label="Lokasi *">
              <input type="text" value={kontrakForm.lokasi}
                onChange={e => setKontrakForm(f => ({ ...f, lokasi: e.target.value }))}
                placeholder="Contoh: Area Blok A, Perumahan Griya Indah, Jl. Mawar No.5"
                maxLength={200}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="kontrak-input-lokasi" />
              <p className="text-xs text-muted-foreground mt-1">Isi dengan lokasi/area pekerjaan secara spesifik (maks 200).</p>
            </Field>
            <Field label="Total Kontrak *">
              <input type="text" inputMode="numeric"
                value={progrestukang_formatRupiahInput(kontrakForm.total_kontrak)}
                onChange={e => setKontrakForm(f => ({ ...f, total_kontrak: progrestukang_parseRupiah(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="kontrak-input-total" />
            </Field>
            <Field label="Tanggal Mulai *">
              <input type="date" value={kontrakForm.tanggal_mulai} onChange={e => setKontrakForm(f => ({ ...f, tanggal_mulai: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
            </Field>
            <Field label="Estimasi Selesai">
              <input type="date" value={kontrakForm.estimasi_selesai} onChange={e => setKontrakForm(f => ({ ...f, estimasi_selesai: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
            </Field>
            <Field label="Keterangan" className="md:col-span-2">
              <textarea value={kontrakForm.keterangan} maxLength={300} rows={2}
                onChange={e => setKontrakForm(f => ({ ...f, keterangan: e.target.value }))}
                placeholder="Deskripsi lingkup pekerjaan (bisa mencantumkan spesialisasi di sini)"
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
              <p className="text-xs text-muted-foreground mt-1">{kontrakForm.keterangan.length}/300 karakter</p>
            </Field>
          </div>
          {/* Preview */}
          <div className="mt-4 p-3 rounded-xl bg-muted/50 border" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="text-xs font-semibold text-foreground mb-2">📊 Ringkasan Kontrak</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>Nilai Kontrak : <span className="font-semibold" style={{ color: AKSEN }}>{progrestukang_formatRupiah(kontrakForm.total_kontrak)}</span></div>
              <div>Status Awal : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">⚪ Belum Mulai</span></div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowKontrakModal(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
            <button onClick={handleSaveKontrak} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: AKSEN }} data-testid="btn-save-kontrak">💾 Simpan Kontrak</button>
          </div>
        </ModalShell>
      )}

      {/* ==== MODAL: Detail ==== */}
      {detailItem && (
        <ModalShell onClose={() => setDetailItem(null)} title="Detail Kontrak Tukang" size="lg">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <DetailRow label="Tukang" value={detailItem.nama_tukang} />
            <DetailRow label="Lokasi" value={detailItem.lokasi || "-"} />
            <DetailRow label="Total Kontrak" value={progrestukang_formatRupiah(detailItem.total_kontrak)} />
            <DetailRow label="Total Terbayar" value={progrestukang_formatRupiah(detailItem.total_terbayar)} />
            <DetailRow label="Sisa" value={progrestukang_formatRupiah(detailItem.sisa_progres)} />
            <DetailRow label="% Selesai" value={`${detailItem.persen_selesai}%`} />
            <DetailRow label="Status" value={<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(detailItem.status)}`}>{detailItem.status}</span>} />
            <DetailRow label="Tgl Mulai" value={detailItem.tanggal_mulai ? formatDate(detailItem.tanggal_mulai) : "-"} />
            <DetailRow label="Estimasi Selesai" value={detailItem.estimasi_selesai ? formatDate(detailItem.estimasi_selesai) : "-"} />
            <DetailRow label="Keterangan" value={detailItem.keterangan || "-"} />
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold mb-1">Progress</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="h-2.5 rounded-full" style={{ width: `${detailItem.persen_selesai}%`, background: getProgressBarColor(detailItem.persen_selesai) }} />
            </div>
          </div>
          {(detailItem.histori_progres || []).length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold mb-2">Histori Progres (5 terakhir)</p>
              <div className="space-y-1 text-xs">
                {(detailItem.histori_progres || []).slice(-5).reverse().map(h => (
                  <div key={h.id_progres} className="flex justify-between p-2 rounded bg-muted/50">
                    <span>Mgg {h.minggu_ke} — {formatDate(h.tanggal)} {h.blok ? `(${h.blok})` : ""}</span>
                    <span className="font-semibold text-green-700">{progrestukang_formatRupiah(h.nominal)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-5">
            <button onClick={() => { const it = detailItem; setDetailItem(null); openHistori(it); }}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: AKSEN }}>📋 Lihat Histori Lengkap</button>
            <button onClick={() => setDetailItem(null)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>Tutup</button>
          </div>
        </ModalShell>
      )}

      {/* ==== MODAL: Histori & Catat Progres ==== */}
      {historiItem && (
        <ModalShell onClose={() => setHistoriItem(null)} title={`Histori Progres — ${historiItem.nama_tukang}`} size="lg">
          {historiItem.total_terbayar > historiItem.total_kontrak && (
            <div className="p-3 rounded-xl mb-3 text-xs border" style={{ background: "#fef3c7", borderColor: "#f59e0b", color: "#92400e" }} role="alert">
              ⚠ <strong>Peringatan:</strong> Total pembayaran ({progrestukang_formatRupiah(historiItem.total_terbayar)}) melebihi nilai kontrak ({progrestukang_formatRupiah(historiItem.total_kontrak)}) sebesar {progrestukang_formatRupiah(historiItem.total_terbayar - historiItem.total_kontrak)}.
            </div>
          )}
          {/* Ringkasan Kontrak */}
          <div className="p-3 rounded-xl bg-muted/50 border mb-4 text-xs space-y-1" style={{ borderColor: "hsl(var(--border))" }}>
            <p>Tukang : <strong>{historiItem.nama_tukang}</strong></p>
            <p>Lokasi : <strong>{historiItem.lokasi || "-"}</strong></p>
            <p>Kontrak : <strong>{progrestukang_formatRupiah(historiItem.total_kontrak)}</strong></p>
            <p>Terbayar : <strong className="text-green-700">{progrestukang_formatRupiah(historiItem.total_terbayar)}</strong></p>
            <p>Sisa : <strong className="text-red-600">{progrestukang_formatRupiah(historiItem.sisa_progres)}</strong></p>
            <div className="mt-2">
              <div className="flex justify-between mb-1">
                <span>Progress</span>
                <span className="font-semibold">{historiItem.persen_selesai}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="h-2.5 rounded-full" style={{ width: `${historiItem.persen_selesai}%`, background: getProgressBarColor(historiItem.persen_selesai) }} />
              </div>
            </div>
            <p>Status : <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(historiItem.status)}`}>{historiItem.status}</span></p>
          </div>

          {/* Tabel Histori */}
          <div className="mb-4">
            <p className="text-sm font-semibold mb-2">📋 Histori Progres</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" data-testid="table-histori">
                <thead>
                  <tr style={{ background: AKSEN, color: "white" }}>
                    {["No", "Tanggal", "Mgg Ke-", "Nominal", "Blok", "Foto", "Aksi"].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(historiItem.histori_progres || []).length === 0 && (
                    <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">Belum ada laporan progres.</td></tr>
                  )}
                  {(historiItem.histori_progres || []).map((h, i) => {
                    const blokDisplay = truncateMiddle(h.blok || "-", 30);
                    return (
                      <tr key={h.id_progres} className="border-b" style={{ borderColor: "hsl(var(--border))" }}>
                        <td className="px-2 py-1.5">{i + 1}</td>
                        <td className="px-2 py-1.5">{formatDate(h.tanggal)}</td>
                        <td className="px-2 py-1.5">{h.minggu_ke}</td>
                        <td className="px-2 py-1.5 font-semibold text-green-700">{progrestukang_formatRupiah(h.nominal)}</td>
                        <td className="px-2 py-1.5" title={h.blok || ""}>{blokDisplay}</td>
                        <td className="px-2 py-1.5">
                          {h.foto ? (
                            h.foto.tipe.startsWith("image/") ? (
                              <a href={h.foto.data_base64} target="_blank" rel="noreferrer" className="text-blue-600 underline flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> Lihat
                              </a>
                            ) : (
                              <a href={h.foto.data_base64} download={h.foto.nama_file} className="text-blue-600 underline flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Dok
                              </a>
                            )
                          ) : "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          {canEdit && (
                            <button onClick={() => handleDeleteHistori(h)} aria-label={`Hapus progres minggu ke-${h.minggu_ke}`} className="p-1 text-red-500 hover:bg-red-100 rounded" data-testid={`btn-del-hist-${h.id_progres}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {(historiItem.histori_progres || []).length > 0 && (
                  <tfoot>
                    <tr className="bg-muted/40 font-semibold">
                      <td colSpan={3} className="px-2 py-1.5">Total Terbayar</td>
                      <td className="px-2 py-1.5 text-green-700">{progrestukang_formatRupiah(historiItem.total_terbayar)}</td>
                      <td colSpan={3}></td>
                    </tr>
                    <tr className="bg-muted/40 font-semibold">
                      <td colSpan={3} className="px-2 py-1.5">Sisa Kontrak</td>
                      <td className="px-2 py-1.5 text-red-600">{progrestukang_formatRupiah(historiItem.sisa_progres)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Form Input Progres Baru */}
          {canEdit && historiItem.sisa_progres > 0 && (
            <div className="border-t pt-4" style={{ borderColor: "hsl(var(--border))" }}>
              <p className="text-sm font-semibold mb-2">➕ Catat Progres Mingguan Baru</p>
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 mb-3 text-xs space-y-0.5">
                <p>ℹ️ Tukang : <strong>{historiItem.nama_tukang}</strong></p>
                <p>📍 Lokasi : <strong>{historiItem.lokasi || "-"}</strong></p>
                <p>💰 Kontrak total : <strong>{progrestukang_formatRupiah(historiItem.total_kontrak)}</strong></p>
                <p>✅ Sudah dibayar : <strong>{progrestukang_formatRupiah(historiItem.total_terbayar)}</strong> ({historiItem.persen_selesai}%)</p>
                <p>🔴 Sisa kontrak : <strong>{progrestukang_formatRupiah(historiItem.sisa_progres)}</strong></p>
                <p>📋 Ini adalah progres minggu ke- : <strong>{(historiItem.histori_progres?.length || 0) + 1}</strong></p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Tanggal Progres *">
                  <input type="date" value={progresForm.tanggal} onChange={e => setProgresForm(f => ({ ...f, tanggal: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                </Field>
                <Field label="Nominal Progres *">
                  <input type="text" inputMode="numeric"
                    value={progrestukang_formatRupiahInput(progresForm.nominal)}
                    onChange={e => setProgresForm(f => ({ ...f, nominal: progrestukang_parseRupiah(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                    data-testid="progres-input-nominal" />
                </Field>
                <Field label="Blok *" className="md:col-span-2">
                  <input type="text" value={progresForm.blok}
                    onChange={e => setProgresForm(f => ({ ...f, blok: e.target.value }))}
                    placeholder="Contoh: A-01 atau A-01, A-02 (pisahkan dengan koma jika lebih dari satu blok)"
                    maxLength={150}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                    data-testid="progres-input-blok" />
                  <p className="text-xs text-muted-foreground mt-1">Isi dengan kode blok yang dikerjakan pada minggu ini.</p>
                </Field>
                <Field label="Foto / Dokumen (opsional, JPG/PNG/PDF, maks 3.5MB)" className="md:col-span-2">
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/*,application/pdf"
                    onChange={e => handleFileUpload(e.target.files?.[0] || null)}
                    className="w-full text-xs" />
                  {progresForm.foto && (
                    <p className="text-xs text-green-700 mt-1">📎 {progresForm.foto.nama_file} ({Math.round(progresForm.foto.ukuran / 1024)} KB)</p>
                  )}
                </Field>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => setProgresForm(f => ({ ...f, nominal: historiItem.sisa_progres }))}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-white" style={{ background: "#1b5e20" }}
                  data-testid="btn-bayar-sisa">
                  ✅ Bayar Sisa Sekaligus ({progrestukang_formatRupiah(historiItem.sisa_progres)})
                </button>
                <button onClick={handleSaveProgres} className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: AKSEN }} data-testid="btn-save-progres">
                  💾 Catat Progres
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button onClick={() => setHistoriItem(null)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>❌ Tutup</button>
          </div>
        </ModalShell>
      )}

      {/* Confirm Delete Kontrak */}
      {confirmDel && (
        <ModalShell onClose={() => setConfirmDel(null)} title="Hapus Kontrak Tukang?" size="sm">
          <p className="text-sm text-foreground">
            Kontrak pekerjaan <strong>{confirmDel.nama_tukang}</strong> di lokasi <strong>{confirmDel.lokasi || "-"}</strong> beserta seluruh histori progres ({(confirmDel.histori_progres || []).length} entri) akan dihapus permanen.
          </p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
            <button onClick={handleDeleteKontrak} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium" data-testid="btn-confirm-del-kontrak">Ya, Hapus!</button>
          </div>
        </ModalShell>
      )}

      {/* Rekap per Tukang */}
      {showRekap && (
        <ModalShell onClose={() => setShowRekap(false)} title="Rekap per Tukang" size="lg">
          <div className="mb-3">
            <Field label="Pilih Tukang">
              <select value={rekapNama} onChange={e => setRekapNama(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="rekap-pilih-tukang">
                <option value="">-- Pilih Tukang --</option>
                {namaTukangUnik.map(nama => <option key={nama} value={nama}>{nama}</option>)}
              </select>
            </Field>
          </div>
          {rekapData && rekapNama && (
            <>
              <div className="p-3 rounded-xl bg-muted/50 mb-3 text-xs space-y-1">
                <p>Nama Tukang : <strong>{rekapNama}</strong></p>
                <p>Total Kontrak Aktif : <strong>{rekapData.items.length} kontrak</strong></p>
                <p>Total Nilai Kontrak : <strong>{progrestukang_formatRupiah(rekapData.totalKontrak)}</strong></p>
                <p>Total Terbayar : <strong className="text-green-700">{progrestukang_formatRupiah(rekapData.totalTerbayar)}</strong></p>
                <p>Total Sisa : <strong className="text-red-600">{progrestukang_formatRupiah(rekapData.totalSisa)}</strong></p>
                <div className="mt-2">
                  <div className="flex justify-between mb-1"><span>Progress Keseluruhan</span><span className="font-semibold">{rekapData.progress}%</span></div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full" style={{ width: `${rekapData.progress}%`, background: getProgressBarColor(rekapData.progress) }} />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: AKSEN, color: "white" }}>
                      {["Lokasi", "Total Kontrak", "Terbayar", "Sisa", "% Selesai", "Status"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rekapData.items.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Belum ada kontrak.</td></tr>
                    )}
                    {rekapData.items.map(p => (
                      <tr key={p.id} className="border-b" style={{ borderColor: "hsl(var(--border))" }}>
                        <td className="px-3 py-2" title={p.lokasi}>{truncateMiddle(p.lokasi || "-", 30)}</td>
                        <td className="px-3 py-2">{progrestukang_formatRupiah(p.total_kontrak)}</td>
                        <td className="px-3 py-2 text-green-700">{progrestukang_formatRupiah(p.total_terbayar)}</td>
                        <td className="px-3 py-2 text-red-600">{progrestukang_formatRupiah(p.sisa_progres)}</td>
                        <td className="px-3 py-2">{p.persen_selesai}%</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(p.status)}`}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="flex gap-3 mt-5">
            <button onClick={() => exportRekapTukangPDF(rekapNama)}
              disabled={!rekapNama}
              className="flex-1 py-2 rounded-xl border text-sm font-medium hover:bg-muted disabled:opacity-50"
              style={{ borderColor: "hsl(var(--border))" }} data-testid="btn-rekap-pdf-tukang-ini">
              ⬇️ PDF Rekap Tukang Ini
            </button>
            <button onClick={() => setShowRekap(false)} className="flex-1 py-2 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>Tutup</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ===== UI Helpers =====
function StatCard({ icon, label, big, sub, color, testid }: { icon: string; label: string; big: string; sub: string; color: string; testid?: string }) {
  return (
    <div className="bg-card p-4 rounded-2xl border" style={{ borderColor: "hsl(var(--card-border))" }} data-testid={testid}>
      <p className="text-xs text-muted-foreground">{icon} {label}</p>
      <p className="text-lg font-bold mt-1" style={{ color }}>{big}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function ModalShell({ children, onClose, title, size = "md" }: { children: React.ReactNode; onClose: () => void; title: string; size?: "sm" | "md" | "lg" }) {
  const w = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-3xl" : "max-w-2xl";
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`bg-card rounded-2xl shadow-2xl w-full ${w} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10" style={{ borderColor: "hsl(var(--border))" }}>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} aria-label="Tutup" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </>
  );
}
