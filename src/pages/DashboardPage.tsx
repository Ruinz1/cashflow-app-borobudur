import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { formatRupiah, DIVISI_CONFIG, DivisiKey, DIVISI_UTAMA_KEYS, formatDate } from "@/lib/types";
import { dashboardApi, dataAkadApi, progresTukangApi, admSiswaApi, transaksiApi } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, ArrowRight, CheckCircle, Clock, ClipboardList, Hammer, Receipt, Users, GraduationCap, RefreshCw } from "lucide-react";

function formatK(val: number) {
  if (Math.abs(val) >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}Jt`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}Rb`;
  return String(val);
}

export default function DashboardPage() {
  const { user, hasAccess } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [akadData, setAkadData] = useState<any[]>([]);
  const [progresTukangData, setProgresTukangData] = useState<any[]>([]);
  const [admSiswaSummary, setAdmSiswaSummary] = useState<{ total_saldo: number; rincian: any[] }>({ total_saldo: 0, rincian: [] });
  const [recentTransaksi, setRecentTransaksi] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadDashboard = async () => {
      try {
        const [sumRes, akadRes, ptRes, admRes] = await Promise.all([
          dashboardApi.summary(),
          hasAccess("akad") !== "NONE" ? dataAkadApi.list() : Promise.resolve([]),
          hasAccess("progrestukang") !== "NONE" ? progresTukangApi.list() : Promise.resolve([]),
          hasAccess("tkyaris") !== "NONE" || hasAccess("admsiswa") !== "NONE" ? admSiswaApi.saldoSummary() : Promise.resolve({ total_saldo: 0, rincian: [] }),
        ]);

        // Load recent transactions (last 5 from all accessible divisions)
        const allTrs: any[] = [];
        for (const k of [...DIVISI_UTAMA_KEYS, "tkyaris"] as DivisiKey[]) {
          if (hasAccess(k) !== "NONE") {
            try {
              const trs = await transaksiApi.list(k);
              trs.forEach(t => allTrs.push({ divisi: DIVISI_CONFIG[k].label, tanggal: t.tanggal, uraian: t.uraian, masuk: t.uang_masuk, keluar: t.uang_keluar }));
            } catch (e) {}
          }
        }
        allTrs.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

        if (mounted) {
          setSummaryData(sumRes);
          setAkadData(akadRes);
          setProgresTukangData(ptRes);
          setAdmSiswaSummary(admRes);
          setRecentTransaksi(allTrs.slice(0, 5));
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Dashboard error:", error);
        if (mounted) setIsLoading(false);
      }
    };
    loadDashboard();
    return () => { mounted = false; };
  }, [hasAccess]);

  const divisiUtamaData = useMemo(() => {
    if (!summaryData) return [];
    return DIVISI_UTAMA_KEYS.map(k => {
      if (hasAccess(k) === "NONE") return null;
      const d = summaryData.divisi[k];
      if (!d) return null;
      return { key: k, label: DIVISI_CONFIG[k].label, color: DIVISI_CONFIG[k].color, totalMasuk: d.uang_masuk, totalKeluar: d.uang_keluar, saldo: d.saldo_akhir, saldoAwal: d.saldo_awal };
    }).filter(Boolean) as any[];
  }, [summaryData, hasAccess]);

  const tkyarisCard = useMemo(() => {
    if (!summaryData || hasAccess("tkyaris") === "NONE") return null;
    const d = summaryData.divisi["tkyaris"];
    if (!d) return null;
    return { key: "tkyaris", label: DIVISI_CONFIG["tkyaris"].label, color: DIVISI_CONFIG["tkyaris"].color, totalMasuk: d.uang_masuk, totalKeluar: d.uang_keluar, saldo: d.saldo_akhir, saldoAwal: d.saldo_awal };
  }, [summaryData, hasAccess]);

  const divisiData = useMemo(
    () => (tkyarisCard ? [...divisiUtamaData, tkyarisCard] : divisiUtamaData),
    [divisiUtamaData, tkyarisCard]
  );

  const totalSaldo = summaryData?.total_perusahaan || 0;
  const totalMasukAll = summaryData?.total_masuk || 0;
  const totalKeluarAll = summaryData?.total_keluar || 0;

  const chartData = divisiData.map(d => ({
    name: d.key === "tkyaris"
      ? `${d.label.split(" ").slice(-1)[0]} (Terpisah)`
      : d.label.split(" ").slice(-1)[0],
    masuk: d.totalMasuk,
    keluar: d.totalKeluar,
    isTkyaris: d.key === "tkyaris",
  }));

  const canAccessAkad = hasAccess("akad") !== "NONE";
  const akadCair = akadData.filter(d => d.status === "Cair").length;
  const akadBelum = akadData.filter(d => d.status === "Belum Cair").length;
  const akadTotal = akadData.length;
  const akadBelumList = akadData.filter(d => d.status === "Belum Cair")
    .sort((a, b) => new Date(b.tanggal_akad).getTime() - new Date(a.tanggal_akad).getTime())
    .slice(0, 5);
  const akadPieData = [
    { name: "Cair", value: akadCair, color: "#16a34a" },
    { name: "Belum Cair", value: akadBelum, color: "#ea580c" },
  ].filter(d => d.value > 0);

  const canAccessProgresTukang = hasAccess("progrestukang") !== "NONE";
  const ptTotal = progresTukangData.length;
  const ptBerjalan = progresTukangData.filter(p => p.status === "Berjalan").length;
  const ptSelesai = progresTukangData.filter(p => p.status === "Selesai").length;
  const ptTotalSisa = progresTukangData.reduce((s, p) => s + p.sisa_progres, 0);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground"><RefreshCw className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Selamat datang, {user?.namaLengkap}!</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Berikut ringkasan keuangan perusahaan Anda.</p>
      </div>

      {/* Summary Cards — 5 Divisi Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-divisi-utama">
        {divisiUtamaData.map(d => (
          <Link key={d.key} href={`/divisi/${d.key}`}
            className="card-hover block p-5 rounded-2xl bg-card border cursor-pointer"
            style={{ borderColor: "hsl(var(--card-border))" }}
            data-testid={`card-divisi-${d.key}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                <span className="text-sm font-semibold text-foreground">{d.label}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Masuk</p>
                <p className="text-xs font-semibold text-green-600">{formatK(d.totalMasuk)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Keluar</p>
                <p className="text-xs font-semibold text-red-500">{formatK(d.totalKeluar)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Saldo</p>
                <p className={`text-xs font-bold ${d.saldo >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {formatK(d.saldo)}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "hsl(var(--card-border))" }}>
              <div className={`text-center py-1.5 rounded-lg text-xs font-semibold ${d.saldo >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {d.saldo >= 0 ? "Saldo Positif" : "Saldo Negatif"}: {formatRupiah(d.saldo)}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Total Company Card — HANYA 5 Divisi Utama */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: "linear-gradient(135deg, #1a237e, #1565c0)" }}
        data-testid="card-total-perusahaan"
      >
        <p className="text-blue-200 text-sm font-medium mb-2">Total Saldo Perusahaan</p>
        <p className="text-4xl font-bold" data-testid="text-total-saldo-perusahaan">{formatRupiah(totalSaldo)}</p>
        <p className="text-[11px] text-blue-200/80 mt-1 italic">
          ℹ️ Hanya mencakup 5 divisi utama. <strong className="text-white">Saldo TK Yaris terpisah</strong> di section bawah.
        </p>
        <div className="grid grid-cols-2 gap-6 mt-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10">
              <TrendingUp className="w-5 h-5 text-green-300" />
            </div>
            <div>
              <p className="text-blue-200 text-xs">Total Masuk (5 Divisi)</p>
              <p className="text-white font-semibold text-sm">{formatRupiah(totalMasukAll)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10">
              <TrendingDown className="w-5 h-5 text-red-300" />
            </div>
            <div>
              <p className="text-blue-200 text-xs">Total Keluar (5 Divisi)</p>
              <p className="text-white font-semibold text-sm">{formatRupiah(totalKeluarAll)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* === SEPARATOR + TK YARIS SECTION === */}
      {tkyarisCard && (
        <div
          className="rounded-2xl border-2 border-dashed p-5 space-y-4"
          style={{ borderColor: "rgba(69,39,160,0.4)", background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(69,39,160,0.04))" }}
          data-testid="section-tkyaris-terpisah"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#4527a0" }}>
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: "#4527a0" }}>TK Yaris (Terpisah)</h2>
                <p className="text-[11px] text-muted-foreground">Tidak digabung dengan Total Saldo Perusahaan</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: "rgba(69,39,160,0.15)", color: "#4527a0" }}>
              Saldo Terpisah
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/divisi/tkyaris" className="block rounded-xl p-3 bg-white border hover:opacity-90 transition-opacity"
              style={{ borderColor: "rgba(69,39,160,0.25)" }}
              data-testid="tkyaris-card-pembayaran-siswa">
              <p className="text-[11px] text-muted-foreground">Saldo Awal — Adm. Siswa</p>
              <p className="text-base font-bold mt-1" style={{ color: "#0d47a1" }}>{formatRupiah(admSiswaSummary.total_saldo)}</p>
            </Link>
            <Link href="/divisi/tkyaris" className="block rounded-xl p-3 bg-white border hover:opacity-90 transition-opacity"
              style={{ borderColor: "rgba(21,128,61,0.25)" }}
              data-testid="tkyaris-card-saldo-manual">
              <p className="text-[11px] text-muted-foreground">Saldo Awal</p>
              <p className="text-base font-bold mt-1" style={{ color: "#15803d" }}>{formatRupiah(tkyarisCard.saldoAwal)}</p>
            </Link>
            <Link href="/divisi/tkyaris" className="block rounded-xl p-3 bg-white border hover:opacity-90 transition-opacity"
              style={{ borderColor: "rgba(220,38,38,0.25)" }}
              data-testid="tkyaris-card-pengeluaran">
              <p className="text-[11px] text-muted-foreground">Pengeluaran TK Yaris</p>
              <p className="text-base font-bold mt-1 text-red-600">{formatRupiah(tkyarisCard.totalKeluar)}</p>
            </Link>
            <Link href="/divisi/tkyaris" className="block rounded-xl p-3 text-white hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #4527a0, #7c3aed)" }}
              data-testid="tkyaris-card-saldo-bersih">
              <p className="text-[11px] text-purple-100">Saldo Akhir TK Yaris</p>
              <p className="text-base font-bold mt-1" data-testid="text-saldo-akhir-tkyaris">{formatRupiah(tkyarisCard.saldo)}</p>
            </Link>
          </div>

          <div className="rounded-xl px-4 py-2.5 text-xs flex items-start gap-2" style={{ background: "#fef3c7", color: "#78350f", border: "1px solid #fde68a" }}>
            <span className="font-semibold">Catatan:</span>
            <span>Saldo TK Yaris dipisahkan karena bersumber dari pembayaran siswa & dana operasional sekolah, bukan kas operasional perusahaan.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Perbandingan Cashflow per Divisi</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatK} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val: number) => formatRupiah(val)} />
                <Legend />
                <Bar dataKey="masuk" name="Uang Masuk" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={`m-${idx}`} fill={entry.isTkyaris ? "#7c3aed" : "#10b981"} />
                  ))}
                </Bar>
                <Bar dataKey="keluar" name="Uang Keluar" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={`k-${idx}`} fill={entry.isTkyaris ? "#a78bfa" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              Belum ada data transaksi
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Transaksi Terbaru</h3>
          </div>
          {recentTransaksi.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Belum ada transaksi
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransaksi.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0"
                  style={{ borderColor: "hsl(var(--border))" }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{t.uraian}</p>
                    <p className="text-xs text-muted-foreground">{t.divisi} • {t.tanggal}</p>
                  </div>
                  <div className="ml-4 text-right">
                    {t.masuk > 0 && <p className="text-xs font-semibold text-green-600">+{formatRupiah(t.masuk)}</p>}
                    {t.keluar > 0 && <p className="text-xs font-semibold text-red-500">-{formatRupiah(t.keluar)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Access */}
      <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
        <h3 className="text-sm font-semibold text-foreground mb-4">Akses Cepat</h3>
        <div className="flex flex-wrap gap-2">
          {divisiData.map(d => (
            <Link key={d.key} href={`/divisi/${d.key}`}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ background: d.color + "20", color: d.color, border: `1px solid ${d.color}40` }}
              data-testid={`quick-access-${d.key}`}
            >
              {d.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Akad Widget */}
      {canAccessAkad && (
        <>
          {/* Akad Status Cards */}
          <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Status Akad Perumahan</h3>
              </div>
              <Link href="/data-akad"
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                Lihat Semua <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/data-akad"
                className="block rounded-xl p-4 hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #1a237e, #1565c0)" }}>
                <p className="text-xs text-blue-200">Total Akad</p>
                <p className="text-2xl font-bold text-white mt-1">{akadTotal}</p>
              </Link>
              <Link href="/data-akad"
                className="block rounded-xl p-4 hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #166534, #16a34a)" }}>
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="w-3.5 h-3.5 text-green-200" />
                  <p className="text-xs text-green-200">Sudah Cair</p>
                </div>
                <p className="text-2xl font-bold text-white">{akadCair}</p>
                {akadTotal > 0 && <p className="text-xs text-green-200">{Math.round((akadCair / akadTotal) * 100)}%</p>}
              </Link>
              <Link href="/data-akad"
                className="block rounded-xl p-4 hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #7c2d12, #ea580c)" }}>
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-orange-200" />
                  <p className="text-xs text-orange-200">Belum Cair</p>
                </div>
                <p className="text-2xl font-bold text-white">{akadBelum}</p>
                {akadTotal > 0 && <p className="text-xs text-orange-200">{Math.round((akadBelum / akadTotal) * 100)}%</p>}
              </Link>
            </div>
          </div>

          {/* Akad Belum Cair Table + Mini Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold text-foreground">Daftar Belum Cair</h3>
                </div>
              </div>
              {akadBelumList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
                  <p className="text-sm">Semua akad sudah cair!</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs" data-testid="table-akad-belum-cair">
                      <thead>
                        <tr style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                          {["Nama User", "Blok", "Bank", "Tgl Akad", "Status"].map(h => (
                            <th key={h} className="pb-2 text-left font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {akadBelumList.map(d => (
                          <tr key={d.id} className="border-b" style={{ borderColor: "hsl(var(--border))", background: "rgba(251,191,36,0.05)" }}>
                            <td className="py-2 font-medium text-foreground">{d.nama_user}</td>
                            <td className="py-2 text-foreground">{d.blok}</td>
                            <td className="py-2 text-foreground">{d.bank}</td>
                            <td className="py-2 text-muted-foreground whitespace-nowrap">{formatDate(d.tanggal_akad)}</td>
                            <td className="py-2">
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                                <Clock className="w-2.5 h-2.5" /> Belum Cair
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3">
                    <Link href="/data-akad"
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      Lihat Semua Belum Cair <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }}>
              <h3 className="text-sm font-semibold text-foreground mb-4">Status Pencairan</h3>
              {akadTotal > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={akadPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                      {akadPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(val: number) => [`${val} akad`]} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[180px] text-muted-foreground text-xs">
                  Belum ada data akad
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Progres Tukang Widget */}
      {canAccessProgresTukang && (
        <div className="bg-card rounded-2xl p-5 border" style={{ borderColor: "hsl(var(--card-border))" }} data-testid="widget-progres-tukang">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Hammer className="w-4 h-4" style={{ color: "#1b5e20" }} />
              <h3 className="text-sm font-semibold text-foreground">Progres Tukang Perumahan</h3>
            </div>
            <Link href="/progres-tukang" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/progres-tukang" className="block rounded-xl p-4 hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #14532d, #1b5e20)" }}>
              <p className="text-xs text-green-200">Total Kontrak</p>
              <p className="text-2xl font-bold text-white mt-1">{ptTotal}</p>
            </Link>
            <Link href="/progres-tukang?status=berjalan" className="block rounded-xl p-4 hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #1e3a8a, #1565c0)" }}>
              <p className="text-xs text-blue-200">Sedang Berjalan</p>
              <p className="text-2xl font-bold text-white mt-1">{ptBerjalan}</p>
            </Link>
            <Link href="/progres-tukang" className="block rounded-xl p-4 hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #166534, #16a34a)" }}>
              <p className="text-xs text-green-200">Selesai</p>
              <p className="text-2xl font-bold text-white mt-1">{ptSelesai}</p>
            </Link>
            <Link href="/progres-tukang" className="block rounded-xl p-4 hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #7f1d1d, #c62828)" }}>
              <p className="text-xs text-red-200">Total Sisa</p>
              <p className="text-base font-bold text-white mt-1">{formatRupiah(ptTotalSisa)}</p>
            </Link>
          </div>
        </div>
      )}

      {/* TK Yaris — Integrasi Adm. Keuangan Siswa Widget */}
      {(hasAccess("tkyaris") !== "NONE" || hasAccess("admsiswa") !== "NONE") && (
        <div
          className="rounded-2xl p-5 border"
          style={{ borderColor: "rgba(69,39,160,0.3)", background: "linear-gradient(135deg, rgba(69,39,160,0.05), rgba(124,58,237,0.04))" }}
          data-testid="widget-tkyaris-integrasi"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#4527a0" }}>
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">TK Yaris — Integrasi Adm. Keuangan Siswa</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                <RefreshCw className="w-2.5 h-2.5" /> Sinkron
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/adm-siswa" className="text-xs hover:underline font-medium flex items-center gap-1" style={{ color: "#4527a0" }}>
                Adm. Siswa <ArrowRight className="w-3 h-3" />
              </Link>
              <Link href="/divisi/tkyaris" className="text-xs hover:underline font-medium flex items-center gap-1" style={{ color: "#4527a0" }}>
                Cashflow <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/adm-siswa" className="block rounded-xl p-4 hover:opacity-90 transition-opacity text-white"
              style={{ background: "linear-gradient(135deg, #4527a0, #7c3aed)" }}
              data-testid="widget-card-saldo-siswa">
              <div className="flex items-center gap-1 mb-1">
                <Receipt className="w-3.5 h-3.5 text-purple-200" />
                <p className="text-xs text-purple-200">Total Saldo Siswa</p>
              </div>
              <p className="text-base font-bold">{formatRupiah(admSiswaSummary.total_saldo)}</p>
            </Link>
            <Link href="/adm-siswa" className="block rounded-xl p-4 hover:opacity-90 transition-opacity text-white"
              style={{ background: "linear-gradient(135deg, #6d28d9, #a78bfa)" }}>
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-3.5 h-3.5 text-purple-100" />
                <p className="text-xs text-purple-100">Jumlah Siswa</p>
              </div>
              <p className="text-2xl font-bold">{admSiswaSummary.rincian.length}</p>
            </Link>
            <Link href="/divisi/tkyaris" className="block rounded-xl p-4 hover:opacity-90 transition-opacity text-white"
              style={{ background: "linear-gradient(135deg, #166534, #16a34a)" }}
              data-testid="widget-card-saldo-tkyaris">
              <div className="flex items-center gap-1 mb-1">
                <Wallet className="w-3.5 h-3.5 text-green-100" />
                <p className="text-xs text-green-100">Saldo Awal TK Yaris</p>
              </div>
              <p className="text-base font-bold">{formatRupiah(tkyarisCard?.saldoAwal || 0)}</p>
            </Link>
            <div className="block rounded-xl p-4 text-white" style={{ background: "linear-gradient(135deg, #1e3a8a, #2563eb)" }}>
              <div className="flex items-center gap-1 mb-1">
                <RefreshCw className="w-3.5 h-3.5 text-blue-100" />
                <p className="text-xs text-blue-100">Update Terakhir</p>
              </div>
              <p className="text-xs font-bold">
                {admSiswaSummary.updated_at ? new Date(admSiswaSummary.updated_at).toLocaleString("id-ID", {
                  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                }) : "Belum ada update"}
              </p>
              <p className="text-[10px] text-blue-200 mt-0.5">Data ter-sinkron dengan server</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
