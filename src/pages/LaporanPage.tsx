import { useState, useMemo, useEffect } from "react"
import {
  formatRupiah, DIVISI_CONFIG, DivisiKey,
  DIVISI_UTAMA_KEYS, Transaksi,
} from "@/lib/types";
import { transaksiApi, saldoAwalApi, admSiswaApi, saldoManualApi } from "@/lib/api";
import { exportLaporanPDF, exportLaporanExcel } from "@/lib/exportUtils";
import { useAuth } from "@/contexts/AuthContext";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";
import { FileText, FileSpreadsheet, Printer, TrendingUp, TrendingDown, Wallet, GraduationCap } from "lucide-react";

const MONTHS_LIST = [
  { val: "01", label: "Jan" }, { val: "02", label: "Feb" }, { val: "03", label: "Mar" },
  { val: "04", label: "Apr" }, { val: "05", label: "Mei" }, { val: "06", label: "Jun" },
  { val: "07", label: "Jul" }, { val: "08", label: "Agu" }, { val: "09", label: "Sep" },
  { val: "10", label: "Okt" }, { val: "11", label: "Nov" }, { val: "12", label: "Des" },
];

const FULL_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const TKYARIS_PURPLE = "#7c3aed";

function generateYears() {
  const now = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => String(now - i));
}

type LaporanRow = { key: DivisiKey; label: string; color: string; masuk: number; keluar: number; saldo: number };

export default function LaporanPage() {
  const { hasAccess } = useAuth();
  const [periodeType, setPeriodeType] = useState<"bulanan" | "tahunan">("bulanan");
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [tampilkanTKYaris, setTampilkanTKYaris] = useState(true);

  const [allTransaksi, setAllTransaksi] = useState<Record<string, Transaksi[]>>({});
  const [saldoAwalDivisi, setSaldoAwalDivisi] = useState<Record<string, number>>({});
  const [admSiswaSummary, setAdmSiswaSummary] = useState<{ total_saldo: number }>({ total_saldo: 0 });
  const [totalSaldoManualTK, setTotalSaldoManualTK] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        const trsMap: Record<string, Transaksi[]> = {};
        for (const k of [...DIVISI_UTAMA_KEYS, "tkyaris"] as DivisiKey[]) {
          if (hasAccess(k) !== "NONE") {
            try {
              trsMap[k] = await transaksiApi.list(k);
            } catch (e) {}
          }
        }
        const saldos = await saldoAwalApi.get();
        let admTotal = 0;
        let manualTotal = 0;

        if (hasAccess("tkyaris") !== "NONE" || hasAccess("admsiswa") !== "NONE") {
           try {
             const [admRes, manuals] = await Promise.all([
               admSiswaApi.saldoSummary(),
               saldoManualApi.list()
             ]);
             admTotal = admRes.total_saldo;
             manualTotal = manuals.reduce((s, m) => s + m.nominal, 0);
           } catch(e) {}
        }

        if (mounted) {
          setAllTransaksi(trsMap);
          setSaldoAwalDivisi(saldos);
          setAdmSiswaSummary({ total_saldo: admTotal });
          setTotalSaldoManualTK(manualTotal);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Gagal memuat laporan", err);
        if (mounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [hasAccess]);

  const computeRow = (k: DivisiKey): LaporanRow | null => {
    if (hasAccess(k) === "NONE") return null;
    const all = allTransaksi[k] || [];
    const filtered = all.filter(t => {
      if (periodeType === "bulanan") return t.tanggal.startsWith(`${filterYear}-${filterMonth}`);
      return t.tanggal.startsWith(filterYear);
    });
    const masuk = filtered.reduce((s, t) => s + t.uang_masuk, 0);
    const keluar = filtered.reduce((s, t) => s + t.uang_keluar, 0);
    
    let saldoAwal = saldoAwalDivisi[k] ?? 0;
    if (k === "tkyaris") {
        saldoAwal = admSiswaSummary.total_saldo + totalSaldoManualTK;
    }
    const saldo = saldoAwal + masuk - keluar;
    return { key: k, label: DIVISI_CONFIG[k].label, color: DIVISI_CONFIG[k].color, masuk, keluar, saldo };
  };

  const divisiUtamaData = useMemo(() => {
    return DIVISI_UTAMA_KEYS.map(computeRow).filter(Boolean) as LaporanRow[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodeType, filterMonth, filterYear, allTransaksi, saldoAwalDivisi, admSiswaSummary, totalSaldoManualTK]);

  const tkyarisRow = useMemo<LaporanRow | null>(() => computeRow("tkyaris"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periodeType, filterMonth, filterYear, allTransaksi, saldoAwalDivisi, admSiswaSummary, totalSaldoManualTK]);

  // Total Perusahaan = HANYA 5 divisi utama
  const totalMasuk = divisiUtamaData.reduce((s, d) => s + d.masuk, 0);
  const totalKeluar = divisiUtamaData.reduce((s, d) => s + d.keluar, 0);
  const totalSaldo = divisiUtamaData.reduce((s, d) => s + d.saldo, 0);

  // Pie chart data: hanya 5 divisi utama
  const pieData = divisiUtamaData.filter(d => d.saldo > 0)
    .map(d => ({ name: d.label, value: d.saldo, color: d.color }));

  // Donut TK Yaris breakdown: Adm Siswa vs Manual
  const tkyarisDonutData = [
    { name: "Adm. Siswa", value: admSiswaSummary.total_saldo, color: "#0d47a1" },
    { name: "Saldo Manual", value: totalSaldoManualTK, color: "#15803d" },
  ].filter(d => d.value > 0);

  // Line chart: last 6 months trend — split per source (5 divisi utama vs TK Yaris)
  const lineData = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return months.map(ym => {
      const [y, m] = ym.split("-");
      let masukUtama = 0, keluarUtama = 0, masukTK = 0, keluarTK = 0;
      DIVISI_UTAMA_KEYS.forEach(k => {
        if (hasAccess(k) === "NONE") return;
        const trs = (allTransaksi[k] || []).filter(t => t.tanggal.startsWith(ym));
        masukUtama += trs.reduce((s, t) => s + t.uang_masuk, 0);
        keluarUtama += trs.reduce((s, t) => s + t.uang_keluar, 0);
      });
      if (hasAccess("tkyaris") !== "NONE") {
        const trs = (allTransaksi["tkyaris"] || []).filter(t => t.tanggal.startsWith(ym));
        masukTK = trs.reduce((s, t) => s + t.uang_masuk, 0);
        keluarTK = trs.reduce((s, t) => s + t.uang_keluar, 0);
      }
      return {
        bulan: `${MONTHS_LIST.find(x => x.val === m)?.label} ${y}`,
        masuk: masukUtama,
        keluar: keluarUtama,
        masukTK,
        keluarTK,
      };
    });
  }, [allTransaksi, hasAccess]);

  const periodeLabel = periodeType === "bulanan"
    ? `${FULL_MONTHS[parseInt(filterMonth) - 1]} ${filterYear}`
    : `Tahun ${filterYear}`;

  // Export rows: 5 divisi utama (always)
  const exportRowsUtama = divisiUtamaData.map(d => ({ divisi: d.label, masuk: d.masuk, keluar: d.keluar, saldo: d.saldo }));

  // Optional: TK Yaris payload for two-section export
  const tkyarisPayload = tkyarisRow ? {
    label: tkyarisRow.label,
    masuk: tkyarisRow.masuk,
    keluar: tkyarisRow.keluar,
    saldo: tkyarisRow.saldo,
    saldoAwalAdmSiswa: admSiswaSummary.total_saldo,
    saldoAwalManual: totalSaldoManualTK,
    saldoAwalGabungan: admSiswaSummary.total_saldo + totalSaldoManualTK,
  } : null;

  const handlePDF = () => exportLaporanPDF(periodeLabel, exportRowsUtama, totalMasuk, totalKeluar, totalSaldo, tampilkanTKYaris ? tkyarisPayload : null);
  const handleExcel = () => exportLaporanExcel(periodeLabel, exportRowsUtama, totalMasuk, totalKeluar, totalSaldo, tampilkanTKYaris ? tkyarisPayload : null);
  const handlePrint = () => window.print();

  function formatK(val: number) {
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}Jt`;
    if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}Rb`;
    return String(val);
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Memuat laporan...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Laporan Keuangan Konsolidasi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ringkasan keuangan seluruh divisi (TK Yaris dipisahkan)</p>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <button onClick={handlePDF} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-card transition-colors hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))" }} data-testid="btn-export-pdf">
            <FileText className="w-4 h-4 text-red-500" /> PDF
          </button>
          <button onClick={handleExcel} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-card transition-colors hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))" }} data-testid="btn-export-excel">
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border bg-card transition-colors hover:bg-muted"
            style={{ borderColor: "hsl(var(--border))" }}>
            <Printer className="w-4 h-4 text-blue-500" /> Cetak
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 p-4 bg-card rounded-2xl border no-print" style={{ borderColor: "hsl(var(--card-border))" }}>
        <div className="flex gap-2">
          <button onClick={() => setPeriodeType("bulanan")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${periodeType === "bulanan" ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`}
            style={{ borderColor: periodeType === "bulanan" ? undefined : "hsl(var(--border))" }}
            data-testid="btn-bulanan">Bulanan</button>
          <button onClick={() => setPeriodeType("tahunan")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${periodeType === "tahunan" ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`}
            style={{ borderColor: periodeType === "tahunan" ? undefined : "hsl(var(--border))" }}
            data-testid="btn-tahunan">Tahunan</button>
        </div>
        {periodeType === "bulanan" && (
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ borderColor: "hsl(var(--border))" }}>
            {MONTHS_LIST.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
        )}
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ borderColor: "hsl(var(--border))" }}>
          {generateYears().map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="flex items-center text-sm font-semibold text-foreground">
          Periode: {periodeLabel}
        </span>
        {tkyarisRow && (
          <label
            className="ml-auto flex items-center gap-2 text-xs font-medium text-foreground px-3 py-2 rounded-xl border bg-muted/30 cursor-pointer"
            style={{ borderColor: "hsl(var(--border))" }}
            data-testid="label-toggle-tkyaris"
          >
            <input
              type="checkbox"
              checked={tampilkanTKYaris}
              onChange={e => setTampilkanTKYaris(e.target.checked)}
              className="w-4 h-4 accent-purple-700"
              data-testid="checkbox-tampilkan-tkyaris"
            />
            Tampilkan Data TK Yaris (Terpisah)
          </label>
        )}
      </div>

      {/* Summary Totals — HANYA 5 Divisi Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-xs text-muted-foreground">Total Masuk (5 Divisi)</span>
          </div>
          <p className="text-xl font-bold text-green-600">{formatRupiah(totalMasuk)}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <span className="text-xs text-muted-foreground">Total Keluar (5 Divisi)</span>
          </div>
          <p className="text-xl font-bold text-red-500">{formatRupiah(totalKeluar)}</p>
        </div>
        <div className={`rounded-2xl p-5 border ${totalSaldo >= 0 ? "bg-green-50" : "bg-red-50"}`}
          style={{ borderColor: totalSaldo >= 0 ? "#bbf7d0" : "#fecaca" }}
          data-testid="summary-total-saldo-perusahaan">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className={`w-5 h-5 ${totalSaldo >= 0 ? "text-green-600" : "text-red-500"}`} />
            <span className="text-xs text-muted-foreground">Total Saldo Perusahaan (5 Divisi)</span>
          </div>
          <p className={`text-xl font-bold ${totalSaldo >= 0 ? "text-green-700" : "text-red-600"}`} data-testid="text-total-saldo-perusahaan">{formatRupiah(totalSaldo)}</p>
          <p className="text-[10px] text-muted-foreground mt-1 italic">Tidak termasuk TK Yaris</p>
        </div>
      </div>

      {/* Consolidation Table */}
      <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(var(--card-border))" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <h3 className="font-semibold text-foreground text-sm">Tabel Konsolidasi Keuangan</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-konsolidasi">
            <thead>
              <tr style={{ background: "hsl(var(--muted))" }}>
                {["Divisi", "Total Masuk", "Total Keluar", "Saldo Akhir"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {divisiUtamaData.map(d => (
                <tr key={d.key} className="border-b hover:bg-muted/30 transition-colors"
                  style={{ borderColor: "hsl(var(--border))" }} data-testid={`row-laporan-${d.key}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-sm font-medium text-foreground">{d.label}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-green-600 font-medium">{formatRupiah(d.masuk)}</td>
                  <td className="px-5 py-3 text-red-500 font-medium">{formatRupiah(d.keluar)}</td>
                  <td className={`px-5 py-3 font-bold ${d.saldo >= 0 ? "text-green-600" : "text-red-500"}`}>{formatRupiah(d.saldo)}</td>
                </tr>
              ))}
              {/* TOTAL PERUSAHAAN row */}
              <tr style={{ background: "hsl(var(--muted))", borderTop: "2px solid hsl(var(--border))" }} data-testid="row-total-perusahaan">
                <td className="px-5 py-3 text-sm font-bold text-foreground">TOTAL PERUSAHAAN (5 Divisi)</td>
                <td className="px-5 py-3 text-sm font-bold text-green-600">{formatRupiah(totalMasuk)}</td>
                <td className="px-5 py-3 text-sm font-bold text-red-500">{formatRupiah(totalKeluar)}</td>
                <td className={`px-5 py-3 text-sm font-bold ${totalSaldo >= 0 ? "text-green-600" : "text-red-500"}`}>{formatRupiah(totalSaldo)}</td>
              </tr>
              {/* Separator + TK Yaris row (jika ada akses & checkbox aktif) */}
              {tkyarisRow && tampilkanTKYaris && (
                <>
                  <tr data-testid="row-separator-tkyaris">
                    <td colSpan={4} className="px-5 py-2 text-center text-[11px] italic text-muted-foreground border-t border-b border-dashed" style={{ borderColor: "rgba(124,58,237,0.5)" }}>
                      ── Data TK Yaris ditampilkan terpisah di bawah ──
                    </td>
                  </tr>
                  <tr
                    className="border-b"
                    style={{ borderColor: "hsl(var(--border))", background: "rgba(124,58,237,0.06)" }}
                    data-testid="row-laporan-tkyaris-terpisah"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" style={{ color: TKYARIS_PURPLE }} />
                        <span className="text-sm font-semibold" style={{ color: "#4527a0" }}>{tkyarisRow.label}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(124,58,237,0.15)", color: "#4527a0" }} data-testid="badge-tkyaris-terpisah">
                          Terpisah
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-green-600 font-medium">{formatRupiah(tkyarisRow.masuk)}</td>
                    <td className="px-5 py-3 text-red-500 font-medium">{formatRupiah(tkyarisRow.keluar)}</td>
                    <td className="px-5 py-3 font-bold" style={{ color: "#4527a0" }} data-testid="text-saldo-tkyaris-terpisah">{formatRupiah(tkyarisRow.saldo)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        {/* Footnote */}
        <div className="px-5 py-3 text-[11px] text-muted-foreground border-t" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted)/0.4)" }}>
          <p>
            <span className="font-semibold">Catatan:</span> Saldo TK Yaris{" "}
            <span className="font-semibold" style={{ color: "#4527a0" }}>tidak digabungkan</span> dengan Total Saldo Perusahaan
            karena bersumber dari pembayaran siswa &amp; dana operasional sekolah, bukan kas operasional perusahaan.
            Saldo Awal TK Yaris terdiri dari dua komponen: <strong>Adm. Siswa</strong> + <strong>Saldo Manual</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart — 5 Divisi Utama saja */}
        <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Proporsi Saldo per Divisi (5 Divisi Utama)</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name.split(" ").slice(-1)[0]} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatRupiah(val)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
              Tidak ada data saldo positif untuk periode ini
            </div>
          )}
          <p className="text-[11px] text-muted-foreground italic mt-2 text-center">
            TK Yaris tidak ditampilkan di chart ini (terpisah).
          </p>
        </div>

        {/* Line Chart — Tren 6 Bulan */}
        <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Tren Cashflow 6 Bulan Terakhir</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="bulan" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={formatK} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(val: number) => formatRupiah(val)} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Line type="monotone" dataKey="masuk" name="Masuk (5 Divisi)" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="keluar" name="Keluar (5 Divisi)" stroke="#ef4444" strokeWidth={2} dot={false} />
              {tkyarisRow && tampilkanTKYaris && (
                <>
                  <Line type="monotone" dataKey="masukTK" name="Masuk TK Yaris" stroke={TKYARIS_PURPLE} strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="keluarTK" name="Keluar TK Yaris" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut breakdown saldo awal TK Yaris (Adm Siswa vs Manual) */}
      {tkyarisRow && tampilkanTKYaris && tkyarisDonutData.length > 0 && (
        <div
          className="rounded-2xl border-2 border-dashed p-5"
          style={{ borderColor: "rgba(124,58,237,0.4)", background: "rgba(124,58,237,0.04)" }}
          data-testid="card-tkyaris-breakdown"
        >
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4" style={{ color: "#4527a0" }} />
            <h3 className="text-sm font-semibold" style={{ color: "#4527a0" }}>
              Breakdown Saldo Awal TK Yaris
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={tkyarisDonutData}
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={75}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {tkyarisDonutData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(val: number) => formatRupiah(val)} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-1" style={{ borderColor: "hsl(var(--border))" }}>
                <span className="text-muted-foreground">Saldo Awal — Adm. Siswa</span>
                <span className="font-semibold" style={{ color: "#0d47a1" }}>{formatRupiah(admSiswaSummary.total_saldo)}</span>
              </div>
              <div className="flex justify-between border-b pb-1" style={{ borderColor: "hsl(var(--border))" }}>
                <span className="text-muted-foreground">Saldo Awal — Manual</span>
                <span className="font-semibold" style={{ color: "#15803d" }}>{formatRupiah(totalSaldoManualTK)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold" style={{ color: "#4527a0" }}>TOTAL Saldo Awal TK Yaris</span>
                <span className="font-bold" style={{ color: "#4527a0" }}>{formatRupiah(admSiswaSummary.total_saldo + totalSaldoManualTK)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
