# Laporan Audit Aplikasi Cashflow Perusahaan Multi-Divisi

> Tanggal audit: 2026-05-05

---

## 1. Struktur Project

```
cashflow-app-source/
├── .env                         # DATABASE_URL + API_PORT
├── index.html                   # Entry HTML
├── vite.config.ts               # Vite + proxy /api → localhost:3001
├── tsconfig.json / tsconfig.server.json
├── package.json
├── components.json              # shadcn/ui config
├── prisma/
│   ├── schema.prisma            # Prisma MySQL schema (17 model)
│   ├── seed.ts                  # Data awal 8 user, 6 divisi, hak akses
│   └── migrations/20260504.../migration.sql
├── server/
│   ├── index.ts                 # Express backend (port 3001)
│   ├── handlers.ts              # CRUD semua entitas via Prisma
│   └── prisma.ts                # Singleton PrismaClient
├── src/
│   ├── App.tsx                  # Router wouter + AuthProvider
│   ├── main.tsx
│   ├── index.css
│   ├── contexts/
│   │   └── AuthContext.tsx      # ⚠️ BUG CRITICAL — login pakai api.ts yang salah
│   ├── lib/
│   │   ├── storage.ts           # localStorage CRUD layer (sangat lengkap)
│   │   ├── dbSync.ts            # Write-through sync localStorage → DB
│   │   ├── exportUtils.ts       # PDF/Excel/Word export
│   │   └── importParser.ts
│   ├── services/
│   │   └── api.ts               # ⚠️ DEAD CODE — mengarah ke port 8000 (Laravel lama)
│   ├── pages/                   # 9 halaman utama (TSX)
│   └── components/
│       ├── AppLayout.tsx
│       ├── ImportDokumenModal.tsx
│       └── ui/                  # 40+ komponen shadcn/ui
├── backend/                     # Laravel sisa (TIDAK DIPAKAI dalam deployment ini)
└── dist/public/                 # Build output
```

---

## 2. Stack Teknologi yang Terdeteksi

- **Frontend**: React 18 + Vite 5 + TypeScript + Tailwind CSS v4 + shadcn/ui + wouter (routing) + TanStack Query + recharts
- **Backend**: Express.js + TypeScript (server/index.ts, port 3001)
- **Database**: MySQL via **Prisma ORM** (bukan PHP/PDO)
- **Arsitektur data**: localStorage-first + write-through sync ke DB via dbSync.ts
- **File `backend/`**: Laravel PHP — **tidak digunakan** dalam stack ini, dapat diabaikan

---

## 3. File yang Ditemukan (non-vendor)

| Path | Keterangan |
|------|-----------|
| `server/index.ts` | Backend Express — login, sync, data CRUD |
| `server/handlers.ts` | 19 fungsi DB (transaksi, users, siswa, dll) |
| `prisma/schema.prisma` | 17 model Prisma |
| `prisma/seed.ts` | Seed 8 user, 6 divisi, hak akses, jenis tagihan |
| `src/lib/storage.ts` | ~1200 baris — CRUD localStorage untuk semua entitas |
| `src/lib/dbSync.ts` | Sync localStorage → Express API |
| `src/contexts/AuthContext.tsx` | **Auth context — ADA BUG CRITICAL** |
| `src/services/api.ts` | **DEAD CODE** — mengarah ke Laravel yang tidak ada |
| `src/pages/*.tsx` | 9 halaman (Dashboard, Divisi, Laporan, dll) |

---

## 4. Daftar Bug & Error Teridentifikasi

### 🔴 CRITICAL (aplikasi tidak bisa dijalankan)

#### BUG-001: Login menggunakan service API yang salah
- **File**: [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx#L34)
- **Masalah**: `AuthContext.tsx` memanggil `api.login()` dari `src/services/api.ts`
- **Root cause**: `src/services/api.ts` mengarah ke `http://localhost:8000/api` (sisa kode Laravel lama). Backend aktual adalah Express di port **3001** dengan endpoint `/api/auth/login` — bukan `/login` di port 8000.
- **Dampak**: **Login tidak pernah berhasil.** App tidak bisa digunakan.
- **Fix**: Ganti `api.login()` dengan `fetch('/api/auth/login', ...)` langsung.

#### BUG-002: LoginPage tidak await hasil login
- **File**: [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx#L22)
- **Masalah**: `const result = login(username, password)` — tidak ada `await`. Fungsi `login` adalah `async`, jadi `result` adalah sebuah `Promise`, bukan `{ success, error }`.
- **Dampak**: `result.success` selalu `undefined`, sehingga `!result.success` selalu `true` → **halaman login selalu menampilkan "Login gagal." bahkan jika login sebenarnya berhasil.**
- **Fix**: Tambah `await` → `const result = await login(username, password)`.

#### BUG-003: AuthContextType salah mendefinisikan return type login
- **File**: [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx#L8)
- **Masalah**: Interface mendefinisikan `login: (...) => { success: boolean; error?: string }` (sync), padahal implementasinya `async` (returns `Promise`).
- **Dampak**: TypeScript tidak akan catch BUG-002 karena type mismatch ini menyembunyikan async nature.
- **Fix**: Ubah type menjadi `login: (...) => Promise<{ success: boolean; error?: string }>`.

---

### 🟠 HIGH (keamanan/fungsionalitas penting)

#### BUG-004: Server mengembalikan password dalam login response
- **File**: [server/index.ts](server/index.ts#L71)
- **Masalah**: Response login menyertakan `password: user.password_hash` — mengirim credential ke client.
- **Dampak**: Password ter-expose di browser DevTools → Network tab.
- **Fix**: Hapus field `password` dari response object.

#### BUG-005: Tidak ada auth check pada PUT /api/data/:key
- **File**: [server/index.ts](server/index.ts#L38)
- **Masalah**: Endpoint `PUT /api/data/:key` dapat dipanggil siapapun tanpa autentikasi. Tidak ada session token validation.
- **Dampak**: Siapapun bisa overwrite data (users, transaksi, dll) dari luar.
- **Catatan**: Karena app tidak menggunakan token-based auth saat ini, fix minimal adalah IP whitelist atau CORS restrict. Full fix memerlukan implementasi session token.

#### BUG-006: Route /data-akad dan /divisi/:divisi tidak ada access control
- **File**: [src/App.tsx](src/App.tsx#L61) dan [src/App.tsx](src/App.tsx#L70)
- **Masalah**: Route `/data-akad` dan `/divisi/:divisi` tidak memanggil `hasAccess()` seperti halaman lain.
- **Dampak**: Staff yang seharusnya tidak punya akses bisa mengakses halaman ini via URL langsung.
- **Fix**: Tambah `hasAccess` check konsisten dengan halaman lain.

---

### 🟡 MEDIUM

#### BUG-007: Password disimpan sebagai plaintext (bukan hash)
- **File**: [prisma/seed.ts](prisma/seed.ts#L29), [server/index.ts](server/index.ts#L61)
- **Masalah**: `password_hash: "admin123"` — plaintext. Kolom bernama `password_hash` tapi isinya bukan hash.
- **Dampak**: Jika database bocor, semua password langsung terbaca.
- **Catatan**: Untuk perbaikan lengkap perlu implementasi bcrypt (tidak diubah sekarang karena butuh migrasi data seed).

#### BUG-008: CORS terlalu permisif di server
- **File**: [server/index.ts](server/index.ts#L17)
- **Masalah**: `cors({ origin: true, credentials: true })` — menerima request dari semua origin.
- **Fix production**: Batasi ke domain spesifik.

---

### 🔵 LOW / INFORMASI

#### BUG-009: src/services/api.ts adalah dead code
- File ini menargetkan `http://localhost:8000/api` (Laravel). Tidak relevan dengan stack aktual.
- Tidak digunakan di bagian lain kecuali `AuthContext.tsx` (yang setelah fix tidak akan pakai lagi).
- **Rekomendasi**: Hapus file ini setelah fix BUG-001.

#### INFO-001: Tabel Transaction menggunakan DOUBLE bukan DECIMAL untuk uang
- **File**: [prisma/migrations/.../migration.sql](prisma/migrations/20260504000000_mysql_init/migration.sql#L48)
- `uang_masuk DOUBLE` — floating point, bisa ada error presisi untuk nilai sangat besar.
- Dalam praktik cashflow IDR dengan nilai di bawah miliaran, ini tidak bermasalah secara material.

#### INFO-002: Kolom tanggal menggunakan VARCHAR bukan DATE/DATETIME
- Banyak kolom tanggal disimpan sebagai `VARCHAR` (`tanggal_akad`, `created_at`, dll).
- Ini disengaja karena frontend menyimpan tanggal sebagai string ISO.
- Fungsional, tapi tidak optimal untuk query sorting/filtering berbasis tanggal di DB.

---

## 5. File yang Hilang / Belum Ada

| File | Status |
|------|--------|
| `CLAUDE.md` | Tidak ada — opsional |
| `.env.production` | Tidak ada — perlu untuk deployment |
| `uploads/` folder | Tidak ada — dokumen disimpan sebagai base64 di DB (by design) |

---

## 6. Inkonsistensi Database vs Frontend

| Entitas | Frontend Field | DB Field | Status |
|---------|---------------|----------|--------|
| User | `namaLengkap` | `nama_lengkap` | ✅ Ditangani di handlers.ts |
| User | `password` | `password_hash` | ✅ Ditangani di handlers.ts |
| Transaction | `nota` (object) | `nota_nama`, `nota_tipe`, `nota_data` | ✅ Ditangani di handlers.ts |
| CashLunak | `dokumen` (object) | `dokumen_nama`, `dokumen_tipe`, `dokumen_data` | ✅ Ditangani di handlers.ts |
| ProgresTukang | `histori_progres` | `histori` (relasi) | ✅ Ditangani di handlers.ts |

Semua inkonsistensi penamaan sudah ditangani di `server/handlers.ts` — mapping dilakukan saat baca/tulis.

---

## 7. Ringkasan

| Severity | Jumlah | Status |
|----------|--------|--------|
| 🔴 CRITICAL | 3 | Akan diperbaiki |
| 🟠 HIGH | 3 | 2 akan diperbaiki, 1 memerlukan arsitektur session token |
| 🟡 MEDIUM | 2 | Dicatat, fix partial |
| 🔵 LOW/INFO | 3 | Dicatat |

**Penyebab utama app tidak bisa dijalankan**: BUG-001 + BUG-002 + BUG-003 (login flow yang benar-benar rusak). Setelah ketiga bug ini diperbaiki, app bisa login dan berfungsi normal.
