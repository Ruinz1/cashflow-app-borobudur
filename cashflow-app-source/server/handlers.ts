import type { Pool, ResultSetHeader } from "mysql2/promise";
import bcrypt from "bcryptjs";

// ─────────────────────── helpers ─────────────────────────────────────────────

function toStr(v: unknown): string {
  return v !== null && v !== undefined ? String(v) : "";
}
function toNum(v: unknown): number {
  return Number(v) || 0;
}
function dateStr(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().split("T")[0];
  return String(v).split("T")[0];
}
function isoStr(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

// ─────────────────────── Mapping: hak_akses halaman ──────────────────────────
// SQL DB pakai nama seperti cashflow_bakso, data_akad, dll.
// Frontend pakai: bakso, akad, cashlunak, dll.

const DB_TO_FE: Record<string, string> = {
  cashflow_bakso: "bakso",
  cashflow_amanah: "amanah",
  cashflow_batualam: "batualam",
  cashflow_kembang: "kembang",
  cashflow_perumahan: "perumahan",
  cashflow_tkyaris: "tkyaris",
  data_akad: "akad",
  cash_lunak: "cashlunak",
  progres_tukang: "progrestukang",
  administrasi_siswa: "admsiswa",
  data_siswa: "admsiswa", // disamakan dengan admsiswa (TK Yaris sub-menu)
  dashboard: "dashboard",
  laporan: "laporan",
  pengaturan: "pengaturan",
};

const FE_TO_DB: Record<string, string> = {
  bakso: "cashflow_bakso",
  amanah: "cashflow_amanah",
  batualam: "cashflow_batualam",
  kembang: "cashflow_kembang",
  perumahan: "cashflow_perumahan",
  tkyaris: "cashflow_tkyaris",
  akad: "data_akad",
  cashlunak: "cash_lunak",
  progrestukang: "progres_tukang",
  admsiswa: "administrasi_siswa",
  dashboard: "dashboard",
  laporan: "laporan",
  pengaturan: "pengaturan",
};

// ─────────────────────── Mapping: status DataAkad ────────────────────────────
// DB ENUM: 'cair' | 'belum_cair'  ↔  Frontend: "Cair" | "Belum Cair"

function akadStatusFromDb(v: string): "Cair" | "Belum Cair" {
  return v === "cair" ? "Cair" : "Belum Cair";
}
function akadStatusToDb(v: string): string {
  return v === "Cair" ? "cair" : "belum_cair";
}

// ─────────────────────── Mapping: status ProgresTukang ───────────────────────
// DB ENUM: 'belum_mulai' | 'berjalan' | 'selesai' | 'tertunda'
// Frontend StatusKontrak: "Belum Mulai" | "Berjalan" | "Selesai"

function progresStatusFromDb(v: string): string {
  const map: Record<string, string> = {
    belum_mulai: "Belum Mulai",
    berjalan: "Berjalan",
    selesai: "Selesai",
    tertunda: "Belum Mulai",
  };
  return map[v] || "Belum Mulai";
}
function progresStatusToDb(v: string): string {
  const map: Record<string, string> = {
    "Belum Mulai": "belum_mulai",
    Berjalan: "berjalan",
    Selesai: "selesai",
  };
  return map[v] || "belum_mulai";
}

// ─────────────────────── Mapping: status DataSiswa ───────────────────────────
// DB ENUM: 'aktif' | 'lulus' | 'pindah' | 'nonaktif'
// Frontend SiswaStatus: "Aktif" | "Tidak Aktif"

function siswaStatusFromDb(v: string): string {
  return v === "aktif" ? "Aktif" : "Tidak Aktif";
}

// ─────────────────────── Mapping: kelas DataSiswa ────────────────────────────
// DB: "TK A" | "TK B" | "Kelompok Bermain"
// Frontend SiswaKelas: "Kelompok A" | "Kelompok B" | "Kelompok Bermain"

function siswaKelasFromDb(v: string): string {
  if (v === "TK A") return "Kelompok A";
  if (v === "TK B") return "Kelompok B";
  if (v === "Kelompok Bermain" || v === "Kelompok bermain") return "Kelompok Bermain";
  // Pakai nilai apa adanya jika sudah sesuai
  return v || "Kelompok A";
}
function siswaKelasToDb(v: string): string {
  if (v === "Kelompok A") return "TK A";
  if (v === "Kelompok B") return "TK B";
  return "Kelompok Bermain";
}

// ─────────────────────── USERS ───────────────────────────────────────────────

async function dbGetUsers(pool: Pool) {
  const [rows] = await pool.query(
    "SELECT id, username, `password`, nama_lengkap, role, status FROM users ORDER BY id"
  );
  return (rows as any[]).map((u) => ({
    id: toStr(u.id),
    namaLengkap: u.nama_lengkap || "",
    username: u.username,
    password: u.password,
    role: u.role,
    status: u.status,
  }));
}

async function dbSaveUsers(pool: Pool, data: any[]) {
  for (const u of data) {
    let pw: string = u.password || u.password_hash || "";
    // Hash plaintext passwords (tidak dimulai dengan $2a/$2b/$2y)
    if (pw && !pw.startsWith("$2")) {
      pw = await bcrypt.hash(pw, 10);
    }
    const nama = u.namaLengkap || u.nama_lengkap || "";
    await pool.execute(
      `INSERT INTO users (username, \`password\`, nama_lengkap, role, status)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`password\`   = VALUES(\`password\`),
         nama_lengkap  = VALUES(nama_lengkap),
         role          = VALUES(role),
         status        = VALUES(status)`,
      [u.username, pw, nama, u.role, u.status || "aktif"]
    );
  }
}

// ─────────────────────── HAK AKSES ───────────────────────────────────────────

async function dbGetHakAkses(pool: Pool) {
  const [rows] = await pool.query(
    "SELECT role, halaman, dapat_lihat, dapat_tambah, dapat_edit, dapat_hapus, dapat_ekspor FROM hak_akses"
  );
  const result: Record<string, Record<string, string>> = {};
  for (const r of rows as any[]) {
    // Terjemahkan nama halaman DB → frontend
    const halamanFe = DB_TO_FE[r.halaman] ?? r.halaman;
    if (!result[r.role]) result[r.role] = {};

    let level = "NONE";
    if (r.dapat_tambah && r.dapat_edit && r.dapat_hapus) level = "CRUD";
    else if (r.dapat_lihat) level = "VIEW";

    // Ambil level tertinggi jika halaman muncul lebih dari sekali (mis. data_siswa & administrasi_siswa → admsiswa)
    const existing = result[r.role][halamanFe];
    if (!existing || level === "CRUD" || (level === "VIEW" && existing === "NONE")) {
      result[r.role][halamanFe] = level;
    }
  }
  return result;
}

async function dbSaveHakAkses(pool: Pool, data: Record<string, Record<string, string>>) {
  await pool.execute("DELETE FROM hak_akses");
  const rows: any[][] = [];
  for (const [role, halamanMap] of Object.entries(data)) {
    for (const [halamanFe, level] of Object.entries(halamanMap)) {
      const halamanDb = FE_TO_DB[halamanFe] ?? halamanFe;
      const crud = level === "CRUD" ? 1 : 0;
      const view = level === "CRUD" || level === "VIEW" ? 1 : 0;
      rows.push([role, halamanDb, view, crud, crud, crud, view]);
    }
  }
  if (rows.length) {
    await pool.query(
      "INSERT INTO hak_akses (role, halaman, dapat_lihat, dapat_tambah, dapat_edit, dapat_hapus, dapat_ekspor) VALUES ?",
      [rows]
    );
  }
}

// ─────────────────────── SALDO AWAL ──────────────────────────────────────────

async function dbGetSaldoAwal(pool: Pool) {
  const [rows] = await pool.query(
    "SELECT divisi, saldo_awal FROM saldo_awal_divisi"
  );
  const result: Record<string, any> = {
    bakso: 0, amanah: 0, batualam: 0, kembang: 0, perumahan: 0,
    tkyaris: "GABUNGAN_ADM_DAN_MANUAL",
  };
  for (const r of rows as any[]) {
    if (r.divisi !== "tkyaris") result[r.divisi] = toNum(r.saldo_awal);
  }
  return result;
}

async function dbSaveSaldoAwal(pool: Pool, data: Record<string, any>) {
  const divisis = ["bakso", "amanah", "batualam", "kembang", "perumahan"];
  for (const d of divisis) {
    const nominal = typeof data[d] === "number" ? data[d] : 0;
    await pool.execute(
      `INSERT INTO saldo_awal_divisi (divisi, saldo_awal)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE saldo_awal = VALUES(saldo_awal)`,
      [d, nominal]
    );
  }
}

// ─────────────────────── TRANSAKSI CASHFLOW ──────────────────────────────────

async function dbGetTransaksi(pool: Pool, divisi: string) {
  let rows: any[];
  try {
    [rows] = (await pool.query(
      `SELECT t.id, t.tanggal, t.uraian, t.rencana, t.uang_masuk, t.uang_keluar, t.keterangan,
              n.id AS nota_id, n.nama_file, n.tipe_file, n.data_base64, n.urutan
       FROM transaksi_cashflow t
       LEFT JOIN transaksi_nota n ON n.transaksi_id = t.id
       WHERE t.divisi = ?
       ORDER BY t.tanggal ASC, t.id ASC, n.urutan ASC`,
      [divisi]
    )) as any[];
  } catch {
    // Fallback: tabel transaksi_nota belum dibuat
    [rows] = (await pool.query(
      `SELECT id, tanggal, uraian, rencana, uang_masuk, uang_keluar,
              keterangan, nota_file, nota_tipe
       FROM transaksi_cashflow WHERE divisi = ? ORDER BY tanggal ASC`,
      [divisi]
    )) as any[];
    return (rows as any[]).map((r: any) => {
      const nota = r.nota_file ? { nama: r.nota_file, tipe: r.nota_tipe || "", data: "" } : null;
      return {
        id: toStr(r.id), tanggal: dateStr(r.tanggal), uraian: r.uraian || "",
        rencana: toNum(r.rencana), uang_masuk: toNum(r.uang_masuk),
        uang_keluar: toNum(r.uang_keluar), saldo_akhir: 0,
        keterangan: r.keterangan || "", nota, notas: nota ? [nota] : [],
      };
    });
  }

  const map = new Map<number, any>();
  for (const r of rows as any[]) {
    const id = r.id as number;
    if (!map.has(id)) {
      map.set(id, {
        id: toStr(id), tanggal: dateStr(r.tanggal), uraian: r.uraian || "",
        rencana: toNum(r.rencana), uang_masuk: toNum(r.uang_masuk),
        uang_keluar: toNum(r.uang_keluar), saldo_akhir: 0,
        keterangan: r.keterangan || "", nota: null as any, notas: [] as any[],
      });
    }
    if (r.nota_id != null) {
      const nota = { nama: r.nama_file || "", tipe: r.tipe_file || "", data: r.data_base64 || "" };
      const tx = map.get(id)!;
      tx.notas.push(nota);
      if (!tx.nota) tx.nota = nota;
    }
  }
  return Array.from(map.values());
}

async function dbSaveTransaksi(pool: Pool, divisi: string, data: any[]) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("DELETE FROM transaksi_cashflow WHERE divisi = ?", [divisi]);
    for (const t of data) {
      const notas: any[] = t.notas && t.notas.length > 0 ? t.notas : (t.nota ? [t.nota] : []);
      const [result] = await conn.execute<ResultSetHeader>(
        `INSERT INTO transaksi_cashflow
           (divisi, tanggal, uraian, rencana, uang_masuk, uang_keluar,
            keterangan, nota_file, nota_tipe)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          divisi, t.tanggal || "", t.uraian || "",
          toNum(t.rencana), toNum(t.uang_masuk), toNum(t.uang_keluar),
          t.keterangan || null,
          notas[0]?.nama || null, notas[0]?.tipe || null,
        ]
      );
      const txId = result.insertId;
      for (let i = 0; i < notas.length; i++) {
        const n = notas[i];
        await conn.execute(
          `INSERT INTO transaksi_nota (transaksi_id, nama_file, tipe_file, data_base64, urutan)
           VALUES (?, ?, ?, ?, ?)`,
          [txId, n.nama || "", n.tipe || "", n.data || null, i + 1]
        );
      }
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ─────────────────────── DATA AKAD ───────────────────────────────────────────
// BUG FIX: status_cair DB ('cair'/'belum_cair') ↔ frontend ("Cair"/"Belum Cair")

async function dbGetAkad(pool: Pool) {
  const [rows] = await pool.query(
    `SELECT id, tanggal_akad, nama_user, blok, bank, nominal,
            status_cair, tanggal_cair, keterangan, created_at, updated_at, created_by
     FROM data_akad ORDER BY tanggal_akad DESC`
  );
  return (rows as any[]).map((r) => ({
    id: toStr(r.id),
    tanggal_akad: dateStr(r.tanggal_akad),
    nama_user: r.nama_user || "",
    blok: r.blok || "",
    bank: r.bank || "",
    nominal: toNum(r.nominal),
    status: akadStatusFromDb(r.status_cair || "belum_cair"),
    tanggal_cair: r.tanggal_cair ? dateStr(r.tanggal_cair) : null,
    keterangan: r.keterangan || "",
    created_at: isoStr(r.created_at),
    updated_at: isoStr(r.updated_at),
    created_by: toStr(r.created_by || ""),
  }));
}

async function dbSaveAkad(pool: Pool, data: any[]) {
  await pool.execute("DELETE FROM data_akad");
  if (!data.length) return;
  const rows = data.map((a: any) => [
    a.tanggal_akad || "",
    a.nama_user || "",
    a.blok || "",
    a.bank || "",
    toNum(a.nominal),
    akadStatusToDb(a.status || "Belum Cair"),
    a.tanggal_cair || null,
    a.keterangan || null,
  ]);
  await pool.query(
    `INSERT INTO data_akad
       (tanggal_akad, nama_user, blok, bank, nominal, status_cair, tanggal_cair, keterangan)
     VALUES ?`,
    [rows]
  );
}

// ─────────────────────── CASH LUNAK ──────────────────────────────────────────

async function dbGetCashLunak(pool: Pool) {
  const [parents] = await pool.query(
    `SELECT id, nama_user, no_hp, alamat, blok, harga_total, tanggal_dp,
            jumlah_dp, tenor, cicilan_per_bulan, keterangan, created_at, updated_at
     FROM cash_lunak ORDER BY id`
  );
  const result = [];
  for (const p of parents as any[]) {
    const [hist] = await pool.query(
      `SELECT id, tanggal_bayar, cicilan_ke, jenis, jumlah, metode, keterangan
       FROM cash_lunak_history WHERE cash_lunak_id = ? ORDER BY cicilan_ke`,
      [p.id]
    );
    result.push({
      id: toStr(p.id),
      nama_pembeli: p.nama_user || "",
      no_hp: p.no_hp || "",
      alamat: p.alamat || "",
      blok: p.blok || "",
      harga_unit: toNum(p.harga_total),
      tanggal_dp: dateStr(p.tanggal_dp),
      jumlah_dp: toNum(p.jumlah_dp),
      tenor: p.tenor || 0,
      cicilan_per_bulan: toNum(p.cicilan_per_bulan),
      keterangan: p.keterangan || "",
      dokumen: null,
      created_at: isoStr(p.created_at),
      updated_at: isoStr(p.updated_at),
      cicilan: (hist as any[]).map((h) => ({
        id: toStr(h.id),
        tanggal_bayar: dateStr(h.tanggal_bayar),
        jumlah_bayar: toNum(h.jumlah),
        metode: h.metode || "",
        jenis: h.jenis || "cicilan",
        keterangan: h.keterangan || "",
      })),
    });
  }
  return result;
}

async function dbSaveCashLunak(pool: Pool, data: any[]) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("SET FOREIGN_KEY_CHECKS = 0");
    await conn.execute("DELETE FROM cash_lunak_history");
    await conn.execute("DELETE FROM cash_lunak");
    for (const item of data) {
      const hargaTotal = toNum(item.harga_unit || item.harga_total);
      const dp = toNum(item.jumlah_dp);
      const tenor = item.tenor || 0;
      const cicilanBulanan = tenor > 0 ? (hargaTotal - dp) / tenor : 0;
      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO cash_lunak
           (nama_user, no_hp, alamat, blok, harga_total, tanggal_dp, jumlah_dp,
            tenor, cicilan_per_bulan, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.nama_pembeli || item.nama_user || "",
          item.no_hp || null,
          item.alamat || null,
          item.blok || "",
          hargaTotal,
          item.tanggal_dp || "",
          dp,
          tenor,
          cicilanBulanan,
          item.keterangan || null,
        ]
      );
      const parentId = res.insertId;
      const cicilan: any[] = item.cicilan || [];
      for (let i = 0; i < cicilan.length; i++) {
        const c = cicilan[i];
        await conn.execute(
          `INSERT INTO cash_lunak_history
             (cash_lunak_id, tanggal_bayar, cicilan_ke, jenis, jumlah, metode, keterangan)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            parentId,
            c.tanggal_bayar || "",
            c.cicilan_ke || i + 1,
            c.jenis || "cicilan",
            toNum(c.jumlah_bayar || c.jumlah),
            c.metode || null,
            c.keterangan || null,
          ]
        );
      }
    }
    await conn.execute("SET FOREIGN_KEY_CHECKS = 1");
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ─────────────────────── DATA SISWA ──────────────────────────────────────────
// BUG FIX: kelas ("TK A"→"Kelompok A") dan status ("aktif"→"Aktif")

async function dbGetDataSiswa(pool: Pool) {
  const [rows] = await pool.query(
    `SELECT id, nis, nama_siswa, tempat_lahir, tanggal_lahir, jenis_kelamin,
            alamat, kelas, tahun_ajaran, nama_wali, no_hp_wali, pekerjaan_wali,
            status, created_at
     FROM data_siswa ORDER BY id`
  );
  return (rows as any[]).map((r) => ({
    id: toStr(r.id),
    nis: r.nis || "",
    nama: r.nama_siswa || "",
    nama_siswa: r.nama_siswa || "",
    tempat_lahir: r.tempat_lahir || "",
    tanggal_lahir: dateStr(r.tanggal_lahir),
    jenis_kelamin: r.jenis_kelamin || "L",
    alamat: r.alamat || "",
    kelas: siswaKelasFromDb(r.kelas || ""),
    tahun_ajaran: r.tahun_ajaran || "",
    nama_wali: r.nama_wali || "",
    no_hp_wali: r.no_hp_wali || "",
    pekerjaan_wali: r.pekerjaan_wali || "",
    status: siswaStatusFromDb(r.status || "aktif"),
    created_at: isoStr(r.created_at),
  }));
}

async function dbSaveDataSiswa(pool: Pool, data: any[]) {
  await pool.execute("DELETE FROM data_siswa");
  if (!data.length) return;
  const rows = data.map((s: any) => [
    s.nis || `TMP${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    s.nama || s.nama_siswa || "",
    s.tempat_lahir || null,
    s.tanggal_lahir || null,
    s.jenis_kelamin || "L",
    s.alamat || null,
    siswaKelasToDb(s.kelas || "Kelompok A"),
    s.tahun_ajaran || "",
    s.nama_wali || null,
    s.no_hp_wali || null,
    s.pekerjaan_wali || null,
    s.status === "Aktif" || s.status === "aktif" ? "aktif" : "nonaktif",
  ]);
  await pool.query(
    `INSERT INTO data_siswa
       (nis, nama_siswa, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat,
        kelas, tahun_ajaran, nama_wali, no_hp_wali, pekerjaan_wali, status)
     VALUES ?`,
    [rows]
  );
}

// ─────────────────────── ADM SISWA (transaksi_siswa) ─────────────────────────

const JENIS_ENUM = new Set([
  "spp", "infaq", "seragam", "iuran_wisuda", "iuran_buku",
  "iuran_tahunan", "pendaftaran", "lain",
]);

async function dbGetAdmSiswa(pool: Pool) {
  const [rows] = await pool.query(
    `SELECT ts.id, ts.siswa_id, ds.nama_siswa, ds.kelas,
            ts.jenis_pembayaran, ts.periode_label, ts.periode_bulan, ts.periode_tahun,
            ts.tagihan, ts.jumlah_dibayar, ts.metode, ts.keterangan, ts.tanggal_transaksi
     FROM transaksi_siswa ts
     LEFT JOIN data_siswa ds ON ds.id = ts.siswa_id
     ORDER BY ts.tanggal_transaksi`
  );
  return (rows as any[]).map((r) => {
    const tagihan = toNum(r.tagihan);
    const dibayar = toNum(r.jumlah_dibayar);
    let status: string;
    if (dibayar <= 0) status = "Belum Bayar";
    else if (dibayar >= tagihan) status = "Lunas";
    else status = "Kurang Bayar";
    return {
      id: toStr(r.id),
      id_siswa: toStr(r.siswa_id || ""),
      nama_siswa: r.nama_siswa || "",
      kelas: siswaKelasFromDb(r.kelas || ""),
      jenis_tagihan: r.jenis_pembayaran || "lain",
      uraian: r.periode_label || r.jenis_pembayaran || "",
      periode_bulan: r.periode_bulan || "",
      periode_tahun: r.periode_tahun || "",
      tagihan,
      jumlah_dibayar: dibayar,
      sisa: tagihan - dibayar,
      status,
      tgl_transaksi: dateStr(r.tanggal_transaksi),
      metode_bayar: r.metode || "",
      keterangan: r.keterangan || null,
      created_at: "",
      updated_at: "",
      created_by: "",
    };
  });
}

async function dbSaveAdmSiswa(pool: Pool, data: any[]) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("SET FOREIGN_KEY_CHECKS = 0");
    await conn.execute("DELETE FROM transaksi_siswa");
    if (data.length) {
      const rows = data.map((a: any) => {
        const jenis = JENIS_ENUM.has(a.jenis_tagihan) ? a.jenis_tagihan : "lain";
        const siswaId = parseInt(a.id_siswa) || 0;
        const periodeLabel =
          a.uraian ||
          `${a.periode_bulan || ""} ${a.periode_tahun || ""}`.trim() ||
          "-";
        return [
          siswaId,
          a.tgl_transaksi || new Date().toISOString().split("T")[0],
          jenis,
          periodeLabel,
          a.periode_bulan || null,
          a.periode_tahun || null,
          toNum(a.tagihan),
          toNum(a.jumlah_dibayar),
          a.metode_bayar || null,
          a.keterangan || null,
        ];
      });
      await conn.query(
        `INSERT INTO transaksi_siswa
           (siswa_id, tanggal_transaksi, jenis_pembayaran, periode_label,
            periode_bulan, periode_tahun, tagihan, jumlah_dibayar, metode, keterangan)
         VALUES ?`,
        [rows]
      );
    }
    await conn.execute("SET FOREIGN_KEY_CHECKS = 1");
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ─────────────────────── PROGRES TUKANG ──────────────────────────────────────
// BUG FIX: status DB ('belum_mulai') ↔ frontend ("Belum Mulai")

async function dbGetProgresTukang(pool: Pool) {
  const [parents] = await pool.query(
    `SELECT id, nama_tukang, lokasi, total_kontrak, tanggal_mulai,
            tanggal_target_selesai, selesai_persen, status, keterangan,
            created_at, updated_at
     FROM progres_tukang ORDER BY id`
  );
  const result = [];
  for (const p of parents as any[]) {
    const [hist] = await pool.query(
      `SELECT id, tanggal_bayar, jumlah, blok, keterangan
       FROM progres_tukang_history WHERE tukang_id = ? ORDER BY tanggal_bayar`,
      [p.id]
    );
    const totalTerbayar = (hist as any[]).reduce(
      (sum, h) => sum + toNum(h.jumlah),
      0
    );
    result.push({
      id: toStr(p.id),
      nama_tukang: p.nama_tukang || "",
      lokasi: p.lokasi || "",
      total_kontrak: toNum(p.total_kontrak),
      total_terbayar: totalTerbayar,
      sisa_progres: toNum(p.total_kontrak) - totalTerbayar,
      persen_selesai: p.selesai_persen || 0,
      status: progresStatusFromDb(p.status || "belum_mulai"),
      tanggal_mulai: dateStr(p.tanggal_mulai),
      estimasi_selesai: dateStr(p.tanggal_target_selesai),
      keterangan: p.keterangan || "",
      created_at: isoStr(p.created_at),
      updated_at: isoStr(p.updated_at),
      created_by: "",
      histori_progres: (hist as any[]).map((h, i) => ({
        id_progres: toStr(h.id),
        tanggal: dateStr(h.tanggal_bayar),
        minggu_ke: i + 1,
        nominal: toNum(h.jumlah),
        blok: h.blok || "",
        foto: null,
      })),
    });
  }
  return result;
}

async function dbSaveProgresTukang(pool: Pool, data: any[]) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("SET FOREIGN_KEY_CHECKS = 0");
    await conn.execute("DELETE FROM progres_tukang_history");
    await conn.execute("DELETE FROM progres_tukang");
    for (const item of data) {
      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO progres_tukang
           (nama_tukang, lokasi, total_kontrak, tanggal_mulai,
            tanggal_target_selesai, selesai_persen, status, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.nama_tukang || "",
          item.lokasi || "",
          toNum(item.total_kontrak),
          item.tanggal_mulai || "",
          item.estimasi_selesai || null,
          item.persen_selesai || 0,
          progresStatusToDb(item.status || "Belum Mulai"),
          item.keterangan || null,
        ]
      );
      const parentId = res.insertId;
      const histori: any[] = item.histori_progres || [];
      for (const h of histori) {
        await conn.execute(
          `INSERT INTO progres_tukang_history
             (tukang_id, tanggal_bayar, jumlah, blok, keterangan)
           VALUES (?, ?, ?, ?, ?)`,
          [parentId, h.tanggal || "", toNum(h.nominal), h.blok || "", h.keterangan || null]
        );
      }
    }
    await conn.execute("SET FOREIGN_KEY_CHECKS = 1");
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ─────────────────────── getAll ──────────────────────────────────────────────

export async function getAll(pool: Pool) {
  const [
    users, hakAkses, saldoAwal,
    akad, cashLunak, dataSiswa, admSiswa, progresTukang,
    trsBAKSO, trsAMANAH, trsBATUALAM, trsKEMBANG, trsPERUMAHAN, trsTKYARIS,
  ] = await Promise.all([
    dbGetUsers(pool),
    dbGetHakAkses(pool),
    dbGetSaldoAwal(pool),
    dbGetAkad(pool),
    dbGetCashLunak(pool),
    dbGetDataSiswa(pool),
    dbGetAdmSiswa(pool),
    dbGetProgresTukang(pool),
    dbGetTransaksi(pool, "bakso"),
    dbGetTransaksi(pool, "amanah"),
    dbGetTransaksi(pool, "batualam"),
    dbGetTransaksi(pool, "kembang"),
    dbGetTransaksi(pool, "perumahan"),
    dbGetTransaksi(pool, "tkyaris"),
  ]);

  return {
    cashflow_users: users,
    cashflow_hak_akses: hakAkses,
    cashflow_saldo_awal: saldoAwal,
    cashflow_akad: akad,
    cashflow_cashlunak: cashLunak,
    cashflow_datasiswa: dataSiswa,
    cashflow_admsiswa: admSiswa,
    cashflow_progrestukang: progresTukang,
    cashflow_bakso: trsBAKSO,
    cashflow_amanah: trsAMANAH,
    cashflow_batualam: trsBATUALAM,
    cashflow_kembang: trsKEMBANG,
    cashflow_perumahan: trsPERUMAHAN,
    cashflow_tkyaris: trsTKYARIS,
    // Tidak ada tabel di SQL baru — null agar localStorage tetap dipakai
    cashflow_saldo_manual_tkyaris: null,
    cashflow_saldo_admsiswa: null,
    cashflow_jenistagihan: null,
    cashflow_imports_amanah: null,
    cashflow_imports_batualam: null,
  };
}

// ─────────────────────── saveByKey ───────────────────────────────────────────

export async function saveByKey(pool: Pool, key: string, value: any): Promise<boolean> {
  try {
    switch (key) {
      case "cashflow_users":
        await dbSaveUsers(pool, value);
        break;
      case "cashflow_hak_akses":
        await dbSaveHakAkses(pool, value);
        break;
      case "cashflow_saldo_awal":
        await dbSaveSaldoAwal(pool, value);
        break;
      case "cashflow_akad":
        await dbSaveAkad(pool, value);
        break;
      case "cashflow_cashlunak":
        await dbSaveCashLunak(pool, value);
        break;
      case "cashflow_datasiswa":
        await dbSaveDataSiswa(pool, value);
        break;
      case "cashflow_admsiswa":
        await dbSaveAdmSiswa(pool, value);
        break;
      case "cashflow_progrestukang":
        await dbSaveProgresTukang(pool, value);
        break;
      case "cashflow_bakso":
      case "cashflow_amanah":
      case "cashflow_batualam":
      case "cashflow_kembang":
      case "cashflow_perumahan":
      case "cashflow_tkyaris":
        await dbSaveTransaksi(pool, key.replace("cashflow_", ""), value);
        break;
      // Tidak ada tabel SQL — diterima tanpa operasi DB
      case "cashflow_saldo_manual_tkyaris":
      case "cashflow_saldo_admsiswa":
      case "cashflow_jenistagihan":
      case "cashflow_imports_amanah":
      case "cashflow_imports_batualam":
        return true;
      default:
        return false;
    }
    return true;
  } catch (err) {
    console.error(`[DB] saveByKey error key=${key}:`, err);
    return false;
  }
}
