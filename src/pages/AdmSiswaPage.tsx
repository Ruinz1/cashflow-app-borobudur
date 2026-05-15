import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatDate, calcAdmSiswaStatus,
  AdmSiswa, DataSiswa, AdmSiswaStatus, MetodeBayar, SiswaKelas, SiswaStatus, JenisTagihan,
} from "@/lib/types";
import { admSiswaApi, dataSiswaApi, jenisTagihanApi } from "@/lib/api";
import { Link } from "wouter";
import { Wallet } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Plus, Pencil, Trash2, Eye, CreditCard, FileDown, FileSpreadsheet, Printer,
  Search, Users, Receipt, AlertCircle, X, ChevronLeft, ChevronRight, CheckCircle,
} from "lucide-react";

// ===== Helpers =====
function admsiswa_formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "Rp 0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.trunc(Math.abs(value));
  return `${sign}Rp ${abs.toLocaleString("id-ID")}`;
}

function admsiswa_parseRupiah(str: string): number {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^\d-]/g, "");
  return parseInt(cleaned, 10) || 0;
}

function admsiswa_formatRupiahInput(value: number | string): string {
  const n = typeof value === "number" ? value : admsiswa_parseRupiah(value);
  if (n === 0) return "";
  return `Rp ${Math.trunc(Math.abs(n)).toLocaleString("id-ID")}`;
}

const BULAN_LIST = [
  { val: "01", label: "Januari" }, { val: "02", label: "Februari" }, { val: "03", label: "Maret" },
  { val: "04", label: "April" }, { val: "05", label: "Mei" }, { val: "06", label: "Juni" },
  { val: "07", label: "Juli" }, { val: "08", label: "Agustus" }, { val: "09", label: "September" },
  { val: "10", label: "Oktober" }, { val: "11", label: "November" }, { val: "12", label: "Desember" },
];

const KELAS_LIST: SiswaKelas[] = ["Kelompok A", "Kelompok B", "Kelompok Bermain"];

function getJenisBadgeClass(warna: string): string {
  const map: Record<string, string> = {
    primary: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    purple: "bg-purple-100 text-purple-700",
    warning: "bg-yellow-100 text-yellow-800",
    info: "bg-cyan-100 text-cyan-800",
    secondary: "bg-gray-100 text-gray-700",
  };
  return map[warna] || map.secondary;
}

function getStatusBadgeClass(status: AdmSiswaStatus): string {
  if (status === "Lunas") return "bg-green-100 text-green-700";
  if (status === "Kurang Bayar") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function getStatusRowClass(status: AdmSiswaStatus): string {
  if (status === "Lunas") return "bg-green-50/40";
  if (status === "Belum Bayar") return "bg-red-50/30";
  return "";
}

function periodLabel(bulan: string, tahun: string): string {
  if (!bulan || !tahun) return "-";
  const b = BULAN_LIST.find(x => x.val === bulan)?.label || bulan;
  return `${b} ${tahun}`;
}

const AKSEN = "#4527a0";

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium fade-in ${type === "success" ? "bg-green-600" : "bg-red-500"}`}>
      {message}
    </div>
  );
}

// ===== Page =====
export default function AdmSiswaPage() {
  const { user, hasAccess } = useAuth();
  const access = hasAccess("admsiswa");
  const canEdit = access === "CRUD";

  const [activeTab, setActiveTab] = useState<"transaksi" | "siswa">("transaksi");
  const [admData, setAdmData] = useState<AdmSiswa[]>([]);
  const [siswaData, setSiswaData] = useState<DataSiswa[]>([]);
  const [jenisList, setJenisList] = useState<JenisTagihan[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [saldoSummary, setSaldoSummary] = useState<{ total_saldo: number; rincian: { id_siswa: string; nama: string; total_terbayar: number }[], updated_at?: string, updated_by?: string }>({ total_saldo: 0, rincian: [] });
  const [isLoading, setIsLoading] = useState(true);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [adm, sis, jen, sal] = await Promise.all([
        admSiswaApi.list(),
        dataSiswaApi.list(),
        jenisTagihanApi.list(),
        admSiswaApi.saldoSummary()
      ]);
      setAdmData(adm);
      setSiswaData(sis);
      setJenisList(jen);
      setSaldoSummary(sal as any);
    } catch (e) {
      console.error("Gagal load AdmSiswa", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** Map id_siswa -> total terbayar (kumulatif). Dipakai kolom "Saldo Terbayar". */
  const totalBayarPerSiswa = useMemo(() => {
    const m = new Map<string, number>();
    admData.forEach(a => {
      m.set(a.id_siswa, (m.get(a.id_siswa) || 0) + (a.jumlah_dibayar || 0));
    });
    return m;
  }, [admData]);

  // ===== Filter state =====
  const [filterCari, setFilterCari] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterMetode, setFilterMetode] = useState("");
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterDari, setFilterDari] = useState("");
  const [filterSampai, setFilterSampai] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const resetFilter = () => {
    setFilterCari(""); setFilterJenis(""); setFilterStatus(""); setFilterKelas("");
    setFilterMetode(""); setFilterBulan(""); setFilterTahun(""); setFilterDari(""); setFilterSampai("");
    setPage(1);
  };

  // Read query params (e.g., ?status=belumlunas) for dashboard deep link
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const s = sp.get("status");
      if (s === "belumlunas") setFilterStatus("__BELUMLUNAS__");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let arr = [...admData];
    if (filterCari) {
      const q = filterCari.toLowerCase();
      arr = arr.filter(a => a.nama_siswa.toLowerCase().includes(q));
    }
    if (filterJenis) arr = arr.filter(a => a.jenis_tagihan === filterJenis);
    if (filterStatus === "__BELUMLUNAS__") {
      arr = arr.filter(a => a.status !== "Lunas");
    } else if (filterStatus) {
      arr = arr.filter(a => a.status === filterStatus);
    }
    if (filterKelas) arr = arr.filter(a => a.kelas === filterKelas);
    if (filterMetode) arr = arr.filter(a => a.metode_bayar === filterMetode);
    if (filterBulan) arr = arr.filter(a => a.periode_bulan === filterBulan);
    if (filterTahun) arr = arr.filter(a => a.periode_tahun === filterTahun);
    if (filterDari) arr = arr.filter(a => a.tgl_transaksi && a.tgl_transaksi >= filterDari);
    if (filterSampai) arr = arr.filter(a => a.tgl_transaksi && a.tgl_transaksi <= filterSampai);
    return arr.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }, [admData, filterCari, filterJenis, filterStatus, filterKelas, filterMetode, filterBulan, filterTahun, filterDari, filterSampai]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);

  // ===== Stats =====
  const stats = useMemo(() => {
    const totalTagihan = filtered.reduce((s, a) => s + a.tagihan, 0);
    const totalDibayar = filtered.reduce((s, a) => s + a.jumlah_dibayar, 0);
    const lunasArr = filtered.filter(a => a.status === "Lunas");
    const belumKurangArr = filtered.filter(a => a.status !== "Lunas");
    const totalLunas = lunasArr.reduce((s, a) => s + a.jumlah_dibayar, 0);
    const totalBelumKurang = belumKurangArr.reduce((s, a) => s + a.sisa, 0);
    return {
      totalTagihan, totalDibayar,
      countTotal: filtered.length,
      countLunas: lunasArr.length,
      countBelumKurang: belumKurangArr.length,
      totalLunas, totalBelumKurang,
    };
  }, [filtered]);

  // ===== Charts =====
  const donutData = useMemo(() => {
    const lunas = filtered.filter(a => a.status === "Lunas").length;
    const kurang = filtered.filter(a => a.status === "Kurang Bayar").length;
    const belum = filtered.filter(a => a.status === "Belum Bayar").length;
    return [
      { name: "Lunas", value: lunas, color: "#2e7d32" },
      { name: "Kurang Bayar", value: kurang, color: "#e65100" },
      { name: "Belum Bayar", value: belum, color: "#c62828" },
    ].filter(d => d.value > 0);
  }, [filtered]);

  const barData = useMemo(() => {
    return jenisList.map(j => {
      const items = filtered.filter(a => a.jenis_tagihan === j.kode);
      return {
        nama: j.kode,
        Tagihan: items.reduce((s, a) => s + a.tagihan, 0),
        Terbayar: items.reduce((s, a) => s + a.jumlah_dibayar, 0),
      };
    }).filter(d => d.Tagihan > 0 || d.Terbayar > 0);
  }, [filtered, jenisList]);

  // ===== Modal: Transaksi (Add/Edit) =====
  const [showTrxModal, setShowTrxModal] = useState(false);
  const [trxEditId, setTrxEditId] = useState<string | null>(null);
  const emptyForm = {
    id_siswa: "", jenis_tagihan: "SPP", uraian: "", periode_bulan: String(new Date().getMonth() + 1).padStart(2, "0"),
    periode_tahun: String(new Date().getFullYear()),
    tagihan: 150000, jumlah_dibayar: 0,
    tgl_transaksi: new Date().toISOString().slice(0, 10),
    metode_bayar: "Tunai" as MetodeBayar, keterangan: "",
  };
  const [trxForm, setTrxForm] = useState(emptyForm);

  const openAddTrx = () => {
    setTrxEditId(null);
    setTrxForm({ ...emptyForm });
    setShowTrxModal(true);
  };
  const openEditTrx = (item: AdmSiswa) => {
    setTrxEditId(item.id);
    setTrxForm({
      id_siswa: item.id_siswa, jenis_tagihan: item.jenis_tagihan, uraian: item.uraian,
      periode_bulan: item.periode_bulan, periode_tahun: item.periode_tahun,
      tagihan: item.tagihan, jumlah_dibayar: item.jumlah_dibayar,
      tgl_transaksi: item.tgl_transaksi || new Date().toISOString().slice(0, 10),
      metode_bayar: (item.metode_bayar || "Tunai") as MetodeBayar,
      keterangan: item.keterangan,
    });
    setShowTrxModal(true);
  };

  const trxJenisObj = jenisList.find(j => j.kode === trxForm.jenis_tagihan);
  const trxNeedsPeriode = ["SPP", "INFAQ", "MAKAN"].includes(trxForm.jenis_tagihan);
  const trxNeedsUraianManual = trxForm.jenis_tagihan === "LAINNYA";
  const trxShowBayarFields = trxForm.jumlah_dibayar > 0;

  // Pre-fill nominal when jenis changes (only on add)
  useEffect(() => {
    if (!showTrxModal || trxEditId) return;
    const j = jenisList.find(x => x.kode === trxForm.jenis_tagihan);
    if (j && j.nominal_default > 0) {
      setTrxForm(f => ({ ...f, tagihan: j.nominal_default }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trxForm.jenis_tagihan, showTrxModal]);

  const handleSaveTrx = async () => {
    if (!trxForm.id_siswa) { showToast("Siswa wajib dipilih.", "error"); return; }
    if (!trxForm.jenis_tagihan) { showToast("Jenis tagihan wajib dipilih.", "error"); return; }
    if (trxNeedsUraianManual && !trxForm.uraian.trim()) { showToast("Uraian wajib diisi untuk jenis Lainnya.", "error"); return; }
    if (trxNeedsPeriode && (!trxForm.periode_bulan || !trxForm.periode_tahun)) { showToast("Periode wajib diisi.", "error"); return; }
    if (trxForm.tagihan <= 0) { showToast("Tagihan harus > 0.", "error"); return; }
    if (trxForm.jumlah_dibayar < 0) { showToast("Jumlah dibayar tidak boleh negatif.", "error"); return; }
    if (trxForm.jumlah_dibayar > trxForm.tagihan) {
      const ok = window.confirm("Jumlah dibayar melebihi tagihan. Kelebihan dianggap uang muka tagihan berikutnya. Lanjutkan menyimpan?");
      if (!ok) return;
    }
    if (trxShowBayarFields && !trxForm.tgl_transaksi) { showToast("Tgl transaksi wajib diisi.", "error"); return; }

    const siswa = siswaData.find(s => s.id === trxForm.id_siswa);
    if (!siswa) { showToast("Data siswa tidak ditemukan.", "error"); return; }
    const jenis = jenisList.find(j => j.kode === trxForm.jenis_tagihan);
    const { sisa, status } = calcAdmSiswaStatus(trxForm.tagihan, trxForm.jumlah_dibayar);

    const uraianFinal = trxNeedsUraianManual
      ? trxForm.uraian.trim()
      : trxNeedsPeriode
      ? `${jenis?.nama || trxForm.jenis_tagihan} ${periodLabel(trxForm.periode_bulan, trxForm.periode_tahun)}`
      : (trxForm.uraian.trim() || jenis?.nama || trxForm.jenis_tagihan);

    try {
      if (trxEditId) {
        await admSiswaApi.update(trxEditId, {
          id_siswa: siswa.id, nama_siswa: siswa.nama, kelas: siswa.kelas,
          jenis_tagihan: trxForm.jenis_tagihan, uraian: uraianFinal,
          periode_bulan: trxNeedsPeriode ? trxForm.periode_bulan : "",
          periode_tahun: trxNeedsPeriode ? trxForm.periode_tahun : "",
          tagihan: trxForm.tagihan, jumlah_dibayar: trxForm.jumlah_dibayar,
          tgl_transaksi: trxShowBayarFields ? trxForm.tgl_transaksi : "",
          metode_bayar: trxShowBayarFields ? trxForm.metode_bayar : "",
          keterangan: trxForm.keterangan
        });
      } else {
        await admSiswaApi.create({
          id_siswa: siswa.id, nama_siswa: siswa.nama, kelas: siswa.kelas,
          jenis_tagihan: trxForm.jenis_tagihan, uraian: uraianFinal,
          periode_bulan: trxNeedsPeriode ? trxForm.periode_bulan : "",
          periode_tahun: trxNeedsPeriode ? trxForm.periode_tahun : "",
          tagihan: trxForm.tagihan, jumlah_dibayar: trxForm.jumlah_dibayar,
          tgl_transaksi: trxShowBayarFields ? trxForm.tgl_transaksi : "",
          metode_bayar: trxShowBayarFields ? trxForm.metode_bayar : "",
          keterangan: trxForm.keterangan
        });
      }
      loadData();
      setShowTrxModal(false);
      showToast(trxEditId ? "Data berhasil diperbarui!" : "Data pembayaran berhasil disimpan!");
    } catch (e: any) {
      showToast(e?.message || "Gagal menyimpan", "error");
    }
  };

  // ===== Modal: Detail =====
  const [detailItem, setDetailItem] = useState<AdmSiswa | null>(null);

  // ===== Modal: Bayar =====
  const [bayarItem, setBayarItem] = useState<AdmSiswa | null>(null);
  const [bayarForm, setBayarForm] = useState({ jumlah: 0, tgl: "", metode: "Tunai" as MetodeBayar, ket: "" });
  const openBayar = (item: AdmSiswa) => {
    setBayarItem(item);
    setBayarForm({ jumlah: item.sisa, tgl: new Date().toISOString().slice(0, 10), metode: "Tunai", ket: "" });
  };
  const handleSaveBayar = async () => {
    if (!bayarItem) return;
    if (bayarForm.jumlah <= 0) { showToast("Jumlah bayar harus > 0.", "error"); return; }
    if (bayarForm.jumlah > bayarItem.sisa) { showToast("Jumlah bayar melebihi sisa tagihan.", "error"); return; }
    if (!bayarForm.tgl) { showToast("Tgl transaksi wajib diisi.", "error"); return; }
    
    try {
      await admSiswaApi.update(bayarItem.id, {
        jumlah_dibayar: bayarItem.jumlah_dibayar + bayarForm.jumlah,
        tgl_transaksi: bayarForm.tgl,
        metode_bayar: bayarForm.metode,
        keterangan: bayarForm.ket || bayarItem.keterangan
      });
      loadData();
      const jum = bayarForm.jumlah;
      setBayarItem(null);
      showToast(`Pembayaran sebesar ${admsiswa_formatRupiah(jum)} berhasil dicatat!`);
    } catch (e: any) {
      showToast(e?.message || "Gagal", "error");
    }
  };

  // ===== Delete =====
  const [confirmDel, setConfirmDel] = useState<AdmSiswa | null>(null);
  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await admSiswaApi.delete(confirmDel.id);
      loadData();
      setConfirmDel(null);
      showToast("Data pembayaran berhasil dihapus.");
    } catch (e: any) {
      showToast(e?.message || "Gagal menghapus", "error");
    }
  };

  // ===== Master Siswa =====
  const [showSiswaModal, setShowSiswaModal] = useState(false);
  const [siswaEditId, setSiswaEditId] = useState<string | null>(null);
  const [siswaForm, setSiswaForm] = useState({ nama: "", kelas: "Kelompok A" as SiswaKelas, tahun_ajaran: "2024/2025", status: "Aktif" as SiswaStatus });
  const openAddSiswa = () => {
    setSiswaEditId(null);
    setSiswaForm({ nama: "", kelas: "Kelompok A", tahun_ajaran: "2024/2025", status: "Aktif" });
    setShowSiswaModal(true);
  };
  const openEditSiswa = (s: DataSiswa) => {
    setSiswaEditId(s.id);
    setSiswaForm({ nama: s.nama, kelas: s.kelas, tahun_ajaran: s.tahun_ajaran, status: s.status });
    setShowSiswaModal(true);
  };
  const handleSaveSiswa = async () => {
    if (!siswaForm.nama.trim()) { showToast("Nama siswa wajib diisi.", "error"); return; }
    if (!siswaForm.tahun_ajaran.trim()) { showToast("Tahun ajaran wajib diisi.", "error"); return; }
    
    try {
      if (siswaEditId) {
        await dataSiswaApi.update(siswaEditId, siswaForm);
      } else {
        await dataSiswaApi.create(siswaForm);
      }
      loadData();
      setShowSiswaModal(false);
      showToast(siswaEditId ? "Siswa berhasil diperbarui." : "Siswa berhasil ditambahkan.");
    } catch (e: any) {
      showToast(e?.message || "Gagal menyimpan siswa", "error");
    }
  };
  const [confirmDelSiswa, setConfirmDelSiswa] = useState<DataSiswa | null>(null);
  const handleDeleteSiswa = async () => {
    if (!confirmDelSiswa) return;
    const trxCount = admData.filter(a => a.id_siswa === confirmDelSiswa.id).length;
    
    try {
      await dataSiswaApi.delete(confirmDelSiswa.id);
      loadData();
      setConfirmDelSiswa(null);
      showToast(trxCount > 0 ? `Siswa dihapus. ${trxCount} transaksi terkait tetap tersimpan.` : "Siswa berhasil dihapus.");
    } catch (e: any) {
      showToast(e?.message || "Gagal menghapus siswa", "error");
    }
  };

  // ===== Rekap per Siswa =====
  const [showRekap, setShowRekap] = useState(false);
  const [rekapSiswaId, setRekapSiswaId] = useState<string>("");
  const rekapData = useMemo(() => {
    if (!rekapSiswaId) return null;
    const items = admData.filter(a => a.id_siswa === rekapSiswaId);
    const totalTagihan = items.reduce((s, a) => s + a.tagihan, 0);
    const totalDibayar = items.reduce((s, a) => s + a.jumlah_dibayar, 0);
    const totalSisa = items.reduce((s, a) => s + a.sisa, 0);
    const progress = totalTagihan > 0 ? Math.min(100, Math.round((totalDibayar / totalTagihan) * 100)) : 0;
    const siswa = siswaData.find(s => s.id === rekapSiswaId);
    return { items, totalTagihan, totalDibayar, totalSisa, progress, siswa };
  }, [rekapSiswaId, admData, siswaData]);

  // ===== Exports =====
  const exportRekapSiswaPDF = async (siswaId: string) => {
    try {
      const s = siswaData.find(x => x.id === siswaId);
      if (!s) { showToast("Pilih siswa terlebih dahulu.", "error"); return; }
      const items = admData.filter(a => a.id_siswa === siswaId);
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait" });
      doc.setFontSize(13); doc.setFont("helvetica", "bold");
      doc.text(`Rekap Pembayaran — ${s.nama}`, 14, 14);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`${s.kelas} | Tahun Ajaran ${s.tahun_ajaran}`, 14, 20);
      const totT = items.reduce((x, a) => x + a.tagihan, 0);
      const totD = items.reduce((x, a) => x + a.jumlah_dibayar, 0);
      const totS = items.reduce((x, a) => x + a.sisa, 0);
      const prog = totT > 0 ? Math.round((totD / totT) * 100) : 0;
      doc.text(`Progres: ${prog}% | Tanggal cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 26);
      autoTable(doc, {
        startY: 32,
        head: [["Jenis", "Periode", "Tagihan", "Dibayar", "Sisa", "Status"]],
        body: items.map(a => [
          jenisList.find(j => j.kode === a.jenis_tagihan)?.nama || a.jenis_tagihan,
          periodLabel(a.periode_bulan, a.periode_tahun),
          admsiswa_formatRupiah(a.tagihan), admsiswa_formatRupiah(a.jumlah_dibayar),
          admsiswa_formatRupiah(a.sisa), a.status,
        ]),
        foot: [["TOTAL", "", admsiswa_formatRupiah(totT), admsiswa_formatRupiah(totD), admsiswa_formatRupiah(totS), ""]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [69, 39, 160] },
        footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
      });
      doc.save(`rekap-${s.nama.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast("PDF berhasil diunduh");
    } catch (e: any) {
      showToast(e?.message || "Gagal export PDF", "error");
    }
  };

  const exportPDF = async (mode: "all" | "perSiswa" = "all") => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.text("Laporan Administrasi Keuangan Siswa - TK Yaris", 14, 14);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 21);
      doc.text(`Total Data: ${filtered.length} | Lunas: ${stats.countLunas} | Belum/Kurang: ${stats.countBelumKurang}`, 14, 27);

      if (mode === "all") {
        let totT = 0, totD = 0, totS = 0;
        const head = [["No", "Nama Siswa", "Kelas", "Jenis", "Periode", "Tagihan", "Dibayar", "Sisa", "Status", "Tgl Bayar", "Metode"]];
        const body = filtered.map((a, i) => {
          totT += a.tagihan; totD += a.jumlah_dibayar; totS += a.sisa;
          return [
            i + 1, a.nama_siswa, a.kelas,
            jenisList.find(j => j.kode === a.jenis_tagihan)?.nama || a.jenis_tagihan,
            periodLabel(a.periode_bulan, a.periode_tahun),
            admsiswa_formatRupiah(a.tagihan), admsiswa_formatRupiah(a.jumlah_dibayar),
            admsiswa_formatRupiah(a.sisa), a.status,
            a.tgl_transaksi ? formatDate(a.tgl_transaksi) : "-",
            a.metode_bayar || "-",
          ];
        });
        autoTable(doc, {
          head, body, startY: 32, styles: { fontSize: 7 },
          headStyles: { fillColor: [69, 39, 160] },
          foot: [["", "TOTAL", "", "", "", admsiswa_formatRupiah(totT), admsiswa_formatRupiah(totD), admsiswa_formatRupiah(totS), "", "", ""]],
          footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
        });
        const finalY = (doc as any).lastAutoTable?.finalY || 40;
        doc.setFontSize(9);
        doc.text(`Total Tagihan : ${admsiswa_formatRupiah(totT)}`, 14, finalY + 8);
        doc.text(`Total Dibayar : ${admsiswa_formatRupiah(totD)}`, 14, finalY + 14);
        doc.text(`Total Sisa    : ${admsiswa_formatRupiah(totS)}`, 14, finalY + 20);
        doc.save(`laporan-adm-siswa-${new Date().toISOString().slice(0, 10)}.pdf`);
      } else {
        // per-Siswa: one page per siswa with transaksi
        let firstPage = true;
        siswaData.forEach(s => {
          const items = admData.filter(a => a.id_siswa === s.id);
          if (items.length === 0) return;
          if (!firstPage) doc.addPage();
          firstPage = false;
          doc.setFontSize(13); doc.setFont("helvetica", "bold");
          doc.text(`${s.nama} - ${s.kelas} (${s.tahun_ajaran})`, 14, 14);
          const totT = items.reduce((x, a) => x + a.tagihan, 0);
          const totD = items.reduce((x, a) => x + a.jumlah_dibayar, 0);
          const totS = items.reduce((x, a) => x + a.sisa, 0);
          const prog = totT > 0 ? Math.round((totD / totT) * 100) : 0;
          doc.setFontSize(9); doc.setFont("helvetica", "normal");
          doc.text(`Progres Pembayaran: ${prog}%`, 14, 21);
          autoTable(doc, {
            startY: 26,
            head: [["Jenis Tagihan", "Periode", "Tagihan", "Dibayar", "Sisa", "Status"]],
            body: items.map(a => [
              jenisList.find(j => j.kode === a.jenis_tagihan)?.nama || a.jenis_tagihan,
              periodLabel(a.periode_bulan, a.periode_tahun),
              admsiswa_formatRupiah(a.tagihan), admsiswa_formatRupiah(a.jumlah_dibayar),
              admsiswa_formatRupiah(a.sisa), a.status,
            ]),
            foot: [["TOTAL", "", admsiswa_formatRupiah(totT), admsiswa_formatRupiah(totD), admsiswa_formatRupiah(totS), ""]],
            styles: { fontSize: 8 },
            headStyles: { fillColor: [69, 39, 160] },
            footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
          });
        });
        if (firstPage) {
          doc.text("Belum ada data transaksi.", 14, 30);
        }
        doc.save(`rekap-per-siswa-${new Date().toISOString().slice(0, 10)}.pdf`);
      }
      showToast("PDF berhasil diunduh");
    } catch (e: any) {
      showToast(e?.message || "Gagal export PDF", "error");
    }
  };

  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      // Sheet 1: Semua Transaksi
      const h1 = ["No", "Nama Siswa", "Kelas", "Jenis Tagihan", "Uraian", "Periode", "Tagihan", "Dibayar", "Sisa", "Status", "Tgl Transaksi", "Metode", "Keterangan"];
      let totT = 0, totD = 0, totS = 0;
      const r1 = filtered.map((a, i) => {
        totT += a.tagihan; totD += a.jumlah_dibayar; totS += a.sisa;
        return [
          i + 1, a.nama_siswa, a.kelas,
          jenisList.find(j => j.kode === a.jenis_tagihan)?.nama || a.jenis_tagihan,
          a.uraian, periodLabel(a.periode_bulan, a.periode_tahun),
          admsiswa_formatRupiah(a.tagihan), admsiswa_formatRupiah(a.jumlah_dibayar),
          admsiswa_formatRupiah(a.sisa), a.status,
          a.tgl_transaksi ? formatDate(a.tgl_transaksi) : "-",
          a.metode_bayar || "-", a.keterangan,
        ];
      });
      const totalRow = ["", "TOTAL", "", "", "", "", admsiswa_formatRupiah(totT), admsiswa_formatRupiah(totD), admsiswa_formatRupiah(totS), "", "", "", ""];
      const ws1 = XLSX.utils.aoa_to_sheet([h1, ...r1, [], totalRow]);
      XLSX.utils.book_append_sheet(wb, ws1, "Semua Transaksi");

      // Sheet 2: Rekap per Siswa
      const h2 = ["Nama Siswa", "Kelas", "Total Tagihan", "Total Dibayar", "Total Sisa", "Progres %"];
      const r2 = siswaData.map(s => {
        const items = admData.filter(a => a.id_siswa === s.id);
        const tt = items.reduce((x, a) => x + a.tagihan, 0);
        const td = items.reduce((x, a) => x + a.jumlah_dibayar, 0);
        const ts = items.reduce((x, a) => x + a.sisa, 0);
        const pr = tt > 0 ? Math.round((td / tt) * 100) : 0;
        return [s.nama, s.kelas, admsiswa_formatRupiah(tt), admsiswa_formatRupiah(td), admsiswa_formatRupiah(ts), `${pr}%`];
      });
      const ws2 = XLSX.utils.aoa_to_sheet([h2, ...r2]);
      XLSX.utils.book_append_sheet(wb, ws2, "Rekap per Siswa");

      // Sheet 3: Rekap per Jenis
      const h3 = ["Kode", "Nama Tagihan", "Total Tagihan", "Total Terbayar", "Total Sisa"];
      const r3 = jenisList.map(j => {
        const items = admData.filter(a => a.jenis_tagihan === j.kode);
        const tt = items.reduce((x, a) => x + a.tagihan, 0);
        const td = items.reduce((x, a) => x + a.jumlah_dibayar, 0);
        const ts = items.reduce((x, a) => x + a.sisa, 0);
        return [j.kode, j.nama, admsiswa_formatRupiah(tt), admsiswa_formatRupiah(td), admsiswa_formatRupiah(ts)];
      });
      const ws3 = XLSX.utils.aoa_to_sheet([h3, ...r3]);
      XLSX.utils.book_append_sheet(wb, ws3, "Rekap per Jenis");

      // Sheet 4: Rekap Saldo per Siswa (untuk integrasi TK Yaris).
      // Sumber kebenaran: saldoSummary.rincian (mencakup semua siswa yang
      // pernah bertransaksi, termasuk yang master record-nya sudah dihapus).
      const totSaldo = saldoSummary.total_saldo;
      const siswaIndex = new Map<string, DataSiswa>();
      siswaData.forEach(s => siswaIndex.set(s.id, s));
      const h4 = ["No", "Nama Siswa", "Kelas", "Total Terbayar", "Kontribusi %"];
      const r4 = saldoSummary.rincian.map((r, i) => {
        const ms = siswaIndex.get(r.id_siswa);
        const nama = ms?.nama || r.nama || "(siswa dihapus)";
        const kelas = ms?.kelas || "-";
        const pct = totSaldo > 0 ? ((r.total_terbayar / totSaldo) * 100).toFixed(2) + "%" : "0%";
        return [i + 1, nama, kelas, admsiswa_formatRupiah(r.total_terbayar), pct];
      });
      const sumRincian = saldoSummary.rincian.reduce((s, r) => s + r.total_terbayar, 0);
      const sumPct = totSaldo > 0 ? ((sumRincian / totSaldo) * 100).toFixed(2) + "%" : "0%";
      const totRow = ["", "TOTAL SALDO PEMBAYARAN SISWA", "", admsiswa_formatRupiah(sumRincian), sumPct];
      const ws4 = XLSX.utils.aoa_to_sheet([
        ["Total Saldo Pembayaran Siswa (= Saldo Awal Cashflow TK Yaris)"],
        [admsiswa_formatRupiah(totSaldo)],
        [],
        h4, ...r4, [], totRow,
      ]);
      XLSX.utils.book_append_sheet(wb, ws4, "Rekap Saldo per Siswa");

      XLSX.writeFile(wb, `laporan-adm-siswa-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast("Excel berhasil diunduh");
    } catch (e: any) {
      showToast(e?.message || "Gagal export Excel", "error");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ===== Active filter chips =====
  const activeFilterChips: Array<{ label: string; clear: () => void }> = [];
  if (filterCari) activeFilterChips.push({ label: `Cari: ${filterCari}`, clear: () => setFilterCari("") });
  if (filterJenis) activeFilterChips.push({ label: jenisList.find(j => j.kode === filterJenis)?.nama || filterJenis, clear: () => setFilterJenis("") });
  if (filterStatus === "__BELUMLUNAS__") activeFilterChips.push({ label: "Belum/Kurang Bayar", clear: () => setFilterStatus("") });
  else if (filterStatus) activeFilterChips.push({ label: filterStatus, clear: () => setFilterStatus("") });
  if (filterKelas) activeFilterChips.push({ label: filterKelas, clear: () => setFilterKelas("") });
  if (filterMetode) activeFilterChips.push({ label: filterMetode, clear: () => setFilterMetode("") });
  if (filterBulan || filterTahun) activeFilterChips.push({ label: `Periode: ${filterBulan || "-"}/${filterTahun || "-"}`, clear: () => { setFilterBulan(""); setFilterTahun(""); } });
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

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Memuat administrasi siswa...</div>;
  }

  return (
    <div className="space-y-5" data-testid="page-adm-siswa">
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
          <p className="text-xs text-muted-foreground">Dashboard &gt; TK Yaris &gt; Adm. Keuangan Siswa</p>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: AKSEN }}>
            <Receipt className="w-5 h-5" /> Administrasi Keuangan Siswa
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pencatatan SPP, infaq, seragam, iuran & pembayaran lainnya — TK Yaris</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setRekapSiswaId(siswaData[0]?.id || ""); setShowRekap(true); }}
            className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5"
            data-testid="btn-rekap-siswa">
            <Users className="w-3.5 h-3.5" /> Rekap per Siswa
          </button>
          <button onClick={() => exportPDF("all")} data-testid="btn-export-pdf"
            className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <FileDown className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={() => exportPDF("perSiswa")} data-testid="btn-export-pdf-siswa"
            className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <FileDown className="w-3.5 h-3.5" /> PDF per Siswa
          </button>
          <button onClick={exportExcel} data-testid="btn-export-excel"
            className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={handlePrint} data-testid="btn-print"
            className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Cetak
          </button>
          {canEdit && (
            <button onClick={openAddTrx} data-testid="btn-add-trx"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm hover:opacity-90 flex items-center gap-1.5"
              style={{ background: AKSEN }}>
              <Plus className="w-3.5 h-3.5" /> Tambah Transaksi
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b no-print" style={{ borderColor: "hsl(var(--border))" }}>
        <button onClick={() => setActiveTab("transaksi")}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "transaksi" ? "text-white" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          style={activeTab === "transaksi" ? { borderColor: AKSEN, background: AKSEN, color: "white", borderRadius: "0.5rem 0.5rem 0 0" } : {}}
          data-testid="tab-transaksi">
          <Receipt className="w-3.5 h-3.5" /> Data Transaksi
        </button>
        <button onClick={() => setActiveTab("siswa")}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "siswa" ? "text-white" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          style={activeTab === "siswa" ? { borderColor: AKSEN, background: AKSEN, color: "white", borderRadius: "0.5rem 0.5rem 0 0" } : {}}
          data-testid="tab-siswa">
          <Users className="w-3.5 h-3.5" /> Data Siswa
        </button>
      </div>

      {activeTab === "transaksi" && (
        <div className="space-y-4 print-area">
          {/* Total Saldo Pembayaran Siswa — bridge ke Cashflow TK Yaris */}
          <Link
            href="/divisi/tkyaris"
            className="block rounded-2xl p-5 text-white hover:opacity-95 transition-opacity"
            style={{ background: "linear-gradient(135deg, #4527a0, #7c3aed)" }}
            data-testid="card-total-saldo-siswa"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4" />
                  <p className="text-xs font-medium opacity-90">💰 Total Saldo Pembayaran Siswa</p>
                </div>
                <p className="text-3xl font-bold" data-testid="text-total-saldo-siswa">
                  {admsiswa_formatRupiah(saldoSummary.total_saldo)}
                </p>
                <p className="text-xs opacity-90 mt-2">
                  → Salah satu sumber <strong>Saldo Awal Cashflow TK Yaris</strong>
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  ℹ️ Saldo Awal TK Yaris = total ini <strong>+ Saldo Manual Tambahan</strong> (dikelola di halaman TK Yaris).
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Update terakhir: {saldoSummary.updated_at ? new Date(saldoSummary.updated_at).toLocaleString("id-ID") : "-"}
                  {saldoSummary.updated_by ? ` • oleh ${saldoSummary.updated_by}` : ""}
                </p>
              </div>
              <div className="text-right text-xs opacity-90 shrink-0">
                <p>Lihat Cashflow TK Yaris →</p>
              </div>
            </div>
          </Link>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-card p-4 rounded-2xl border" style={{ borderColor: "hsl(var(--card-border))" }} data-testid="card-tagihan">
              <p className="text-xs text-muted-foreground">📋 Total Tagihan</p>
              <p className="text-lg font-bold mt-1" style={{ color: "#1565c0" }}>{admsiswa_formatRupiah(stats.totalTagihan)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.countTotal} transaksi</p>
            </div>
            <div className="bg-card p-4 rounded-2xl border" style={{ borderColor: "hsl(var(--card-border))" }} data-testid="card-lunas">
              <p className="text-xs text-muted-foreground">✅ Total Lunas</p>
              <p className="text-lg font-bold mt-1" style={{ color: "#1b5e20" }}>{admsiswa_formatRupiah(stats.totalLunas)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.countLunas} transaksi</p>
            </div>
            <div className="bg-card p-4 rounded-2xl border" style={{ borderColor: "hsl(var(--card-border))" }} data-testid="card-belum">
              <p className="text-xs text-muted-foreground">⏳ Belum/Kurang</p>
              <p className="text-lg font-bold mt-1" style={{ color: "#c62828" }}>{admsiswa_formatRupiah(stats.totalBelumKurang)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.countBelumKurang} transaksi</p>
            </div>
            <div className="bg-card p-4 rounded-2xl border" style={{ borderColor: "hsl(var(--card-border))" }} data-testid="card-diterima">
              <p className="text-xs text-muted-foreground">💰 Total Diterima</p>
              <p className="text-lg font-bold mt-1" style={{ color: AKSEN }}>{admsiswa_formatRupiah(stats.totalDibayar)}</p>
              <p className="text-xs text-muted-foreground mt-1">semua pembayaran</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 no-print">
            <div className="bg-card p-4 rounded-2xl border" style={{ borderColor: "hsl(var(--card-border))" }}>
              <p className="text-sm font-semibold text-foreground mb-2">Status Pembayaran Siswa</p>
              {donutData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Belum ada data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [`${v} transaksi`, n]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-card p-4 rounded-2xl border" style={{ borderColor: "hsl(var(--card-border))" }}>
              <p className="text-sm font-semibold text-foreground mb-2">Tagihan vs Terbayar per Jenis</p>
              {barData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Belum ada data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nama" style={{ fontSize: 11 }} />
                    <YAxis style={{ fontSize: 10 }} tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}Jt` : `${(v / 1000).toFixed(0)}Rb`} />
                    <Tooltip formatter={(v: any) => admsiswa_formatRupiah(Number(v))} />
                    <Legend />
                    <Bar dataKey="Tagihan" fill="#1565c0" />
                    <Bar dataKey="Terbayar" fill="#2e7d32" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input value={filterCari} onChange={e => setFilterCari(e.target.value)} placeholder="Cari nama siswa..."
                className="px-3 py-2 rounded-xl border text-xs bg-background"
                style={{ borderColor: "hsl(var(--border))" }} data-testid="filter-cari" />
              <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)}
                className="px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="filter-jenis">
                <option value="">Semua Jenis</option>
                {jenisList.map(j => <option key={j.kode} value={j.kode}>{j.nama}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="filter-status">
                <option value="">Semua Status</option>
                <option value="Lunas">Lunas</option>
                <option value="Kurang Bayar">Kurang Bayar</option>
                <option value="Belum Bayar">Belum Bayar</option>
              </select>
              <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
                className="px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="filter-kelas">
                <option value="">Semua Kelas</option>
                {KELAS_LIST.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <select value={filterMetode} onChange={e => setFilterMetode(e.target.value)}
                className="px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }}>
                <option value="">Semua Metode</option>
                <option value="Tunai">Tunai</option>
                <option value="Transfer">Transfer</option>
              </select>
              <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)}
                className="px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }}>
                <option value="">Semua Bulan</option>
                {BULAN_LIST.map(b => <option key={b.val} value={b.val}>{b.label}</option>)}
              </select>
              <input type="number" value={filterTahun} onChange={e => setFilterTahun(e.target.value)} placeholder="Tahun (mis. 2025)"
                className="px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }} />
              <div className="flex gap-2">
                <input type="date" value={filterDari} onChange={e => setFilterDari(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                <input type="date" value={filterSampai} onChange={e => setFilterSampai(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border text-xs bg-background" style={{ borderColor: "hsl(var(--border))" }} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button onClick={resetFilter} className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
                style={{ borderColor: "hsl(var(--border))" }} data-testid="btn-reset-filter">
                🔄 Reset Semua Filter
              </button>
              <p className="text-xs text-muted-foreground">Menampilkan {filtered.length} dari {admData.length} total transaksi</p>
            </div>
            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activeFilterChips.map((c, i) => (
                  <button key={i} onClick={c.clear}
                    className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                    style={{ background: "rgba(69,39,160,0.1)", color: AKSEN }}>
                    <X className="w-3 h-3" /> {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(var(--card-border))" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-trx">
                <thead>
                  <tr style={{ background: AKSEN, color: "white" }}>
                    {["No", "Siswa", "Jenis", "Periode", "Tagihan", "Dibayar", "Sisa/Status", "Saldo Terbayar", "Tgl", "Metode", "Aksi"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap" data-testid={h === "Saldo Terbayar" ? "kolom-saldo-terbayar" : undefined}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.length === 0 && (
                    <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground text-sm">Tidak ada data transaksi yang sesuai dengan filter yang dipilih.</td></tr>
                  )}
                  {pageData.map((a, i) => {
                    const j = jenisList.find(x => x.kode === a.jenis_tagihan);
                    const rowIdx = (page - 1) * PAGE_SIZE + i;
                    return (
                      <tr key={a.id} className={`border-b hover:bg-muted/30 ${getStatusRowClass(a.status)}`} style={{ borderColor: "hsl(var(--border))" }}
                        data-testid={`row-trx-${a.id}`}>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">{rowIdx + 1}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-foreground text-xs">{a.nama_siswa}</p>
                          <p className="text-xs text-muted-foreground">{a.kelas}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getJenisBadgeClass(j?.warna_badge || "secondary")}`}>{j?.nama || a.jenis_tagihan}</span>
                          <p className="text-xs text-muted-foreground mt-1">{a.uraian}</p>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-foreground">{periodLabel(a.periode_bulan, a.periode_tahun)}</td>
                        <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: "#1565c0" }}>{admsiswa_formatRupiah(a.tagihan)}</td>
                        <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: "#1b5e20" }}>{admsiswa_formatRupiah(a.jumlah_dibayar)}</td>
                        <td className="px-3 py-2.5">
                          <p className="text-xs font-semibold" style={{ color: a.sisa > 0 ? "#c62828" : "#1b5e20" }}>{admsiswa_formatRupiah(a.sisa)}</p>
                          <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(a.status)}`}>{a.status}</span>
                        </td>
                        <td
                          className="px-3 py-2.5 text-xs font-bold whitespace-nowrap"
                          style={{ color: AKSEN, background: "rgba(69,39,160,0.06)" }}
                          title={`Akumulasi seluruh pembayaran ${a.nama_siswa} (semua jenis tagihan)`}
                          data-testid={`saldo-terbayar-${a.id}`}
                        >
                          {admsiswa_formatRupiah(totalBayarPerSiswa.get(a.id_siswa) || 0)}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{a.tgl_transaksi ? formatDate(a.tgl_transaksi) : "-"}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{a.metode_bayar || "-"}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 no-print">
                            <button onClick={() => setDetailItem(a)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500" title="Detail" data-testid={`btn-detail-${a.id}`}>
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {canEdit && a.status !== "Lunas" && (
                              <button onClick={() => openBayar(a)} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600" title="Bayar" data-testid={`btn-bayar-${a.id}`}>
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canEdit && (
                              <>
                                <button onClick={() => openEditTrx(a)} className="p-1.5 rounded-lg hover:bg-yellow-100 text-yellow-600" title="Edit" data-testid={`btn-edit-${a.id}`}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setConfirmDel(a)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500" title="Hapus" data-testid={`btn-del-${a.id}`}>
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t no-print" style={{ borderColor: "hsl(var(--border))" }}>
                <p className="text-xs text-muted-foreground">
                  Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} total
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: "hsl(var(--border))" }}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 py-1.5 text-xs">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: "hsl(var(--border))" }}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "siswa" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{siswaData.length} siswa terdaftar</p>
            {canEdit && (
              <button onClick={openAddSiswa} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90"
                style={{ background: AKSEN }} data-testid="btn-add-siswa">
                <Plus className="w-4 h-4" /> Tambah Siswa
              </button>
            )}
          </div>
          <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(var(--card-border))" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-siswa">
                <thead>
                  <tr style={{ background: AKSEN, color: "white" }}>
                    {["No", "Nama Siswa", "Kelas", "Tahun Ajaran", "Status", "Aksi"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {siswaData.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">Belum ada data siswa. Tambahkan siswa terlebih dahulu sebelum mencatat transaksi.</td></tr>
                  )}
                  {siswaData.map((s, i) => (
                    <tr key={s.id} className="border-b hover:bg-muted/30" style={{ borderColor: "hsl(var(--border))" }} data-testid={`row-siswa-${s.id}`}>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{s.nama}</td>
                      <td className="px-4 py-2.5 text-foreground text-xs">{s.kelas}</td>
                      <td className="px-4 py-2.5 text-foreground text-xs">{s.tahun_ajaran}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "Aktif" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{s.status}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {canEdit && (
                          <div className="flex gap-1">
                            <button onClick={() => openEditSiswa(s)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500" data-testid={`btn-edit-siswa-${s.id}`}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirmDelSiswa(s)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500" data-testid={`btn-del-siswa-${s.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==== MODAL: Trx Add/Edit ==== */}
      {showTrxModal && (
        <ModalShell onClose={() => setShowTrxModal(false)} title={trxEditId ? "Edit Pembayaran Siswa" : "Tambah Data Pembayaran Siswa"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Siswa *">
              <select value={trxForm.id_siswa} onChange={e => setTrxForm(f => ({ ...f, id_siswa: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="trx-input-siswa">
                <option value="">-- Pilih Siswa --</option>
                {siswaData.filter(s => s.status === "Aktif").map(s => (
                  <option key={s.id} value={s.id}>{s.nama} — {s.kelas}</option>
                ))}
              </select>
            </Field>
            <Field label="Jenis Tagihan *">
              <select value={trxForm.jenis_tagihan} onChange={e => setTrxForm(f => ({ ...f, jenis_tagihan: e.target.value, uraian: "" }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="trx-input-jenis">
                {jenisList.map(j => <option key={j.kode} value={j.kode}>{j.nama}</option>)}
              </select>
            </Field>
            {trxNeedsPeriode && (
              <>
                <Field label="Bulan Periode *">
                  <select value={trxForm.periode_bulan} onChange={e => setTrxForm(f => ({ ...f, periode_bulan: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}>
                    {BULAN_LIST.map(b => <option key={b.val} value={b.val}>{b.label}</option>)}
                  </select>
                </Field>
                <Field label="Tahun Periode *">
                  <input type="number" value={trxForm.periode_tahun} onChange={e => setTrxForm(f => ({ ...f, periode_tahun: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                </Field>
              </>
            )}
            {(trxNeedsUraianManual || (!trxNeedsPeriode && trxForm.jenis_tagihan !== "")) && (
              <Field label={`Uraian ${trxNeedsUraianManual ? "*" : "(opsional)"}`} className="md:col-span-2">
                <input type="text" value={trxForm.uraian} onChange={e => setTrxForm(f => ({ ...f, uraian: e.target.value }))}
                  placeholder={trxNeedsUraianManual ? "Contoh: Iuran Outing Class" : "Catatan tambahan"}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
              </Field>
            )}
            <Field label="Tagihan *">
              <input type="text" inputMode="numeric"
                value={admsiswa_formatRupiahInput(trxForm.tagihan)}
                onChange={e => setTrxForm(f => ({ ...f, tagihan: admsiswa_parseRupiah(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="trx-input-tagihan" />
            </Field>
            <Field label="Jumlah Dibayar">
              <input type="text" inputMode="numeric"
                value={admsiswa_formatRupiahInput(trxForm.jumlah_dibayar)}
                onChange={e => setTrxForm(f => ({ ...f, jumlah_dibayar: admsiswa_parseRupiah(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="trx-input-dibayar" />
            </Field>
            {trxShowBayarFields && (
              <>
                <Field label="Tgl Transaksi *">
                  <input type="date" value={trxForm.tgl_transaksi} onChange={e => setTrxForm(f => ({ ...f, tgl_transaksi: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
                </Field>
                <Field label="Metode Bayar *">
                  <div className="flex gap-3 items-center pt-2">
                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                      <input type="radio" checked={trxForm.metode_bayar === "Tunai"} onChange={() => setTrxForm(f => ({ ...f, metode_bayar: "Tunai" }))} /> 💵 Tunai
                    </label>
                    <label className="flex items-center gap-1 text-sm cursor-pointer">
                      <input type="radio" checked={trxForm.metode_bayar === "Transfer"} onChange={() => setTrxForm(f => ({ ...f, metode_bayar: "Transfer" }))} /> 🏦 Transfer
                    </label>
                  </div>
                </Field>
              </>
            )}
            <Field label="Keterangan" className="md:col-span-2">
              <input type="text" value={trxForm.keterangan} onChange={e => setTrxForm(f => ({ ...f, keterangan: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
            </Field>
          </div>
          {/* Preview */}
          <div className="mt-4 p-3 rounded-xl bg-muted/50 border" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="text-xs font-semibold text-foreground mb-2">📊 Preview Pembayaran</p>
            {(() => {
              const { sisa, status } = calcAdmSiswaStatus(trxForm.tagihan, trxForm.jumlah_dibayar);
              return (
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>Tagihan : <span className="font-semibold" style={{ color: "#1565c0" }}>{admsiswa_formatRupiah(trxForm.tagihan)}</span></div>
                  <div>Dibayar : <span className="font-semibold" style={{ color: "#1b5e20" }}>{admsiswa_formatRupiah(trxForm.jumlah_dibayar)}</span></div>
                  <div>Sisa : <span className="font-semibold" style={{ color: sisa > 0 ? "#c62828" : "#1b5e20" }}>{admsiswa_formatRupiah(sisa)}</span></div>
                  <div>Status : <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(status)}`}>{status}</span></div>
                </div>
              );
            })()}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowTrxModal(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
            <button onClick={handleSaveTrx} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: AKSEN }} data-testid="btn-save-trx">💾 Simpan</button>
          </div>
        </ModalShell>
      )}

      {/* ==== MODAL: Detail ==== */}
      {detailItem && (
        <ModalShell onClose={() => setDetailItem(null)} title="Detail Transaksi Pembayaran">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <DetailRow label="Siswa" value={`${detailItem.nama_siswa} (${detailItem.kelas})`} />
            <DetailRow label="Jenis" value={
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getJenisBadgeClass(jenisList.find(j => j.kode === detailItem.jenis_tagihan)?.warna_badge || "secondary")}`}>
                {jenisList.find(j => j.kode === detailItem.jenis_tagihan)?.nama || detailItem.jenis_tagihan}
              </span>
            } />
            <DetailRow label="Uraian" value={detailItem.uraian} />
            <DetailRow label="Periode" value={periodLabel(detailItem.periode_bulan, detailItem.periode_tahun)} />
            <DetailRow label="Tagihan" value={admsiswa_formatRupiah(detailItem.tagihan)} />
            <DetailRow label="Dibayar" value={admsiswa_formatRupiah(detailItem.jumlah_dibayar)} />
            <DetailRow label="Sisa" value={admsiswa_formatRupiah(detailItem.sisa)} />
            <DetailRow label="Status" value={<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(detailItem.status)}`}>{detailItem.status}</span>} />
            <DetailRow label="Tgl Transaksi" value={detailItem.tgl_transaksi ? formatDate(detailItem.tgl_transaksi) : "-"} />
            <DetailRow label="Metode" value={detailItem.metode_bayar || "-"} />
            <DetailRow label="Keterangan" value={detailItem.keterangan || "-"} />
            <DetailRow label="Diperbarui" value={detailItem.updated_at ? new Date(detailItem.updated_at).toLocaleString("id-ID") : "-"} />
          </div>
          <div className="flex gap-3 mt-5">
            {canEdit && (
              <button onClick={() => { const it = detailItem; setDetailItem(null); openEditTrx(it); }}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: AKSEN }}>✏️ Edit</button>
            )}
            <button onClick={() => setDetailItem(null)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>Tutup</button>
          </div>
        </ModalShell>
      )}

      {/* ==== MODAL: Bayar Cepat ==== */}
      {bayarItem && (
        <ModalShell onClose={() => setBayarItem(null)} title={`Catat Pembayaran — ${bayarItem.nama_siswa}`}>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 mb-3 text-xs space-y-1">
            <p>Siswa : <strong>{bayarItem.nama_siswa} ({bayarItem.kelas})</strong></p>
            <p>Tagihan : <strong>{jenisList.find(j => j.kode === bayarItem.jenis_tagihan)?.nama} {periodLabel(bayarItem.periode_bulan, bayarItem.periode_tahun)}</strong></p>
            <p>Total : <strong>{admsiswa_formatRupiah(bayarItem.tagihan)}</strong> | Terbayar : <strong style={{ color: "#1b5e20" }}>{admsiswa_formatRupiah(bayarItem.jumlah_dibayar)}</strong> | Sisa : <strong style={{ color: "#c62828" }}>{admsiswa_formatRupiah(bayarItem.sisa)}</strong></p>
          </div>
          <div className="space-y-3">
            <Field label="Jumlah Bayar *">
              <input type="text" inputMode="numeric"
                value={admsiswa_formatRupiahInput(bayarForm.jumlah)}
                onChange={e => setBayarForm(f => ({ ...f, jumlah: admsiswa_parseRupiah(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="bayar-input-jumlah" />
            </Field>
            <button onClick={() => setBayarForm(f => ({ ...f, jumlah: bayarItem.sisa }))}
              className="w-full px-3 py-2 rounded-xl text-xs font-medium text-white"
              style={{ background: "#1b5e20" }} data-testid="bayar-lunas">
              💰 Bayar Lunas ({admsiswa_formatRupiah(bayarItem.sisa)})
            </button>
            <Field label="Tgl Transaksi *">
              <input type="date" value={bayarForm.tgl} onChange={e => setBayarForm(f => ({ ...f, tgl: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
            </Field>
            <Field label="Metode Bayar">
              <div className="flex gap-3 items-center pt-1">
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" checked={bayarForm.metode === "Tunai"} onChange={() => setBayarForm(f => ({ ...f, metode: "Tunai" }))} /> 💵 Tunai
                </label>
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" checked={bayarForm.metode === "Transfer"} onChange={() => setBayarForm(f => ({ ...f, metode: "Transfer" }))} /> 🏦 Transfer
                </label>
              </div>
            </Field>
            <Field label="Keterangan">
              <input type="text" value={bayarForm.ket} onChange={e => setBayarForm(f => ({ ...f, ket: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setBayarItem(null)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
            <button onClick={handleSaveBayar} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: AKSEN }} data-testid="btn-save-bayar">💾 Catat Pembayaran</button>
          </div>
        </ModalShell>
      )}

      {/* ==== Confirm Delete Trx ==== */}
      {confirmDel && (
        <ModalShell onClose={() => setConfirmDel(null)} title="Hapus Data Pembayaran?" size="sm">
          <p className="text-sm text-foreground">
            Data pembayaran <strong>{jenisList.find(j => j.kode === confirmDel.jenis_tagihan)?.nama}</strong> atas nama <strong>{confirmDel.nama_siswa}</strong> {confirmDel.periode_bulan ? `untuk periode ${periodLabel(confirmDel.periode_bulan, confirmDel.periode_tahun)}` : ""} akan dihapus permanen.
          </p>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
            <button onClick={handleDelete} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium" data-testid="btn-confirm-del">Ya, Hapus!</button>
          </div>
        </ModalShell>
      )}

      {/* ==== Master Siswa Modal ==== */}
      {showSiswaModal && (
        <ModalShell onClose={() => setShowSiswaModal(false)} title={siswaEditId ? "Edit Data Siswa" : "Tambah Data Siswa"} size="sm">
          <div className="space-y-3">
            <Field label="Nama Siswa *">
              <input type="text" value={siswaForm.nama} onChange={e => setSiswaForm(f => ({ ...f, nama: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="siswa-input-nama" />
            </Field>
            <Field label="Kelas / Kelompok *">
              <select value={siswaForm.kelas} onChange={e => setSiswaForm(f => ({ ...f, kelas: e.target.value as SiswaKelas }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}>
                {KELAS_LIST.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Tahun Ajaran *">
              <input type="text" value={siswaForm.tahun_ajaran} onChange={e => setSiswaForm(f => ({ ...f, tahun_ajaran: e.target.value }))}
                placeholder="2024/2025"
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }} />
            </Field>
            <Field label="Status">
              <select value={siswaForm.status} onChange={e => setSiswaForm(f => ({ ...f, status: e.target.value as SiswaStatus }))}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}>
                <option value="Aktif">Aktif</option>
                <option value="Tidak Aktif">Tidak Aktif</option>
              </select>
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowSiswaModal(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
            <button onClick={handleSaveSiswa} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: AKSEN }} data-testid="btn-save-siswa">Simpan</button>
          </div>
        </ModalShell>
      )}

      {confirmDelSiswa && (
        <ModalShell onClose={() => setConfirmDelSiswa(null)} title="Hapus Siswa?" size="sm">
          {(() => {
            const trxCount = admData.filter(a => a.id_siswa === confirmDelSiswa.id).length;
            return (
              <div>
                <p className="text-sm text-foreground">
                  Siswa <strong>{confirmDelSiswa.nama}</strong> akan dihapus.
                </p>
                {trxCount > 0 && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mt-2">
                    ⚠️ Siswa ini memiliki {trxCount} transaksi. Menghapus siswa tidak akan menghapus data transaksi terkait.
                  </p>
                )}
              </div>
            );
          })()}
          <div className="flex gap-3 mt-5">
            <button onClick={() => setConfirmDelSiswa(null)} className="flex-1 py-2 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
            <button onClick={handleDeleteSiswa} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium">Ya, Hapus!</button>
          </div>
        </ModalShell>
      )}

      {/* ==== Rekap per Siswa ==== */}
      {showRekap && (
        <ModalShell onClose={() => setShowRekap(false)} title="Rekap Pembayaran per Siswa" size="lg">
          <div className="mb-3">
            <Field label="Pilih Siswa">
              <select value={rekapSiswaId} onChange={e => setRekapSiswaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm bg-background" style={{ borderColor: "hsl(var(--border))" }}
                data-testid="rekap-pilih-siswa">
                <option value="">-- Pilih Siswa --</option>
                {siswaData.map(s => <option key={s.id} value={s.id}>{s.nama} — {s.kelas}</option>)}
              </select>
            </Field>
          </div>
          {rekapData && rekapData.siswa && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: AKSEN, color: "white" }}>
                      {["Jenis", "Periode", "Tagihan", "Dibayar", "Sisa", "Status"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rekapData.items.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Belum ada transaksi.</td></tr>
                    )}
                    {rekapData.items.map(a => (
                      <tr key={a.id} className="border-b" style={{ borderColor: "hsl(var(--border))" }}>
                        <td className="px-3 py-2">{jenisList.find(j => j.kode === a.jenis_tagihan)?.nama || a.jenis_tagihan}</td>
                        <td className="px-3 py-2">{periodLabel(a.periode_bulan, a.periode_tahun)}</td>
                        <td className="px-3 py-2">{admsiswa_formatRupiah(a.tagihan)}</td>
                        <td className="px-3 py-2 text-green-700">{admsiswa_formatRupiah(a.jumlah_dibayar)}</td>
                        <td className="px-3 py-2 text-red-700">{admsiswa_formatRupiah(a.sisa)}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(a.status)}`}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-muted/50 text-xs space-y-1">
                <p>Total Tagihan  : <strong>{admsiswa_formatRupiah(rekapData.totalTagihan)}</strong></p>
                <p>Total Terbayar : <strong className="text-green-700">{admsiswa_formatRupiah(rekapData.totalDibayar)}</strong></p>
                <p>Total Sisa     : <strong className="text-red-700">{admsiswa_formatRupiah(rekapData.totalSisa)}</strong></p>
                <div className="mt-2">
                  <p className="font-semibold">Progres Pembayaran: {rekapData.progress}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
                    <div className="h-3 rounded-full transition-all" style={{ width: `${rekapData.progress}%`, background: rekapData.progress >= 100 ? "#1b5e20" : AKSEN }} />
                  </div>
                </div>
                {/* Kontribusi terhadap Saldo TK Yaris */}
                <div
                  className="mt-3 p-2 rounded-lg"
                  style={{ background: "rgba(69,39,160,0.08)", border: `1px dashed ${AKSEN}` }}
                  data-testid="rekap-kontribusi-tkyaris"
                >
                  <p className="font-semibold" style={{ color: AKSEN }}>💰 Total Saldo Terbayar: {admsiswa_formatRupiah(rekapData.totalDibayar)}</p>
                  <p className="text-muted-foreground mt-0.5">
                    Kontribusi terhadap Saldo TK Yaris: <strong>
                      {saldoSummary.total_saldo > 0
                        ? `${((rekapData.totalDibayar / saldoSummary.total_saldo) * 100).toFixed(1)}%`
                        : "0%"}
                    </strong>
                    {" "}({admsiswa_formatRupiah(rekapData.totalDibayar)} dari {admsiswa_formatRupiah(saldoSummary.total_saldo)})
                  </p>
                </div>
              </div>
            </>
          )}
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => exportRekapSiswaPDF(rekapSiswaId)}
              disabled={!rekapData || !rekapData.siswa}
              className="flex-1 py-2 rounded-xl border text-sm font-medium hover:bg-muted disabled:opacity-50"
              style={{ borderColor: "hsl(var(--border))" }}
              data-testid="btn-rekap-pdf-siswa-ini">
              ⬇️ PDF Siswa Ini
            </button>
            <button onClick={() => exportPDF("perSiswa")} className="flex-1 py-2 rounded-xl border text-sm font-medium hover:bg-muted" style={{ borderColor: "hsl(var(--border))" }}>
              ⬇️ PDF Semua Siswa
            </button>
            <button onClick={() => setShowRekap(false)} className="flex-1 py-2 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>Tutup</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ===== UI helpers =====
function ModalShell({ children, onClose, title, size = "md" }: { children: React.ReactNode; onClose: () => void; title: string; size?: "sm" | "md" | "lg" }) {
  const w = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-3xl" : "max-w-2xl";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={`bg-card rounded-2xl shadow-2xl w-full ${w} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10" style={{ borderColor: "hsl(var(--border))" }}>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
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
