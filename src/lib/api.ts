/**
 * api.ts — Central API client untuk semua operasi data
 *
 * Menggantikan localStorage reads/writes di storage.ts.
 * Semua data disimpan di MySQL via Laravel backend.
 *
 * Base URL ditetapkan via environment variable VITE_API_URL
 * (default: /api untuk proxy vite, atau URL absolut di produksi).
 */

import type {
  User, Transaksi, SaldoAwal, DataAkad, CashLunak, Cicilan,
  DataSiswa, JenisTagihan, AdmSiswa, ProgresTukang, HistoriProgres,
  SaldoManualEntry, ImportedRow, ImportableUnit, HakAkses, DivisiKey,
  NotaItem,
} from './types';

// ─── Config ─────────────────────────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';

// ─── Token helper ────────────────────────────────────────────────────────────
function getToken(): string | null {
  return sessionStorage.getItem('cashflow_token');
}

// ─── Fetch helper ────────────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!resp.ok) {
    let errMsg = `HTTP ${resp.status}`;
    try {
      const err = await resp.json();
      errMsg = err.message || err.error || errMsg;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  // 204 No Content
  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<{ ok: boolean; token: string; user: { id: string; namaLengkap: string; username: string; role: string; status: string } }>(
      '/login', { method: 'POST', body: JSON.stringify({ username, password }) }
    ),
  logout: () => apiFetch('/logout', { method: 'POST' }),
  me: ()    => apiFetch<{ id: string; namaLengkap: string; username: string; role: string; status: string }>('/me'),
};

// ─── Hak Akses ────────────────────────────────────────────────────────────────
export const hakAksesApi = {
  get: () => apiFetch<HakAkses>('/hak-akses'),
  update: (data: HakAkses) =>
    apiFetch<{ message: string }>('/hak-akses', { method: 'PUT', body: JSON.stringify(data) }),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => apiFetch<User[]>('/users'),
  create: (data: Omit<User, 'id'> & { password: string }) =>
    apiFetch<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<User> & { password?: string }) =>
    apiFetch<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),
};

// ─── Saldo Awal ──────────────────────────────────────────────────────────────
export const saldoAwalApi = {
  get: () => apiFetch<Record<DivisiKey, number>>('/saldo-awal'),
  update: (divisi: DivisiKey, nominal: number) =>
    apiFetch<{ kode_divisi: string; nominal: number }>(
      `/saldo-awal/${divisi}`, { method: 'PUT', body: JSON.stringify({ nominal }) }
    ),
};

// ─── Transaksi Cashflow ───────────────────────────────────────────────────────
export const transaksiApi = {
  list: (divisi: DivisiKey, params?: { month?: number; year?: number }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return apiFetch<Transaksi[]>(`/transactions/${divisi}${qs}`);
  },
  create: (divisi: DivisiKey, data: Omit<Transaksi, 'id' | 'saldo_akhir'>) =>
    apiFetch<Transaksi>(`/transactions/${divisi}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (divisi: DivisiKey, id: string, data: Omit<Transaksi, 'id' | 'saldo_akhir'>) =>
    apiFetch<Transaksi>(`/transactions/${divisi}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  show: (divisi: DivisiKey, id: string) => apiFetch<Transaksi>(`/transactions/${divisi}/${id}`),
  delete: (divisi: DivisiKey, id: string) =>
    apiFetch<{ message: string }>(`/transactions/${divisi}/${id}`, { method: 'DELETE' }),
  getNota: (id: string) => apiFetch<NotaItem>(`/transactions/nota/${id}`),
};

// ─── Data Akad ───────────────────────────────────────────────────────────────
export const dataAkadApi = {
  list: () => apiFetch<DataAkad[]>('/data-akad'),
  create: (data: Omit<DataAkad, 'id' | 'created_at' | 'updated_at' | 'created_by'>) =>
    apiFetch<DataAkad>('/data-akad', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<DataAkad>) =>
    apiFetch<DataAkad>(`/data-akad/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/data-akad/${id}`, { method: 'DELETE' }),
};

// ─── Cash Lunak ──────────────────────────────────────────────────────────────
export const cashLunakApi = {
  list: () => apiFetch<CashLunak[]>('/cash-lunak'),
  create: (data: Omit<CashLunak, 'id' | 'cicilan' | 'created_at' | 'updated_at'>) =>
    apiFetch<CashLunak>('/cash-lunak', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CashLunak>) =>
    apiFetch<CashLunak>(`/cash-lunak/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/cash-lunak/${id}`, { method: 'DELETE' }),
  addCicilan: (id: string, cicilan: Omit<Cicilan, 'id'>) =>
    apiFetch<Cicilan>(`/cash-lunak/${id}/cicilan`, { method: 'POST', body: JSON.stringify(cicilan) }),
  deleteCicilan: (id: string, cicilanId: string) =>
    apiFetch<{ message: string }>(`/cash-lunak/${id}/cicilan/${cicilanId}`, { method: 'DELETE' }),
};

// ─── Data Siswa ──────────────────────────────────────────────────────────────
export const dataSiswaApi = {
  list: () => apiFetch<DataSiswa[]>('/data-siswa'),
  create: (data: Omit<DataSiswa, 'id' | 'created_at'>) =>
    apiFetch<DataSiswa>('/data-siswa', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<DataSiswa>) =>
    apiFetch<DataSiswa>(`/data-siswa/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/data-siswa/${id}`, { method: 'DELETE' }),
};

// ─── Jenis Tagihan ────────────────────────────────────────────────────────────
export const jenisTagihanApi = {
  list: () => apiFetch<JenisTagihan[]>('/jenis-tagihan'),
  create: (data: Omit<JenisTagihan, 'kode'> & { kode: string }) =>
    apiFetch<JenisTagihan>('/jenis-tagihan', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<JenisTagihan>) =>
    apiFetch<JenisTagihan>(`/jenis-tagihan/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/jenis-tagihan/${id}`, { method: 'DELETE' }),
};

// ─── Adm Siswa ───────────────────────────────────────────────────────────────
export type AdmSiswaFilters = { id_siswa?: string; periode_tahun?: string; periode_bulan?: string; status?: string };

export const admSiswaApi = {
  list: (filters?: AdmSiswaFilters) => {
    const qs = filters
      ? '?' + new URLSearchParams(
          Object.entries(filters)
            .filter(([, v]) => v != null && v !== '')
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return apiFetch<AdmSiswa[]>(`/adm-siswa${qs}`);
  },
  create: (data: Omit<AdmSiswa, 'id' | 'sisa' | 'status' | 'created_at' | 'updated_at' | 'created_by'>) =>
    apiFetch<AdmSiswa>('/adm-siswa', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<AdmSiswa>) =>
    apiFetch<AdmSiswa>(`/adm-siswa/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/adm-siswa/${id}`, { method: 'DELETE' }),
  saldoSummary: () =>
    apiFetch<{ total_saldo: number; rincian: { id_siswa: string; nama: string; total_terbayar: number }[] }>(
      '/adm-siswa/summary/saldo'
    ),
};

// ─── Saldo Manual TK Yaris ───────────────────────────────────────────────────
export const saldoManualApi = {
  list: () => apiFetch<SaldoManualEntry[]>('/saldo-manual-tkyaris'),
  create: (data: { keterangan: string; nominal: number; tanggal: string }) =>
    apiFetch<SaldoManualEntry>('/saldo-manual-tkyaris', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pick<SaldoManualEntry, 'keterangan' | 'nominal' | 'tanggal'>>) =>
    apiFetch<SaldoManualEntry>(`/saldo-manual-tkyaris/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/saldo-manual-tkyaris/${id}`, { method: 'DELETE' }),
};

// ─── Progres Tukang ──────────────────────────────────────────────────────────
export const progresTukangApi = {
  list: () => apiFetch<ProgresTukang[]>('/progres-tukang'),
  create: (data: Omit<ProgresTukang, 'id' | 'total_terbayar' | 'sisa_progres' | 'persen_selesai' | 'status' | 'histori_progres' | 'created_at' | 'updated_at' | 'created_by'>) =>
    apiFetch<ProgresTukang>('/progres-tukang', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ProgresTukang>) =>
    apiFetch<ProgresTukang>(`/progres-tukang/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ message: string }>(`/progres-tukang/${id}`, { method: 'DELETE' }),
  addHistori: (id: string, data: Omit<HistoriProgres, 'id_progres'>) =>
    apiFetch<HistoriProgres>(`/progres-tukang/${id}/histori`, { method: 'POST', body: JSON.stringify(data) }),
  deleteHistori: (id: string, historiId: string) =>
    apiFetch<{ message: string }>(`/progres-tukang/${id}/histori/${historiId}`, { method: 'DELETE' }),
};

// ─── Import Dokumen ──────────────────────────────────────────────────────────
export const importDokumenApi = {
  list: (unit: ImportableUnit) => apiFetch<ImportedRow[]>(`/import-dokumen/${unit}`),
  bulkCreate: (unit: ImportableUnit, rows: Omit<ImportedRow, 'id' | 'unit' | 'uploaded_at' | 'created_by' | 'synced' | 'synced_at' | 'synced_transaksi_id' | 'dedup_key'>[], sourceFile: string) =>
    apiFetch<{ ditambahkan: number; dilewati: number }>(
      `/import-dokumen/${unit}`,
      { method: 'POST', body: JSON.stringify({ rows, source_file: sourceFile }) }
    ),
  update: (unit: ImportableUnit, id: string, data: Partial<ImportedRow>) =>
    apiFetch<ImportedRow>(`/import-dokumen/${unit}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (unit: ImportableUnit, id: string) =>
    apiFetch<{ message: string }>(`/import-dokumen/${unit}/${id}`, { method: 'DELETE' }),
  sync: (unit: ImportableUnit, id: string) =>
    apiFetch<{ ok: boolean; transaksi_id?: string; reason?: string }>(
      `/import-dokumen/${unit}/${id}/sync`, { method: 'POST' }
    ),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  summary: () => apiFetch<{
    divisi: Record<DivisiKey, { saldo_awal: number; uang_masuk: number; uang_keluar: number; saldo_akhir: number }>;
    total_perusahaan: number;
    total_masuk: number;
    total_keluar: number;
    saldo_tkyaris: number;
  }>('/dashboard/summary'),
};
