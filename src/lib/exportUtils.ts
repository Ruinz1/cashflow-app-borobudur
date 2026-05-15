import { Transaksi, formatRupiah, formatDate } from "./types";

export async function exportToPDF(
  divisiLabel: string,
  periode: string,
  transaksi: Transaksi[],
  totalMasuk: number,
  totalKeluar: number,
  saldoAkhir: number
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.text(`Laporan Cashflow - ${divisiLabel}`, 14, 15);
  doc.setFontSize(11);
  doc.text(`Periode: ${periode}`, 14, 23);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 30);

  const head = [["No", "Tanggal", "Uraian", "Rencana", "Uang Masuk", "Uang Keluar", "Saldo Akhir", "Keterangan"]];
  const body = transaksi.map((t, i) => [
    i + 1,
    formatDate(t.tanggal),
    t.uraian,
    formatRupiah(t.rencana),
    formatRupiah(t.uang_masuk),
    formatRupiah(t.uang_keluar),
    formatRupiah(t.saldo_akhir),
    t.keterangan,
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [26, 35, 126] },
    foot: [["", "", "TOTAL", "", formatRupiah(totalMasuk), formatRupiah(totalKeluar), formatRupiah(saldoAkhir), ""]],
    footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
  });

  doc.save(`cashflow-${divisiLabel.toLowerCase().replace(/\s+/g, "-")}-${periode}.pdf`);
}

export async function exportToExcel(
  divisiLabel: string,
  periode: string,
  transaksi: Transaksi[],
  totalMasuk: number,
  totalKeluar: number,
  saldoAkhir: number
) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const headers = ["No", "Tanggal", "Uraian", "Rencana", "Uang Masuk", "Uang Keluar", "Saldo Akhir", "Keterangan"];
  const rows = transaksi.map((t, i) => [
    i + 1,
    formatDate(t.tanggal),
    t.uraian,
    t.rencana,
    t.uang_masuk,
    t.uang_keluar,
    t.saldo_akhir,
    t.keterangan,
  ]);

  rows.push(["", "", "TOTAL", "", totalMasuk, totalKeluar, saldoAkhir, ""]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, divisiLabel.substring(0, 31));
  XLSX.writeFile(wb, `cashflow-${divisiLabel.toLowerCase().replace(/\s+/g, "-")}-${periode}.xlsx`);
}

export type TKYarisExportPayload = {
  label: string;
  masuk: number;
  keluar: number;
  saldo: number;
  saldoAwalAdmSiswa: number;
  saldoAwalManual: number;
  saldoAwalGabungan: number;
};

export async function exportLaporanPDF(
  namaPeriode: string,
  rows: { divisi: string; masuk: number; keluar: number; saldo: number }[],
  totalMasuk: number,
  totalKeluar: number,
  totalSaldo: number,
  tkyaris?: TKYarisExportPayload | null
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Laporan Keuangan Konsolidasi", 14, 15);
  doc.setFontSize(11);
  doc.text(`Periode: ${namaPeriode}`, 14, 23);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 30);

  // === BAGIAN I — 5 Divisi Utama ===
  doc.setFontSize(12);
  doc.text("BAGIAN I — Cashflow 5 Divisi Utama", 14, 38);

  autoTable(doc, {
    head: [["Divisi", "Total Masuk", "Total Keluar", "Saldo Akhir"]],
    body: rows.map(r => [r.divisi, formatRupiah(r.masuk), formatRupiah(r.keluar), formatRupiah(r.saldo)]),
    startY: 42,
    headStyles: { fillColor: [26, 35, 126] },
    foot: [["TOTAL PERUSAHAAN (5 Divisi)", formatRupiah(totalMasuk), formatRupiah(totalKeluar), formatRupiah(totalSaldo)]],
    footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
  });

  // === BAGIAN II — TK Yaris (terpisah) ===
  if (tkyaris) {
    // @ts-expect-error jspdf autotable adds lastAutoTable
    const lastY = (doc.lastAutoTable?.finalY ?? 80) as number;

    doc.setFontSize(12);
    doc.text("BAGIAN II — TK Yaris (Terpisah)", 14, lastY + 12);

    // Sub-tabel breakdown saldo awal
    autoTable(doc, {
      head: [["Komponen Saldo Awal TK Yaris", "Nominal"]],
      body: [
        ["Adm. Keuangan Siswa (Otomatis)", formatRupiah(tkyaris.saldoAwalAdmSiswa)],
        ["Saldo Manual Tambahan", formatRupiah(tkyaris.saldoAwalManual)],
      ],
      startY: lastY + 16,
      headStyles: { fillColor: [69, 39, 160] },
      foot: [["TOTAL Saldo Awal TK Yaris", formatRupiah(tkyaris.saldoAwalGabungan)]],
      footStyles: { fillColor: [243, 232, 255], textColor: [69, 39, 160], fontStyle: "bold" },
    });

    // @ts-expect-error jspdf autotable lastAutoTable
    const y2 = (doc.lastAutoTable?.finalY ?? lastY + 40) as number;

    autoTable(doc, {
      head: [["Divisi", "Total Masuk", "Total Keluar", "Saldo Akhir"]],
      body: [[`${tkyaris.label} (Terpisah)`, formatRupiah(tkyaris.masuk), formatRupiah(tkyaris.keluar), formatRupiah(tkyaris.saldo)]],
      startY: y2 + 6,
      headStyles: { fillColor: [124, 58, 237] },
      bodyStyles: { fillColor: [243, 232, 255], textColor: [69, 39, 160] },
    });
  }

  // Footnote
  // @ts-expect-error jspdf autotable lastAutoTable
  const finalY = (doc.lastAutoTable?.finalY ?? 100) as number;
  doc.setFontSize(9);
  doc.setTextColor(100);
  const footnote = "Catatan: Saldo TK Yaris tidak digabungkan dengan Total Saldo Perusahaan karena bersumber dari pembayaran siswa & dana operasional sekolah, bukan kas operasional perusahaan.";
  const split = doc.splitTextToSize(footnote, 180);
  doc.text(split, 14, finalY + 10);

  doc.save(`laporan-konsolidasi-${namaPeriode}.pdf`);
}

export async function exportLaporanExcel(
  namaPeriode: string,
  rows: { divisi: string; masuk: number; keluar: number; saldo: number }[],
  totalMasuk: number,
  totalKeluar: number,
  totalSaldo: number,
  tkyaris?: TKYarisExportPayload | null
) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Rekap Perusahaan (5 Divisi)
  const headers = ["Divisi", "Total Masuk", "Total Keluar", "Saldo Akhir"];
  const data1: (string | number)[][] = rows.map(r => [r.divisi, r.masuk, r.keluar, r.saldo]);
  data1.push(["TOTAL PERUSAHAAN (5 Divisi)", totalMasuk, totalKeluar, totalSaldo]);
  const ws1 = XLSX.utils.aoa_to_sheet([
    [`Laporan Keuangan — Periode: ${namaPeriode}`],
    ["Bagian I: Rekap 5 Divisi Utama (TK Yaris dipisah di sheet terpisah)"],
    [],
    headers,
    ...data1,
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, "Rekap Perusahaan");

  if (tkyaris) {
    // Sheet 2 — TK Yaris (Terpisah)
    const ws2 = XLSX.utils.aoa_to_sheet([
      [`TK Yaris (Terpisah) — Periode: ${namaPeriode}`],
      ["Catatan: Saldo TK Yaris tidak digabungkan dengan Total Saldo Perusahaan."],
      [],
      ["Komponen Saldo Awal", "Nominal"],
      ["Adm. Keuangan Siswa (Otomatis)", tkyaris.saldoAwalAdmSiswa],
      ["Saldo Manual Tambahan", tkyaris.saldoAwalManual],
      ["TOTAL Saldo Awal TK Yaris", tkyaris.saldoAwalGabungan],
      [],
      ["Cashflow Periode", "Nominal"],
      ["Total Masuk", tkyaris.masuk],
      ["Total Keluar", tkyaris.keluar],
      ["Saldo Akhir TK Yaris", tkyaris.saldo],
    ]);
    XLSX.utils.book_append_sheet(wb, ws2, "TK Yaris (Terpisah)");

    // Sheet 3 — Rekap Gabungan (Info Only)
    const grandTotalMasuk = totalMasuk + tkyaris.masuk;
    const grandTotalKeluar = totalKeluar + tkyaris.keluar;
    const grandTotalSaldo = totalSaldo + tkyaris.saldo;
    const data3: (string | number)[][] = rows.map(r => [r.divisi, r.masuk, r.keluar, r.saldo]);
    data3.push(["TOTAL PERUSAHAAN (5 Divisi)", totalMasuk, totalKeluar, totalSaldo]);
    data3.push([`${tkyaris.label} (Terpisah)`, tkyaris.masuk, tkyaris.keluar, tkyaris.saldo]);
    data3.push(["GRAND TOTAL (Hanya Informasi)", grandTotalMasuk, grandTotalKeluar, grandTotalSaldo]);
    const ws3 = XLSX.utils.aoa_to_sheet([
      [`Rekap Gabungan (Info) — Periode: ${namaPeriode}`],
      ["Catatan: Grand Total hanya bersifat informasi. Angka resmi laporan perusahaan TIDAK termasuk TK Yaris."],
      [],
      headers,
      ...data3,
    ]);
    XLSX.utils.book_append_sheet(wb, ws3, "Rekap Gabungan (Info)");
  }

  XLSX.writeFile(wb, `laporan-konsolidasi-${namaPeriode}.xlsx`);
}
