export interface User {
  id: string;
  namaLengkap: string;
  username: string;
  password: string;
  role: string;
  status: "aktif" | "nonaktif";
}

export interface Transaksi {
  id: string;
  tanggal: string;
  uraian: string;
  rencana: number;
  uang_masuk: number;
  uang_keluar: number;
  saldo_akhir: number;
  keterangan: string;
  nota?: {
    nama: string;
    tipe: string;
    data: string;
  } | null;
}

export interface SaldoAwal {
  bakso: number;
  amanah: number;
  batualam: number;
  kembang: number;
  perumahan: number;
  /** TK Yaris saldo awal = Adm. Siswa (otomatis) + entri saldo manual.
   * Sentinel string menandakan dibaca otomatis dari summary; legacy
   * `"DARI_ADM_SISWA"` masih diterima untuk kompatibilitas data lama. */
  tkyaris: number | "DARI_ADM_SISWA" | "GABUNGAN_ADM_DAN_MANUAL";
}

/** Entri saldo awal manual TK Yaris (dijumlahkan ke saldo awal gabungan). */
export interface SaldoManualEntry {
  id: string;
  keterangan: string;
  nominal: number;
  tanggal: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

/** Ringkasan total saldo terbayar dari Adm. Keuangan Siswa + manual.
 * Disimpan di key `cashflow_saldo_admsiswa` dan dipakai sebagai
 * Saldo Awal Cashflow TK Yaris. */
export interface SaldoAdmSiswaSummary {
  total_saldo: number;
  total_saldo_manual: number;
  total_saldo_gabungan: number;
  rincian: { id_siswa: string; nama: string; total_terbayar: number }[];
  updated_at: string;
  updated_by: string;
}

/** Custom DOM event yang dipancarkan setiap kali saldo Adm. Siswa
 * berubah, sehingga halaman lain dapat me-refresh tampilan secara
 * realtime tanpa polling. */
export const SALDO_ADMSISWA_EVENT = "cashflow:saldo-admsiswa-updated";

/** Unit yang mendukung Import Dokumen Otomatis. */
export type ImportableUnit = "amanah" | "batualam";

/** Baris data hasil import dokumen (Excel/CSV/Word). Belum tentu
 * sudah disinkronkan ke cashflow utama. */
export interface ImportedRow {
  id: string;
  unit: ImportableUnit;
  tanggal: string;        // ISO yyyy-mm-dd
  keterangan: string;
  kategori: string;
  debit: number;          // uang_masuk
  kredit: number;         // uang_keluar
  saldo: number;          // sumber file (informasi)
  catatan: string;
  source_file: string;
  uploaded_at: string;
  created_by: string;
  synced: boolean;
  synced_at: string | null;
  synced_transaksi_id: string | null;
  /** Hash deduplikasi: tanggal|keterangan|debit|kredit (lowercase). */
  dedup_key: string;
}

/** Event yang dipancarkan setelah CRUD pada tabel import dokumen. */
export const IMPORTS_UPDATED_EVENT = "cashflow:imports-updated";

export interface HakAkses {
  [role: string]: {
    [halaman: string]: "CRUD" | "VIEW" | "NONE";
  };
}

export interface DataAkad {
  id: string;
  tanggal_akad: string;
  nama_user: string;
  blok: string;
  bank: string;
  status: "Cair" | "Belum Cair";
  tanggal_cair: string | null;
  keterangan: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Cicilan {
  id: string;
  tanggal_bayar: string;
  jumlah_bayar: number;
  keterangan: string;
}

export interface CashLunak {
  id: string;
  nama_pembeli: string;
  blok: string;
  tanggal_dp: string;
  harga_unit: number;
  jumlah_dp: number;
  tenor: number;
  keterangan: string;
  cicilan: Cicilan[];
  dokumen?: { nama: string; tipe: string; data: string } | null;
  created_at: string;
  updated_at: string;
}

export type StatusKontrak = "Belum Mulai" | "Berjalan" | "Selesai";

export interface HistoriProgres {
  id_progres: string;
  tanggal: string;
  minggu_ke: number;
  nominal: number;
  blok: string;
  foto?: { nama_file: string; tipe: string; ukuran: number; data_base64: string } | null;
}

export interface ProgresTukang {
  id: string;
  nama_tukang: string;
  lokasi: string;
  total_kontrak: number;
  total_terbayar: number;
  sisa_progres: number;
  persen_selesai: number;
  status: StatusKontrak;
  tanggal_mulai: string;
  estimasi_selesai: string;
  keterangan: string;
  histori_progres: HistoriProgres[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type DivisiKey = "bakso" | "amanah" | "batualam" | "kembang" | "perumahan" | "tkyaris";

export const DIVISI_CONFIG: Record<DivisiKey, { label: string; color: string; storageKey: string }> = {
  bakso: { label: "Bakso Bento Malang", color: "#3b82f6", storageKey: "cashflow_bakso" },
  amanah: { label: "Toko UD Amanah", color: "#10b981", storageKey: "cashflow_amanah" },
  batualam: { label: "Toko Batu Alam", color: "#f59e0b", storageKey: "cashflow_batualam" },
  kembang: { label: "Toko Kembang", color: "#ec4899", storageKey: "cashflow_kembang" },
  perumahan: { label: "Divisi Perumahan", color: "#8b5cf6", storageKey: "cashflow_perumahan" },
  tkyaris: { label: "TK Yaris", color: "#4527a0", storageKey: "cashflow_tkyaris" },
};

const DEFAULT_USERS: User[] = [
  { id: "1", namaLengkap: "Administrator", username: "admin", password: "admin123", role: "admin", status: "aktif" },
  { id: "2", namaLengkap: "Owner", username: "owner", password: "owner123", role: "owner", status: "aktif" },
  { id: "3", namaLengkap: "Staff Bakso Bento", username: "staff_bakso", password: "staff123", role: "staff_bakso", status: "aktif" },
  { id: "4", namaLengkap: "Staff UD Amanah", username: "staff_amanah", password: "staff123", role: "staff_amanah", status: "aktif" },
  { id: "5", namaLengkap: "Staff Batu Alam", username: "staff_batualam", password: "staff123", role: "staff_batualam", status: "aktif" },
  { id: "6", namaLengkap: "Staff Toko Kembang", username: "staff_kembang", password: "staff123", role: "staff_kembang", status: "aktif" },
  { id: "7", namaLengkap: "Staff Perumahan", username: "staff_perumahan", password: "staff123", role: "staff_perumahan", status: "aktif" },
  { id: "8", namaLengkap: "Staff TK Yaris", username: "staff_tkyaris", password: "staff123", role: "staff_tkyaris", status: "aktif" },
];

const DEFAULT_HAK_AKSES: HakAkses = {
  owner: {
    dashboard: "VIEW",
    bakso: "CRUD",
    amanah: "CRUD",
    batualam: "CRUD",
    kembang: "CRUD",
    perumahan: "CRUD",
    tkyaris: "CRUD",
    akad: "VIEW",
    cashlunak: "VIEW",
    admsiswa: "VIEW",
    progrestukang: "VIEW",
    laporan: "VIEW",
    pengaturan: "NONE",
  },
  admin: {
    dashboard: "VIEW",
    bakso: "CRUD",
    amanah: "CRUD",
    batualam: "CRUD",
    kembang: "CRUD",
    perumahan: "CRUD",
    tkyaris: "CRUD",
    akad: "CRUD",
    cashlunak: "CRUD",
    admsiswa: "CRUD",
    progrestukang: "CRUD",
    laporan: "VIEW",
    pengaturan: "CRUD",
  },
  staff_bakso: {
    dashboard: "VIEW",
    bakso: "CRUD",
    amanah: "NONE",
    batualam: "NONE",
    kembang: "NONE",
    perumahan: "NONE",
    tkyaris: "NONE",
    akad: "NONE",
    progrestukang: "NONE",
    laporan: "NONE",
    pengaturan: "NONE",
  },
  staff_amanah: {
    dashboard: "VIEW",
    bakso: "NONE",
    amanah: "CRUD",
    batualam: "NONE",
    kembang: "NONE",
    perumahan: "NONE",
    tkyaris: "NONE",
    akad: "NONE",
    progrestukang: "NONE",
    laporan: "NONE",
    pengaturan: "NONE",
  },
  staff_batualam: {
    dashboard: "VIEW",
    bakso: "NONE",
    amanah: "NONE",
    batualam: "CRUD",
    kembang: "NONE",
    perumahan: "NONE",
    tkyaris: "NONE",
    akad: "NONE",
    progrestukang: "NONE",
    laporan: "NONE",
    pengaturan: "NONE",
  },
  staff_kembang: {
    dashboard: "VIEW",
    bakso: "NONE",
    amanah: "NONE",
    batualam: "NONE",
    kembang: "CRUD",
    perumahan: "NONE",
    tkyaris: "NONE",
    akad: "NONE",
    progrestukang: "NONE",
    laporan: "NONE",
    pengaturan: "NONE",
  },
  staff_perumahan: {
    dashboard: "VIEW",
    bakso: "NONE",
    amanah: "NONE",
    batualam: "NONE",
    kembang: "NONE",
    perumahan: "CRUD",
    tkyaris: "NONE",
    akad: "CRUD",
    cashlunak: "CRUD",
    progrestukang: "CRUD",
    laporan: "NONE",
    pengaturan: "NONE",
  },
  staff_tkyaris: {
    dashboard: "VIEW",
    bakso: "NONE",
    amanah: "NONE",
    batualam: "NONE",
    kembang: "NONE",
    perumahan: "NONE",
    tkyaris: "CRUD",
    akad: "NONE",
    cashlunak: "NONE",
    admsiswa: "CRUD",
    progrestukang: "NONE",
    laporan: "NONE",
    pengaturan: "NONE",
  },
};

export function initStorage() {
  if (!localStorage.getItem("cashflow_initialized")) {
    localStorage.setItem("cashflow_users", JSON.stringify(DEFAULT_USERS));
    localStorage.setItem("cashflow_hak_akses", JSON.stringify(DEFAULT_HAK_AKSES));
    localStorage.setItem("cashflow_saldo_awal", JSON.stringify({ bakso: 0, amanah: 0, batualam: 0, kembang: 0, perumahan: 0, tkyaris: "GABUNGAN_ADM_DAN_MANUAL" }));
    localStorage.setItem("cashflow_bakso", JSON.stringify([]));
    localStorage.setItem("cashflow_amanah", JSON.stringify([]));
    localStorage.setItem("cashflow_batualam", JSON.stringify([]));
    localStorage.setItem("cashflow_kembang", JSON.stringify([]));
    localStorage.setItem("cashflow_perumahan", JSON.stringify([]));
    localStorage.setItem("cashflow_tkyaris", JSON.stringify([]));
    localStorage.setItem("cashflow_akad", JSON.stringify([]));
    localStorage.setItem("cashflow_cashlunak", JSON.stringify([]));
    localStorage.setItem("cashflow_initialized", "true");
  }
  // Migrate existing installs: init tkyaris storage
  if (!localStorage.getItem("cashflow_tkyaris")) {
    localStorage.setItem("cashflow_tkyaris", JSON.stringify([]));
  }
  if (!localStorage.getItem("cashflow_akad")) {
    localStorage.setItem("cashflow_akad", JSON.stringify([]));
  }
  if (!localStorage.getItem("cashflow_cashlunak")) {
    localStorage.setItem("cashflow_cashlunak", JSON.stringify([]));
  }
  if (!localStorage.getItem("cashflow_admsiswa")) {
    localStorage.setItem("cashflow_admsiswa", JSON.stringify([]));
  }
  if (!localStorage.getItem("cashflow_datasiswa")) {
    localStorage.setItem("cashflow_datasiswa", JSON.stringify([]));
  }
  if (!localStorage.getItem("cashflow_jenistagihan")) {
    localStorage.setItem("cashflow_jenistagihan", JSON.stringify(DEFAULT_JENIS_TAGIHAN));
  }
  if (!localStorage.getItem("cashflow_progrestukang")) {
    localStorage.setItem("cashflow_progrestukang", JSON.stringify([]));
  }
  // Drop deprecated master tukang key
  if (localStorage.getItem("cashflow_datatukang") !== null) {
    localStorage.removeItem("cashflow_datatukang");
  }
  migrateProgresTukang();
  // Inisialisasi key entri saldo manual TK Yaris (jika belum ada).
  if (!localStorage.getItem("cashflow_saldo_manual_tkyaris")) {
    localStorage.setItem("cashflow_saldo_manual_tkyaris", JSON.stringify([]));
  }
  // Migrate saldo_awal: pastikan field tkyaris ada dengan sentinel terbaru.
  const saldoRaw = JSON.parse(localStorage.getItem("cashflow_saldo_awal") || "{}");
  if (saldoRaw.tkyaris === undefined) {
    saldoRaw.tkyaris = "GABUNGAN_ADM_DAN_MANUAL";
    localStorage.setItem("cashflow_saldo_awal", JSON.stringify(saldoRaw));
  }
  // Upgrade sentinel lama "DARI_ADM_SISWA" → "GABUNGAN_ADM_DAN_MANUAL".
  if (saldoRaw.tkyaris === "DARI_ADM_SISWA") {
    saldoRaw.tkyaris = "GABUNGAN_ADM_DAN_MANUAL";
    localStorage.setItem("cashflow_saldo_awal", JSON.stringify(saldoRaw));
  }
  // Override nilai numeric lama; backup ke key cadangan agar bisa direcover.
  if (typeof saldoRaw.tkyaris === "number") {
    if (saldoRaw.tkyaris > 0 && !localStorage.getItem("cashflow_saldo_awal_tkyaris_backup")) {
      localStorage.setItem(
        "cashflow_saldo_awal_tkyaris_backup",
        JSON.stringify({ value: saldoRaw.tkyaris, migrated_at: new Date().toISOString() })
      );
    }
    saldoRaw.tkyaris = "GABUNGAN_ADM_DAN_MANUAL";
    localStorage.setItem("cashflow_saldo_awal", JSON.stringify(saldoRaw));
  }
  // Inisialisasi summary saldo Adm. Siswa & jaga konsistensi
  if (!localStorage.getItem("cashflow_saldo_admsiswa")) {
    const initialAdm = hitungTotalSaldoSemuaSiswa();
    const initialManual = getTotalSaldoManualTKYaris();
    const initial: SaldoAdmSiswaSummary = {
      total_saldo: initialAdm,
      total_saldo_manual: initialManual,
      total_saldo_gabungan: initialAdm + initialManual,
      rincian: hitungRincianSaldoSiswa(),
      updated_at: new Date().toISOString(),
      updated_by: "system:init",
    };
    localStorage.setItem("cashflow_saldo_admsiswa", JSON.stringify(initial));
  } else {
    cekKonsistensiSaldo();
  }
  // Migrate hak_akses: add tkyaris and akad keys to existing roles; add staff_tkyaris role
  const existingHak = JSON.parse(localStorage.getItem("cashflow_hak_akses") || "{}") as HakAkses;
  let needsUpdate = false;
  Object.keys(DEFAULT_HAK_AKSES).forEach(role => {
    if (!existingHak[role]) {
      existingHak[role] = { ...DEFAULT_HAK_AKSES[role] };
      needsUpdate = true;
    } else {
      ["akad", "tkyaris", "cashlunak", "admsiswa", "progrestukang"].forEach(key => {
        if (existingHak[role][key] === undefined) {
          existingHak[role][key] = DEFAULT_HAK_AKSES[role][key] || "NONE";
          needsUpdate = true;
        }
      });
    }
  });
  if (needsUpdate) {
    localStorage.setItem("cashflow_hak_akses", JSON.stringify(existingHak));
  }
  // Migrate users: add staff_tkyaris if not exists
  const users = JSON.parse(localStorage.getItem("cashflow_users") || "[]") as User[];
  if (!users.find(u => u.role === "staff_tkyaris")) {
    users.push({ id: "8", namaLengkap: "Staff TK Yaris", username: "staff_tkyaris", password: "staff123", role: "staff_tkyaris", status: "aktif" });
    localStorage.setItem("cashflow_users", JSON.stringify(users));
  }
}

export function getAkad(): DataAkad[] {
  return JSON.parse(localStorage.getItem("cashflow_akad") || "[]");
}

export function saveAkad(data: DataAkad[]) {
  localStorage.setItem("cashflow_akad", JSON.stringify(data));
}

export function getUsers(): User[] {
  return JSON.parse(localStorage.getItem("cashflow_users") || "[]");
}

export function saveUsers(users: User[]) {
  localStorage.setItem("cashflow_users", JSON.stringify(users));
}

export function getSession(): User | null {
  const s = sessionStorage.getItem("cashflow_session");
  return s ? JSON.parse(s) : null;
}

export function saveSession(user: User) {
  sessionStorage.setItem("cashflow_session", JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem("cashflow_session");
}

export function getTransaksi(divisi: DivisiKey): Transaksi[] {
  return JSON.parse(localStorage.getItem(`cashflow_${divisi}`) || "[]");
}

export function saveTransaksi(divisi: DivisiKey, data: Transaksi[]): void {
  try {
    localStorage.setItem(`cashflow_${divisi}`, JSON.stringify(data));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      throw new Error("Penyimpanan penuh! Hapus nota/file yang sudah tidak diperlukan untuk mengosongkan ruang, lalu coba lagi.");
    }
    throw e;
  }
}

export function getSaldoAwal(): SaldoAwal {
  return JSON.parse(localStorage.getItem("cashflow_saldo_awal") || '{"bakso":0,"amanah":0,"batualam":0,"kembang":0,"perumahan":0,"tkyaris":"GABUNGAN_ADM_DAN_MANUAL"}');
}

export function saveSaldoAwal(data: SaldoAwal) {
  localStorage.setItem("cashflow_saldo_awal", JSON.stringify(data));
}

/** Hitung total saldo terbayar dari seluruh siswa (sumber kebenaran). */
export function hitungTotalSaldoSemuaSiswa(): number {
  return getAdmSiswa().reduce((sum, a) => sum + (a.jumlah_dibayar || 0), 0);
}

/** Hitung rincian saldo terbayar per siswa, lengkap dengan nama. */
export function hitungRincianSaldoSiswa(): SaldoAdmSiswaSummary["rincian"] {
  const adm = getAdmSiswa();
  const peta = new Map<string, { nama: string; total_terbayar: number }>();
  adm.forEach(a => {
    const cur = peta.get(a.id_siswa);
    if (cur) {
      cur.total_terbayar += a.jumlah_dibayar || 0;
    } else {
      peta.set(a.id_siswa, { nama: a.nama_siswa || "(tanpa nama)", total_terbayar: a.jumlah_dibayar || 0 });
    }
  });
  return Array.from(peta.entries()).map(([id_siswa, v]) => ({ id_siswa, nama: v.nama, total_terbayar: v.total_terbayar }));
}

/** Ambil ringkasan saldo Adm. Siswa terbaru (selalu non-null setelah init).
 * Field manual & gabungan diisi default 0 jika data lama tidak menyimpannya. */
export function getSaldoAdmSiswaSummary(): SaldoAdmSiswaSummary {
  const raw = localStorage.getItem("cashflow_saldo_admsiswa");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<SaldoAdmSiswaSummary>;
      const total_saldo = parsed.total_saldo ?? 0;
      const total_saldo_manual = parsed.total_saldo_manual ?? getTotalSaldoManualTKYaris();
      return {
        total_saldo,
        total_saldo_manual,
        total_saldo_gabungan: parsed.total_saldo_gabungan ?? total_saldo + total_saldo_manual,
        rincian: parsed.rincian ?? [],
        updated_at: parsed.updated_at ?? new Date().toISOString(),
        updated_by: parsed.updated_by ?? "system",
      };
    } catch { /* fallthrough */ }
  }
  return {
    total_saldo: 0,
    total_saldo_manual: 0,
    total_saldo_gabungan: 0,
    rincian: [],
    updated_at: new Date().toISOString(),
    updated_by: "system",
  };
}

/** Simpan ulang ringkasan saldo Adm. Siswa berdasarkan data transaksi terkini
 * + entri saldo manual. Memancarkan event `cashflow:saldo-admsiswa-updated`. */
export function simpanSaldoAdmSiswa(updatedBy: string = "system"): SaldoAdmSiswaSummary {
  const totalAdm = hitungTotalSaldoSemuaSiswa();
  const totalManual = getTotalSaldoManualTKYaris();
  const summary: SaldoAdmSiswaSummary = {
    total_saldo: totalAdm,
    total_saldo_manual: totalManual,
    total_saldo_gabungan: totalAdm + totalManual,
    rincian: hitungRincianSaldoSiswa(),
    updated_at: new Date().toISOString(),
    updated_by: updatedBy || "system",
  };
  localStorage.setItem("cashflow_saldo_admsiswa", JSON.stringify(summary));
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(SALDO_ADMSISWA_EVENT, { detail: summary }));
    } catch { /* ignore in non-browser env */ }
  }
  return summary;
}

/** Saldo awal TK Yaris = total pembayaran Adm. Siswa + total entri manual.
 * Untuk divisi lain, saldo awal manual yang diset user. */
export function getSaldoAwalDivisi(divisi: DivisiKey): number {
  if (divisi === "tkyaris") {
    const s = getSaldoAdmSiswaSummary();
    return s.total_saldo + s.total_saldo_manual;
  }
  const saldo = getSaldoAwal();
  const v = saldo[divisi];
  return typeof v === "number" ? v : 0;
}

/** Saldo awal gabungan TK Yaris (alias yang lebih eksplisit). */
export function getSaldoAwalGabunganTKYaris(): number {
  return getSaldoAwalDivisi("tkyaris");
}

/** Pastikan summary saldo Adm. Siswa konsisten dengan transaksi siswa &
 * total entri manual. Jika ada perbedaan, perbaiki silent. */
export function cekKonsistensiSaldo(): void {
  const expectedAdm = hitungTotalSaldoSemuaSiswa();
  const expectedManual = getTotalSaldoManualTKYaris();
  const summary = getSaldoAdmSiswaSummary();
  if (
    summary.total_saldo !== expectedAdm ||
    summary.total_saldo_manual !== expectedManual ||
    summary.total_saldo_gabungan !== expectedAdm + expectedManual
  ) {
    const fixed: SaldoAdmSiswaSummary = {
      total_saldo: expectedAdm,
      total_saldo_manual: expectedManual,
      total_saldo_gabungan: expectedAdm + expectedManual,
      rincian: hitungRincianSaldoSiswa(),
      updated_at: new Date().toISOString(),
      updated_by: "system:konsistensi",
    };
    localStorage.setItem("cashflow_saldo_admsiswa", JSON.stringify(fixed));
  }
}

// ───────────────────────── Saldo Manual TK Yaris ─────────────────────────
const SALDO_MANUAL_KEY = "cashflow_saldo_manual_tkyaris";

export function getSaldoManualEntries(): SaldoManualEntry[] {
  try {
    return JSON.parse(localStorage.getItem(SALDO_MANUAL_KEY) || "[]") as SaldoManualEntry[];
  } catch {
    return [];
  }
}

export function saveSaldoManualEntries(entries: SaldoManualEntry[]) {
  localStorage.setItem(SALDO_MANUAL_KEY, JSON.stringify(entries));
}

export function getTotalSaldoManualTKYaris(): number {
  return getSaldoManualEntries().reduce((s, e) => s + (Number(e.nominal) || 0), 0);
}

function validateSaldoManualPayload(p: { keterangan?: string; nominal?: number; tanggal?: string }): void {
  if (p.keterangan !== undefined) {
    const k = p.keterangan.trim();
    if (k.length < 3) {
      throw new Error("Keterangan saldo manual minimal 3 karakter.");
    }
  }
  if (p.nominal !== undefined) {
    const n = Number(p.nominal);
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error("Nominal saldo manual harus angka lebih besar dari 0.");
    }
  }
  if (p.tanggal !== undefined) {
    if (!p.tanggal || typeof p.tanggal !== "string") {
      throw new Error("Tanggal saldo manual wajib diisi.");
    }
    const t = new Date(p.tanggal);
    if (Number.isNaN(t.getTime())) {
      throw new Error("Format tanggal saldo manual tidak valid.");
    }
  }
}

export function tambahSaldoManual(
  data: { keterangan: string; nominal: number; tanggal: string },
  createdBy: string = "system"
): SaldoManualEntry {
  validateSaldoManualPayload({
    keterangan: data.keterangan,
    nominal: data.nominal,
    tanggal: data.tanggal,
  });
  const now = new Date().toISOString();
  const entry: SaldoManualEntry = {
    id: `sldmanual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    keterangan: data.keterangan.trim(),
    nominal: Number(data.nominal),
    tanggal: data.tanggal,
    created_at: now,
    updated_at: now,
    created_by: createdBy || "system",
  };
  const list = getSaldoManualEntries();
  list.push(entry);
  saveSaldoManualEntries(list);
  simpanSaldoAdmSiswa(createdBy);
  return entry;
}

export function updateSaldoManual(
  id: string,
  patch: { keterangan?: string; nominal?: number; tanggal?: string },
  updatedBy: string = "system"
): SaldoManualEntry | null {
  validateSaldoManualPayload(patch);
  const list = getSaldoManualEntries();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const cur = list[idx];
  const next: SaldoManualEntry = {
    ...cur,
    keterangan: patch.keterangan !== undefined ? patch.keterangan.trim() : cur.keterangan,
    nominal: patch.nominal !== undefined ? Number(patch.nominal) : cur.nominal,
    tanggal: patch.tanggal !== undefined ? patch.tanggal : cur.tanggal,
    updated_at: new Date().toISOString(),
  };
  list[idx] = next;
  saveSaldoManualEntries(list);
  simpanSaldoAdmSiswa(updatedBy);
  return next;
}

export function hapusSaldoManual(id: string, updatedBy: string = "system"): boolean {
  const list = getSaldoManualEntries();
  const next = list.filter(e => e.id !== id);
  if (next.length === list.length) return false;
  saveSaldoManualEntries(next);
  simpanSaldoAdmSiswa(updatedBy);
  return true;
}

// ───────────────────── Pemisahan TK Yaris dari Total Perusahaan ─────────────────────
/** 5 divisi bisnis utama (tanpa TK Yaris). */
export const DIVISI_UTAMA_KEYS: DivisiKey[] = ["bakso", "amanah", "batualam", "kembang", "perumahan"];

/** Hitung saldo akhir suatu divisi: saldo awal + total uang_masuk - total uang_keluar. */
export function hitungSaldoAkhirDivisi(divisi: DivisiKey): number {
  const trs = getTransaksi(divisi);
  const masuk = trs.reduce((s, t) => s + (t.uang_masuk || 0), 0);
  const keluar = trs.reduce((s, t) => s + (t.uang_keluar || 0), 0);
  return getSaldoAwalDivisi(divisi) + masuk - keluar;
}

/** Total saldo perusahaan = jumlah saldo akhir 5 divisi utama (TANPA TK Yaris). */
export function hitungTotalSaldoPerusahaan(): number {
  return DIVISI_UTAMA_KEYS.reduce((s, k) => s + hitungSaldoAkhirDivisi(k), 0);
}

/** Saldo akhir TK Yaris (terpisah dari total perusahaan). */
export function hitungSaldoAkhirTKYaris(): number {
  return hitungSaldoAkhirDivisi("tkyaris");
}

export function getHakAkses(): HakAkses {
  return JSON.parse(localStorage.getItem("cashflow_hak_akses") || "{}");
}

export function saveHakAkses(data: HakAkses) {
  localStorage.setItem("cashflow_hak_akses", JSON.stringify(data));
}

export function getUserAccess(role: string, halaman: string): "CRUD" | "VIEW" | "NONE" {
  const hak = getHakAkses();
  return (hak[role]?.[halaman] as "CRUD" | "VIEW" | "NONE") || "NONE";
}

export function recalculateSaldo(transaksi: Transaksi[], saldoAwal: number): Transaksi[] {
  let saldoBerjalan = saldoAwal;
  return transaksi.map(t => {
    saldoBerjalan = saldoBerjalan + t.uang_masuk - t.uang_keluar;
    return { ...t, saldo_akhir: saldoBerjalan };
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export function parseRupiah(str: string): number {
  return parseFloat(str.replace(/[^0-9.-]/g, "")) || 0;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function getStorageUsagePercent(): number {
  try {
    let total = 0;
    for (const key of Object.keys(localStorage)) {
      total += (localStorage.getItem(key) || "").length * 2;
    }
    const maxBytes = 5 * 1024 * 1024;
    return Math.min(100, Math.round((total / maxBytes) * 100));
  } catch {
    return 0;
  }
}

export function getCashLunak(): CashLunak[] {
  return JSON.parse(localStorage.getItem("cashflow_cashlunak") || "[]");
}

export function saveCashLunak(data: CashLunak[]): void {
  try {
    localStorage.setItem("cashflow_cashlunak", JSON.stringify(data));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      throw new Error("Penyimpanan penuh! Hapus dokumen lampiran yang sudah tidak diperlukan untuk mengosongkan ruang, lalu coba lagi.");
    }
    throw e;
  }
}

// ===== Administrasi Keuangan Siswa =====
export type SiswaStatus = "Aktif" | "Tidak Aktif";
export type SiswaKelas = "Kelompok A" | "Kelompok B" | "Kelompok Bermain";
export type AdmSiswaStatus = "Lunas" | "Kurang Bayar" | "Belum Bayar";
export type MetodeBayar = "Tunai" | "Transfer";

export interface DataSiswa {
  id: string;
  nama: string;
  kelas: SiswaKelas;
  tahun_ajaran: string;
  status: SiswaStatus;
  created_at: string;
}

export interface JenisTagihan {
  kode: string;
  nama: string;
  nominal_default: number;
  warna_badge: string;
}

export interface AdmSiswa {
  id: string;
  id_siswa: string;
  nama_siswa: string;
  kelas: string;
  jenis_tagihan: string; // kode
  uraian: string;
  periode_bulan: string; // "01" - "12" or ""
  periode_tahun: string; // "2025" or ""
  tagihan: number;
  jumlah_dibayar: number;
  sisa: number;
  status: AdmSiswaStatus;
  tgl_transaksi: string; // YYYY-MM-DD or ""
  metode_bayar: MetodeBayar | "";
  keterangan: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const DEFAULT_JENIS_TAGIHAN: JenisTagihan[] = [
  { kode: "SPP", nama: "SPP Bulanan", nominal_default: 150000, warna_badge: "primary" },
  { kode: "INFAQ", nama: "Infaq Bulanan", nominal_default: 20000, warna_badge: "success" },
  { kode: "SERAGAM", nama: "Uang Seragam", nominal_default: 350000, warna_badge: "purple" },
  { kode: "IURAN", nama: "Iuran Kegiatan", nominal_default: 50000, warna_badge: "warning" },
  { kode: "MAKAN", nama: "Uang Makan", nominal_default: 100000, warna_badge: "info" },
  { kode: "LAINNYA", nama: "Lainnya", nominal_default: 0, warna_badge: "secondary" },
];

export function getDataSiswa(): DataSiswa[] {
  return JSON.parse(localStorage.getItem("cashflow_datasiswa") || "[]");
}

export function saveDataSiswa(data: DataSiswa[]): void {
  try {
    localStorage.setItem("cashflow_datasiswa", JSON.stringify(data));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      throw new Error("Penyimpanan penuh.");
    }
    throw e;
  }
}

export function getJenisTagihan(): JenisTagihan[] {
  const raw = localStorage.getItem("cashflow_jenistagihan");
  if (!raw) return DEFAULT_JENIS_TAGIHAN;
  try { return JSON.parse(raw); } catch { return DEFAULT_JENIS_TAGIHAN; }
}

export function saveJenisTagihan(data: JenisTagihan[]): void {
  localStorage.setItem("cashflow_jenistagihan", JSON.stringify(data));
}

export function getAdmSiswa(): AdmSiswa[] {
  return JSON.parse(localStorage.getItem("cashflow_admsiswa") || "[]");
}

export function saveAdmSiswa(data: AdmSiswa[]): void {
  try {
    localStorage.setItem("cashflow_admsiswa", JSON.stringify(data));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      throw new Error("Penyimpanan penuh.");
    }
    throw e;
  }
}

export function calcAdmSiswaStatus(tagihan: number, dibayar: number): { sisa: number; status: AdmSiswaStatus } {
  const sisa = Math.max(0, tagihan - dibayar);
  let status: AdmSiswaStatus;
  if (dibayar <= 0) status = "Belum Bayar";
  else if (dibayar >= tagihan) status = "Lunas";
  else status = "Kurang Bayar";
  return { sisa, status };
}

export function calcCashLunak(item: CashLunak) {
  const sisaPokok = Math.max(0, item.harga_unit - item.jumlah_dp);
  const cicilanPerBulan = item.tenor > 0 ? Math.ceil(sisaPokok / item.tenor) : 0;
  const totalCicilanDibayar = (item.cicilan || []).reduce((s, c) => s + c.jumlah_bayar, 0);
  const totalTerbayar = item.jumlah_dp + totalCicilanDibayar;
  const sisaBayar = Math.max(0, item.harga_unit - totalTerbayar);
  const status: "Lunas" | "Belum Lunas" = sisaBayar <= 0 ? "Lunas" : "Belum Lunas";
  const progress = item.harga_unit > 0 ? Math.min(100, (totalTerbayar / item.harga_unit) * 100) : 0;
  return { sisaPokok, cicilanPerBulan, totalCicilanDibayar, totalTerbayar, sisaBayar, status, progress };
}

export function migrateProgresTukang(): void {
  try {
    const raw = localStorage.getItem("cashflow_progrestukang");
    if (!raw) return;
    const data = JSON.parse(raw) as any[];
    if (!Array.isArray(data)) return;
    let changed = false;
    data.forEach((item) => {
      // 1) Move legacy blok[] -> lokasi (only if lokasi not already set)
      if (item.blok !== undefined) {
        if (item.lokasi === undefined || item.lokasi === null || item.lokasi === "") {
          item.lokasi = Array.isArray(item.blok) ? item.blok.join(", ") : String(item.blok);
        }
        // Always strip the deprecated field to keep storage clean
        delete item.blok;
        changed = true;
      }
      if (item.lokasi === undefined || item.lokasi === null) {
        item.lokasi = "";
        changed = true;
      }
      // 2) Strip removed fields
      if (item.id_tukang !== undefined) {
        delete item.id_tukang;
        changed = true;
      }
      if (item.spesialisasi !== undefined) {
        delete item.spesialisasi;
        changed = true;
      }
      // 3) Histori: deskripsi -> blok migration
      if (Array.isArray(item.histori_progres)) {
        item.histori_progres.forEach((h: any) => {
          if (h.deskripsi !== undefined) {
            if (h.blok === undefined || h.blok === null || h.blok === "") {
              h.blok = String(h.deskripsi).substring(0, 150);
            }
            // Always strip legacy field
            delete h.deskripsi;
            changed = true;
          }
          if (h.blok === undefined || h.blok === null) {
            h.blok = "";
            changed = true;
          }
        });
      }
    });
    if (changed) {
      localStorage.setItem("cashflow_progrestukang", JSON.stringify(data));
    }
  } catch {
    // ignore malformed data
  }
}

export function getProgresTukang(): ProgresTukang[] {
  return JSON.parse(localStorage.getItem("cashflow_progrestukang") || "[]");
}

export function saveProgresTukang(data: ProgresTukang[]): void {
  try {
    localStorage.setItem("cashflow_progrestukang", JSON.stringify(data));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      throw new Error("Penyimpanan penuh.");
    }
    throw e;
  }
}

export function calcProgresTukang(item: Pick<ProgresTukang, "total_kontrak" | "histori_progres">): { total_terbayar: number; sisa_progres: number; persen_selesai: number; status: StatusKontrak } {
  const total_terbayar = (item.histori_progres || []).reduce((s, h) => s + (h.nominal || 0), 0);
  const sisa_progres = Math.max(0, item.total_kontrak - total_terbayar);
  const persen_selesai = item.total_kontrak > 0 ? Math.min(100, Math.round((total_terbayar / item.total_kontrak) * 100)) : 0;
  let status: StatusKontrak;
  if (total_terbayar <= 0) status = "Belum Mulai";
  else if (total_terbayar >= item.total_kontrak) status = "Selesai";
  else status = "Berjalan";
  return { total_terbayar, sisa_progres, persen_selesai, status };
}

export function getStorageUsageMB(): string {
  try {
    let total = 0;
    for (const key of Object.keys(localStorage)) {
      total += (localStorage.getItem(key) || "").length * 2;
    }
    return (total / (1024 * 1024)).toFixed(2);
  } catch {
    return "0";
  }
}

// ───────────────────── Import Dokumen Otomatis (Excel/CSV/Word) ─────────────────────
function importsKey(unit: ImportableUnit): string {
  return `cashflow_imports_${unit}`;
}

/** Menghasilkan kunci dedup unik per baris berdasarkan tanggal+keterangan+nominal. */
export function buildImportDedupKey(p: { tanggal: string; keterangan: string; debit: number; kredit: number }): string {
  const k = (p.keterangan || "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${p.tanggal || ""}|${k}|${Math.round(p.debit || 0)}|${Math.round(p.kredit || 0)}`;
}

export function getImportedRows(unit: ImportableUnit): ImportedRow[] {
  return JSON.parse(localStorage.getItem(importsKey(unit)) || "[]");
}

function saveImportedRows(unit: ImportableUnit, rows: ImportedRow[]): void {
  try {
    localStorage.setItem(importsKey(unit), JSON.stringify(rows));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      throw new Error("Penyimpanan penuh! Hapus data import atau nota lain untuk mengosongkan ruang.");
    }
    throw e;
  }
  if (typeof window !== "undefined" && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent(IMPORTS_UPDATED_EVENT, { detail: { unit } }));
  }
}

/** Tambah banyak baris hasil parsing. Otomatis dedupe terhadap entri lama
 * dan terhadap satu sama lain. Mengembalikan jumlah {ditambahkan, dilewati}. */
export function tambahImportedRows(
  unit: ImportableUnit,
  rows: Array<Omit<ImportedRow, "id" | "unit" | "uploaded_at" | "created_by" | "synced" | "synced_at" | "synced_transaksi_id" | "dedup_key">>,
  sourceFile: string,
  createdBy: string = "system"
): { ditambahkan: number; dilewati: number } {
  const existing = getImportedRows(unit);
  const existingKeys = new Set(existing.map(r => r.dedup_key));
  const now = new Date().toISOString();
  let ditambahkan = 0;
  let dilewati = 0;
  const additions: ImportedRow[] = [];
  for (const r of rows) {
    const key = buildImportDedupKey(r);
    if (existingKeys.has(key)) { dilewati++; continue; }
    existingKeys.add(key);
    additions.push({
      id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      unit,
      tanggal: r.tanggal,
      keterangan: r.keterangan,
      kategori: r.kategori || "",
      debit: Number(r.debit) || 0,
      kredit: Number(r.kredit) || 0,
      saldo: Number(r.saldo) || 0,
      catatan: r.catatan || "",
      source_file: sourceFile,
      uploaded_at: now,
      created_by: createdBy,
      synced: false,
      synced_at: null,
      synced_transaksi_id: null,
      dedup_key: key,
    });
    ditambahkan++;
  }
  if (additions.length > 0) {
    saveImportedRows(unit, [...existing, ...additions]);
  }
  return { ditambahkan, dilewati };
}

export function updateImportedRow(
  unit: ImportableUnit,
  id: string,
  patch: Partial<Pick<ImportedRow, "tanggal" | "keterangan" | "kategori" | "debit" | "kredit" | "saldo" | "catatan">>
): ImportedRow | null {
  const list = getImportedRows(unit);
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return null;
  if (list[idx].synced) {
    throw new Error("Baris sudah disinkronkan ke cashflow utama dan tidak bisa diubah lagi. Hapus dulu transaksi turunannya.");
  }
  const next = { ...list[idx], ...patch };
  next.dedup_key = buildImportDedupKey(next);
  list[idx] = next;
  saveImportedRows(unit, list);
  return next;
}

export function hapusImportedRow(unit: ImportableUnit, id: string): boolean {
  const list = getImportedRows(unit);
  const target = list.find(r => r.id === id);
  if (!target) return false;
  saveImportedRows(unit, list.filter(r => r.id !== id));
  return true;
}

export function bulkHapusImportedRow(unit: ImportableUnit, ids: string[]): number {
  const setIds = new Set(ids);
  const list = getImportedRows(unit);
  const next = list.filter(r => !setIds.has(r.id));
  const removed = list.length - next.length;
  if (removed > 0) saveImportedRows(unit, next);
  return removed;
}

/** Sinkronkan satu baris import ke tabel cashflow utama divisi terkait.
 *
 * Idempotent & failure-safe:
 * - Jika baris sudah `synced=true` → noop sukses (kembalikan id transaksi sebelumnya).
 * - Jika ada transaksi di cashflow utama yang sudah berisi marker `[imp:<importId>]`
 *   (misal sisa sync sebelumnya yang gagal di tengah jalan) → tidak insert duplikat,
 *   hanya rapikan state import row.
 * - Tulis flag synced ke import row dulu, baru simpan transaksi. Jika simpan
 *   transaksi gagal, rollback flag synced. Tidak pernah throw ke UI.
 */
export function syncImportedRowToCashflow(
  unit: ImportableUnit,
  id: string
): { ok: boolean; reason?: string; transaksi_id?: string } {
  try {
    const list = getImportedRows(unit);
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return { ok: false, reason: "Baris import tidak ditemukan." };
    const row = list[idx];
    if (row.synced && row.synced_transaksi_id) {
      return { ok: false, reason: "Sudah disinkronkan sebelumnya." };
    }
    if (!row.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(row.tanggal)) {
      return { ok: false, reason: "Tanggal tidak valid (harus format YYYY-MM-DD)." };
    }
    if ((row.debit || 0) <= 0 && (row.kredit || 0) <= 0) {
      return { ok: false, reason: "Nominal debit/kredit harus > 0." };
    }
    if (!row.keterangan || row.keterangan.trim().length < 2) {
      return { ok: false, reason: "Keterangan minimal 2 karakter." };
    }

    const trsList = getTransaksi(unit);
    const importMarker = `[imp:${row.id}]`;
    // Idempotency guard: jika sudah ada transaksi dengan marker import ini, jangan duplikasi.
    const existing = trsList.find(t => (t.keterangan || "").includes(importMarker));
    if (existing) {
      list[idx] = { ...row, synced: true, synced_at: row.synced_at || new Date().toISOString(), synced_transaksi_id: existing.id };
      try { saveImportedRows(unit, list); } catch { /* state cashflow sudah benar */ }
      return { ok: true, transaksi_id: existing.id };
    }

    const newTrxId = generateId();
    const ketBase = row.kategori
      ? `[Import: ${row.source_file}] ${importMarker} ${row.kategori}${row.catatan ? " — " + row.catatan : ""}`
      : `[Import: ${row.source_file}] ${importMarker}${row.catatan ? " " + row.catatan : ""}`;
    const newTransaksi: Transaksi = {
      id: newTrxId,
      tanggal: row.tanggal,
      uraian: row.keterangan.trim(),
      rencana: 0,
      uang_masuk: Number(row.debit) || 0,
      uang_keluar: Number(row.kredit) || 0,
      saldo_akhir: 0,
      keterangan: ketBase,
      nota: null,
    };

    // Step 1: tandai import row synced DULU dengan id transaksi yang akan dibuat.
    // Kalau gagal di sini, belum ada side-effect di cashflow → langsung error.
    const previousState = list[idx];
    list[idx] = { ...row, synced: true, synced_at: new Date().toISOString(), synced_transaksi_id: newTrxId };
    try {
      saveImportedRows(unit, list);
    } catch (e) {
      return { ok: false, reason: (e as Error).message || "Gagal menyimpan status import." };
    }

    // Step 2: simpan transaksi baru ke cashflow utama. Jika gagal → rollback step 1.
    const all = [...trsList, newTransaksi].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const recalced = recalculateSaldo(all, getSaldoAwalDivisi(unit));
    try {
      saveTransaksi(unit, recalced);
    } catch (e) {
      // Rollback flag synced di import row.
      list[idx] = previousState;
      try { saveImportedRows(unit, list); } catch { /* swallow — state mungkin tidak konsisten tapi cashflow utama belum diubah */ }
      return { ok: false, reason: (e as Error).message || "Gagal menyimpan transaksi ke cashflow utama." };
    }

    return { ok: true, transaksi_id: newTrxId };
  } catch (e) {
    return { ok: false, reason: (e as Error)?.message || "Gagal sinkronisasi (error tak terduga)." };
  }
}

export function bulkSyncImportedRowsToCashflow(
  unit: ImportableUnit,
  ids: string[]
): { berhasil: number; gagal: number; errors: { id: string; reason: string }[] } {
  let berhasil = 0;
  let gagal = 0;
  const errors: { id: string; reason: string }[] = [];
  for (const id of ids) {
    let res: { ok: boolean; reason?: string; transaksi_id?: string };
    try {
      res = syncImportedRowToCashflow(unit, id);
    } catch (e) {
      res = { ok: false, reason: (e as Error)?.message || "Gagal sinkronisasi (error tak terduga)." };
    }
    if (res.ok) berhasil++;
    else { gagal++; errors.push({ id, reason: res.reason || "Unknown" }); }
  }
  return { berhasil, gagal, errors };
}
