# Cashflow Pro — Aplikasi Manajemen Keuangan Multi-Divisi

Aplikasi manajemen cashflow untuk perusahaan multi-divisi (Bakso Bento, UD Amanah, Batu Alam, Toko Kembang, Perumahan, TK Yaris).

---

## Persyaratan Sistem

| Komponen | Versi Minimum |
|----------|--------------|
| Node.js  | 18.x atau lebih baru |
| MySQL    | 5.7+ / MariaDB 10.3+ |
| NPM      | 9.x atau lebih baru |

---

## Cara Setup (Lokal / XAMPP)

### 1. Install Dependensi

```bash
npm install
```

### 2. Siapkan Database MySQL

**Menggunakan phpMyAdmin (XAMPP) — cara paling mudah:**
1. Buka `http://localhost/phpmyadmin`
2. Klik tab **Import** di halaman utama (jangan pilih database dulu)
3. Klik **Choose File** → pilih file `cashflow_perusahaan.sql`
4. Klik **Go / Kirim**
5. Database `cashflow_perusahaan` akan otomatis dibuat dan terisi data demo

**Menggunakan terminal:**
```bash
mysql -u root -p < cashflow_perusahaan.sql
```

### 3. Konfigurasi `.env`

Edit file `.env` di root project:

```env
DATABASE_URL="mysql://root:@localhost:3306/cashflow_perusahaan"
API_PORT=3001
NODE_ENV=development
```

> Ganti `root:` dengan `username:password` MySQL Anda jika berbeda dari default XAMPP.

### 4. Jalankan Aplikasi

```bash
npm run dev
```

Buka browser: **`http://localhost:5173`**

---

## Akun Default

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Administrator (akses penuh) |
| `owner` | `owner123` | Owner (lihat semua + CRUD cashflow) |
| `staff_bakso` | `staff123` | Staff Bakso Bento |
| `staff_amanah` | `staff123` | Staff UD Amanah |
| `staff_batualam` | `staff123` | Staff Batu Alam |
| `staff_kembang` | `staff123` | Staff Toko Kembang |
| `staff_perumahan` | `staff123` | Staff Perumahan |
| `staff_tkyaris` | `staff123` | Staff TK Yaris |

> **Penting:** Ganti password default segera setelah pertama kali login melalui menu **Pengaturan → Manajemen Pengguna**.

---

## Struktur Aplikasi

```
cashflow-app-source/
├── src/                    # Frontend (React + TypeScript + Vite)
│   ├── pages/              # Halaman-halaman utama
│   ├── components/         # Komponen UI
│   ├── contexts/           # AuthContext (login/session)
│   └── lib/
│       ├── storage.ts      # CRUD localStorage
│       ├── dbSync.ts       # Sinkronisasi localStorage ↔ MySQL
│       └── exportUtils.ts  # Export PDF / Excel
├── server/                 # Backend (Express + TypeScript)
│   ├── index.ts            # API server (port 3001)
│   └── handlers.ts         # Handler CRUD semua entitas
├── prisma/
│   ├── schema.prisma       # Skema database
│   ├── seed.ts             # Data awal
│   └── migrations/         # File migrasi SQL
└── .env                    # Konfigurasi environment
```

---

## Fitur Utama

- **Dashboard** — ringkasan total saldo perusahaan, grafik per divisi
- **Cashflow per Divisi** — CRUD transaksi, filter bulan/tahun, upload nota (base64), export PDF/Excel/Word
- **Import Dokumen** — import data dari file Excel/CSV/Word (khusus UD Amanah & Batu Alam)
- **Data Akad** — tracking akad KPR divisi Perumahan
- **Cash Lunak** — manajemen cicilan cash lunak + histori pembayaran
- **Progres Tukang** — tracking progress dan pembayaran tukang
- **Adm. Keuangan Siswa** — administrasi SPP, infaq, dan tagihan TK Yaris
- **Laporan** — laporan bulanan/tahunan semua divisi, grafik, export
- **Pengaturan** — manajemen pengguna dan hak akses per role

---

## Arsitektur Data

Aplikasi menggunakan **localStorage-first dengan write-through sync ke MySQL**:

1. Data dibaca/tulis ke **localStorage** (instant, offline-capable)
2. Setiap perubahan otomatis disinkronkan ke **MySQL** melalui API
3. Saat pertama kali login, data dari MySQL di-hydrate ke localStorage
4. Jika server mati, aplikasi tetap berjalan dengan data localStorage

---

## Deploy ke cPanel Hosting

### 1. Upload Source Code

Upload seluruh isi folder ke direktori Node.js di cPanel (atau subfolder `public_html`).

### 2. Konfigurasi `.env` di Server

```env
DATABASE_URL="mysql://USERNAME:PASSWORD@localhost:3306/NAMA_DATABASE"
API_PORT=3001
NODE_ENV=production
```

> Di cPanel, `host` biasanya `localhost` dan kredensial sesuai database yang dibuat di **MySQL Databases**.

### 3. Install & Migrate

Melalui terminal cPanel atau SSH:

```bash
npm install
npm run build
```

> Import `cashflow_perusahaan.sql` ke database MySQL di cPanel terlebih dahulu.

### 4. Jalankan Server

```bash
npm run server:prod
```

Atau gunakan **Node.js App** di cPanel dan arahkan ke file `server/index.ts` (atau `dist/server/index.js` setelah build server).

---

## Perintah NPM

| Perintah | Keterangan |
|----------|-----------|
| `npm run dev` | Jalankan frontend (5173) + backend (3001) bersamaan |
| `npm run server` | Jalankan backend saja |
| `npm run build` | Build frontend ke `dist/public/` |
| `npm run typecheck` | Cek TypeScript tanpa build |

> **Database**: Setup dilakukan dengan import `cashflow_perusahaan.sql` ke phpMyAdmin/MySQL — tidak perlu perintah migrate/seed terpisah.

---

## Troubleshooting

### "Koneksi database gagal" saat startup

- Pastikan MySQL berjalan
- Cek `DATABASE_URL` di `.env` — format: `mysql://user:pass@host:3306/dbname`
- Coba koneksi manual: `mysql -u root -p cashflow_db`

### Login selalu gagal

- Pastikan seed sudah dijalankan: `npm run prisma:seed`
- Cek apakah tabel `User` ada dan terisi di phpMyAdmin
- Coba reset database: `npx prisma migrate reset` (⚠️ hapus semua data)

### "Session tidak valid" setelah server restart

- Token session disimpan di memory server — hilang saat server restart
- Cukup login ulang — ini adalah perilaku normal

### Data tidak tersimpan ke database

- Pastikan sudah login (token diperlukan untuk write ke DB)
- Cek log terminal server untuk error Prisma
- Cek `DATABASE_URL` sudah benar

### Build gagal / TypeScript error

```bash
npm run typecheck
```

---

## Keamanan

- Password di-hash menggunakan **bcrypt** (10 rounds)
- API endpoint data (`PUT /api/data/:key`) memerlukan **session token** dari header `Authorization: Bearer <token>`
- Token session berlaku **8 jam** sejak login
- Hak akses dikontrol per role per halaman (CRUD / VIEW / NONE)

---

## Catatan Teknis

- Data gambar/dokumen (nota, foto tukang, dokumen cash lunak) disimpan sebagai **base64** di database — tidak ada folder uploads
- Tabel `ImportedRow` menyimpan data import dokumen sebelum disinkronkan ke cashflow utama
- TK Yaris memiliki saldo awal khusus = total pembayaran Adm. Siswa + entri saldo manual
- Total saldo perusahaan di dashboard **tidak termasuk** TK Yaris (dipisah)
