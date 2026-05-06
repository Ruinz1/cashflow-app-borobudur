import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;

async function main() {
  console.log("🌱 Mulai seeding database...");

  // ── Divisions ───────────────────────────────────────────────
  const divisions = [
    { id: "bakso", nama_divisi: "Bakso Bento Malang", kode_divisi: "bakso", color: "#3b82f6" },
    { id: "amanah", nama_divisi: "Toko UD Amanah", kode_divisi: "amanah", color: "#10b981" },
    { id: "batualam", nama_divisi: "Toko Batu Alam", kode_divisi: "batualam", color: "#f59e0b" },
    { id: "kembang", nama_divisi: "Toko Kembang", kode_divisi: "kembang", color: "#ec4899" },
    { id: "perumahan", nama_divisi: "Divisi Perumahan", kode_divisi: "perumahan", color: "#8b5cf6" },
    { id: "tkyaris", nama_divisi: "TK Yaris", kode_divisi: "tkyaris", color: "#4527a0" },
  ];

  for (const d of divisions) {
    await prisma.division.upsert({
      where: { id: d.id },
      update: {},
      create: d,
    });
  }
  console.log(`  ✓ ${divisions.length} divisi`);

  // ── Users (password di-hash dengan bcrypt) ───────────────────
  const rawUsers = [
    { id: "1", username: "admin",           password: "admin123",  nama_lengkap: "Administrator",     role: "admin",           status: "aktif" },
    { id: "2", username: "owner",           password: "owner123",  nama_lengkap: "Owner",             role: "owner",           status: "aktif" },
    { id: "3", username: "staff_bakso",     password: "staff123",  nama_lengkap: "Staff Bakso Bento", role: "staff_bakso",     status: "aktif" },
    { id: "4", username: "staff_amanah",    password: "staff123",  nama_lengkap: "Staff UD Amanah",   role: "staff_amanah",    status: "aktif" },
    { id: "5", username: "staff_batualam",  password: "staff123",  nama_lengkap: "Staff Batu Alam",   role: "staff_batualam",  status: "aktif" },
    { id: "6", username: "staff_kembang",   password: "staff123",  nama_lengkap: "Staff Toko Kembang",role: "staff_kembang",   status: "aktif" },
    { id: "7", username: "staff_perumahan", password: "staff123",  nama_lengkap: "Staff Perumahan",   role: "staff_perumahan", status: "aktif" },
    { id: "8", username: "staff_tkyaris",   password: "staff123",  nama_lengkap: "Staff TK Yaris",    role: "staff_tkyaris",   status: "aktif" },
  ];

  for (const u of rawUsers) {
    const password_hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { password_hash, nama_lengkap: u.nama_lengkap, role: u.role, status: u.status },
      create: { id: u.id, username: u.username, password_hash, nama_lengkap: u.nama_lengkap, role: u.role, status: u.status },
    });
  }
  console.log(`  ✓ ${rawUsers.length} pengguna (password di-hash bcrypt)`);

  // ── Hak Akses ─────────────────────────────────────────────────
  const hakAksesData: { role: string; halaman: string; level: string }[] = [
    // owner
    { role: "owner", halaman: "dashboard",     level: "VIEW" },
    { role: "owner", halaman: "bakso",         level: "CRUD" },
    { role: "owner", halaman: "amanah",        level: "CRUD" },
    { role: "owner", halaman: "batualam",      level: "CRUD" },
    { role: "owner", halaman: "kembang",       level: "CRUD" },
    { role: "owner", halaman: "perumahan",     level: "CRUD" },
    { role: "owner", halaman: "tkyaris",       level: "CRUD" },
    { role: "owner", halaman: "akad",          level: "VIEW" },
    { role: "owner", halaman: "cashlunak",     level: "VIEW" },
    { role: "owner", halaman: "admsiswa",      level: "VIEW" },
    { role: "owner", halaman: "progrestukang", level: "VIEW" },
    { role: "owner", halaman: "laporan",       level: "VIEW" },
    { role: "owner", halaman: "pengaturan",    level: "NONE" },
    // admin
    { role: "admin", halaman: "dashboard",     level: "VIEW" },
    { role: "admin", halaman: "bakso",         level: "CRUD" },
    { role: "admin", halaman: "amanah",        level: "CRUD" },
    { role: "admin", halaman: "batualam",      level: "CRUD" },
    { role: "admin", halaman: "kembang",       level: "CRUD" },
    { role: "admin", halaman: "perumahan",     level: "CRUD" },
    { role: "admin", halaman: "tkyaris",       level: "CRUD" },
    { role: "admin", halaman: "akad",          level: "CRUD" },
    { role: "admin", halaman: "cashlunak",     level: "CRUD" },
    { role: "admin", halaman: "admsiswa",      level: "CRUD" },
    { role: "admin", halaman: "progrestukang", level: "CRUD" },
    { role: "admin", halaman: "laporan",       level: "VIEW" },
    { role: "admin", halaman: "pengaturan",    level: "CRUD" },
    // staff_bakso
    { role: "staff_bakso", halaman: "dashboard",     level: "VIEW" },
    { role: "staff_bakso", halaman: "bakso",         level: "CRUD" },
    { role: "staff_bakso", halaman: "amanah",        level: "NONE" },
    { role: "staff_bakso", halaman: "batualam",      level: "NONE" },
    { role: "staff_bakso", halaman: "kembang",       level: "NONE" },
    { role: "staff_bakso", halaman: "perumahan",     level: "NONE" },
    { role: "staff_bakso", halaman: "tkyaris",       level: "NONE" },
    { role: "staff_bakso", halaman: "akad",          level: "NONE" },
    { role: "staff_bakso", halaman: "cashlunak",     level: "NONE" },
    { role: "staff_bakso", halaman: "admsiswa",      level: "NONE" },
    { role: "staff_bakso", halaman: "progrestukang", level: "NONE" },
    { role: "staff_bakso", halaman: "laporan",       level: "NONE" },
    { role: "staff_bakso", halaman: "pengaturan",    level: "NONE" },
    // staff_amanah
    { role: "staff_amanah", halaman: "dashboard",     level: "VIEW" },
    { role: "staff_amanah", halaman: "bakso",         level: "NONE" },
    { role: "staff_amanah", halaman: "amanah",        level: "CRUD" },
    { role: "staff_amanah", halaman: "batualam",      level: "NONE" },
    { role: "staff_amanah", halaman: "kembang",       level: "NONE" },
    { role: "staff_amanah", halaman: "perumahan",     level: "NONE" },
    { role: "staff_amanah", halaman: "tkyaris",       level: "NONE" },
    { role: "staff_amanah", halaman: "akad",          level: "NONE" },
    { role: "staff_amanah", halaman: "cashlunak",     level: "NONE" },
    { role: "staff_amanah", halaman: "admsiswa",      level: "NONE" },
    { role: "staff_amanah", halaman: "progrestukang", level: "NONE" },
    { role: "staff_amanah", halaman: "laporan",       level: "NONE" },
    { role: "staff_amanah", halaman: "pengaturan",    level: "NONE" },
    // staff_batualam
    { role: "staff_batualam", halaman: "dashboard",     level: "VIEW" },
    { role: "staff_batualam", halaman: "bakso",         level: "NONE" },
    { role: "staff_batualam", halaman: "amanah",        level: "NONE" },
    { role: "staff_batualam", halaman: "batualam",      level: "CRUD" },
    { role: "staff_batualam", halaman: "kembang",       level: "NONE" },
    { role: "staff_batualam", halaman: "perumahan",     level: "NONE" },
    { role: "staff_batualam", halaman: "tkyaris",       level: "NONE" },
    { role: "staff_batualam", halaman: "akad",          level: "NONE" },
    { role: "staff_batualam", halaman: "cashlunak",     level: "NONE" },
    { role: "staff_batualam", halaman: "admsiswa",      level: "NONE" },
    { role: "staff_batualam", halaman: "progrestukang", level: "NONE" },
    { role: "staff_batualam", halaman: "laporan",       level: "NONE" },
    { role: "staff_batualam", halaman: "pengaturan",    level: "NONE" },
    // staff_kembang
    { role: "staff_kembang", halaman: "dashboard",     level: "VIEW" },
    { role: "staff_kembang", halaman: "bakso",         level: "NONE" },
    { role: "staff_kembang", halaman: "amanah",        level: "NONE" },
    { role: "staff_kembang", halaman: "batualam",      level: "NONE" },
    { role: "staff_kembang", halaman: "kembang",       level: "CRUD" },
    { role: "staff_kembang", halaman: "perumahan",     level: "NONE" },
    { role: "staff_kembang", halaman: "tkyaris",       level: "NONE" },
    { role: "staff_kembang", halaman: "akad",          level: "NONE" },
    { role: "staff_kembang", halaman: "cashlunak",     level: "NONE" },
    { role: "staff_kembang", halaman: "admsiswa",      level: "NONE" },
    { role: "staff_kembang", halaman: "progrestukang", level: "NONE" },
    { role: "staff_kembang", halaman: "laporan",       level: "NONE" },
    { role: "staff_kembang", halaman: "pengaturan",    level: "NONE" },
    // staff_perumahan
    { role: "staff_perumahan", halaman: "dashboard",     level: "VIEW" },
    { role: "staff_perumahan", halaman: "bakso",         level: "NONE" },
    { role: "staff_perumahan", halaman: "amanah",        level: "NONE" },
    { role: "staff_perumahan", halaman: "batualam",      level: "NONE" },
    { role: "staff_perumahan", halaman: "kembang",       level: "NONE" },
    { role: "staff_perumahan", halaman: "perumahan",     level: "CRUD" },
    { role: "staff_perumahan", halaman: "tkyaris",       level: "NONE" },
    { role: "staff_perumahan", halaman: "akad",          level: "CRUD" },
    { role: "staff_perumahan", halaman: "cashlunak",     level: "CRUD" },
    { role: "staff_perumahan", halaman: "admsiswa",      level: "NONE" },
    { role: "staff_perumahan", halaman: "progrestukang", level: "CRUD" },
    { role: "staff_perumahan", halaman: "laporan",       level: "NONE" },
    { role: "staff_perumahan", halaman: "pengaturan",    level: "NONE" },
    // staff_tkyaris
    { role: "staff_tkyaris", halaman: "dashboard",     level: "VIEW" },
    { role: "staff_tkyaris", halaman: "bakso",         level: "NONE" },
    { role: "staff_tkyaris", halaman: "amanah",        level: "NONE" },
    { role: "staff_tkyaris", halaman: "batualam",      level: "NONE" },
    { role: "staff_tkyaris", halaman: "kembang",       level: "NONE" },
    { role: "staff_tkyaris", halaman: "perumahan",     level: "NONE" },
    { role: "staff_tkyaris", halaman: "tkyaris",       level: "CRUD" },
    { role: "staff_tkyaris", halaman: "akad",          level: "NONE" },
    { role: "staff_tkyaris", halaman: "cashlunak",     level: "NONE" },
    { role: "staff_tkyaris", halaman: "admsiswa",      level: "CRUD" },
    { role: "staff_tkyaris", halaman: "progrestukang", level: "NONE" },
    { role: "staff_tkyaris", halaman: "laporan",       level: "NONE" },
    { role: "staff_tkyaris", halaman: "pengaturan",    level: "NONE" },
  ];

  for (const row of hakAksesData) {
    await prisma.hakAkses.upsert({
      where: { role_halaman: { role: row.role, halaman: row.halaman } },
      update: { level: row.level },
      create: row,
    });
  }
  console.log(`  ✓ ${hakAksesData.length} hak akses`);

  // ── Jenis Tagihan ─────────────────────────────────────────────
  const jenisTagihan = [
    { kode: "SPP",     nama: "SPP Bulanan",    nominal_default: 150000, warna_badge: "primary"   },
    { kode: "INFAQ",   nama: "Infaq Bulanan",  nominal_default: 20000,  warna_badge: "success"   },
    { kode: "SERAGAM", nama: "Uang Seragam",   nominal_default: 350000, warna_badge: "purple"    },
    { kode: "IURAN",   nama: "Iuran Kegiatan", nominal_default: 50000,  warna_badge: "warning"   },
    { kode: "MAKAN",   nama: "Uang Makan",     nominal_default: 100000, warna_badge: "info"      },
    { kode: "LAINNYA", nama: "Lainnya",         nominal_default: 0,      warna_badge: "secondary" },
  ];

  for (const j of jenisTagihan) {
    await prisma.jenisTagihan.upsert({
      where: { kode: j.kode },
      update: {},
      create: j,
    });
  }
  console.log(`  ✓ ${jenisTagihan.length} jenis tagihan`);

  // ── Kategori Cashflow ─────────────────────────────────────────
  const categories = [
    { id: "cat-income-umum",       nama_kategori: "Pendapatan Umum",     tipe: "income"  },
    { id: "cat-income-penjualan",  nama_kategori: "Penjualan",           tipe: "income"  },
    { id: "cat-income-jasa",       nama_kategori: "Jasa",                tipe: "income"  },
    { id: "cat-expense-operasional", nama_kategori: "Operasional",       tipe: "expense" },
    { id: "cat-expense-gaji",      nama_kategori: "Gaji/Upah",           tipe: "expense" },
    { id: "cat-expense-bahan",     nama_kategori: "Bahan Baku",          tipe: "expense" },
    { id: "cat-expense-sewa",      nama_kategori: "Sewa",                tipe: "expense" },
    { id: "cat-expense-lainnya",   nama_kategori: "Pengeluaran Lainnya", tipe: "expense" },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }
  console.log(`  ✓ ${categories.length} kategori`);

  // ── Saldo Awal Divisi ─────────────────────────────────────────
  const divisiKeys = ["bakso", "amanah", "batualam", "kembang", "perumahan"];
  for (const k of divisiKeys) {
    await prisma.saldoAwalDivisi.upsert({
      where: { division_id: k },
      update: {},
      create: { division_id: k, nominal: 0 },
    });
  }
  console.log("  ✓ saldo awal 5 divisi");

  console.log("✅ Seeding selesai!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
