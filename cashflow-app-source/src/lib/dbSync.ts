/**
 * dbSync.ts — Database Sync Layer
 *
 * Strategi:
 * 1. initFromDatabase() dipanggil saat app startup
 *    → Fetch semua data dari API, hydrate localStorage
 * 2. Setiap localStorage.setItem untuk key cashflow_* juga kirim ke API
 *    → Write-through cache pattern (butuh session token)
 * 3. Jika API tidak tersedia, app tetap berjalan dengan localStorage
 * 4. syncLocalStorageToDb() dipanggil setelah login berhasil
 *    → Push data localStorage ke DB (satu kali per sesi)
 */

import { getSessionToken } from "@/lib/storage";

const API_BASE = "/api";

let dbAvailable = false;
let initDone = false;

// Simpan referensi originalSetItem sebelum override
const _originalSetItem = window.localStorage.setItem.bind(window.localStorage);

/** Mapping localStorage key → API path */
const SYNC_KEYS = new Set([
  "cashflow_users",
  "cashflow_hak_akses",
  "cashflow_saldo_awal",
  "cashflow_saldo_manual_tkyaris",
  "cashflow_saldo_admsiswa",
  "cashflow_akad",
  "cashflow_cashlunak",
  "cashflow_datasiswa",
  "cashflow_admsiswa",
  "cashflow_jenistagihan",
  "cashflow_progrestukang",
  "cashflow_bakso",
  "cashflow_amanah",
  "cashflow_batualam",
  "cashflow_kembang",
  "cashflow_perumahan",
  "cashflow_tkyaris",
  "cashflow_imports_amanah",
  "cashflow_imports_batualam",
]);

/** Buat header untuk request yang butuh auth */
function authHeaders(): HeadersInit {
  const token = getSessionToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/** Fire-and-forget sync ke backend */
function syncKeyToDb(key: string, value: string): void {
  if (!dbAvailable) return;
  if (!SYNC_KEYS.has(key)) return;

  const token = getSessionToken();
  if (!token) return; // Jangan sync jika belum login

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return;
  }

  fetch(`${API_BASE}/data/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(parsed),
  }).catch(() => {
    // Swallow — DB unavailable, tetap jalan dengan localStorage
  });
}

/** Override localStorage.setItem agar otomatis sync ke DB */
function installStorageInterceptor(): void {
  window.localStorage.setItem = function (key: string, value: string): void {
    _originalSetItem(key, value);
    syncKeyToDb(key, value);
  };
}

/**
 * Ambil semua data dari DB dan hydrate localStorage.
 * Dipanggil sekali saat app startup. Graceful fallback jika DB offline.
 */
export async function initFromDatabase(): Promise<void> {
  if (initDone) return;
  initDone = true;

  // Install interceptor sebelum fetch (agar write setelah init juga disync)
  installStorageInterceptor();

  try {
    const resp = await fetch(`${API_BASE}/sync`, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const json = (await resp.json()) as { ok: boolean; data: Record<string, unknown> };
    if (!json.ok || !json.data) throw new Error("Respons tidak valid dari server");

    dbAvailable = true;

    // Hydrate localStorage — hanya key yang ada data di DB (skip null/empty array jika
    // localStorage sudah terisi agar tidak menimpa data lokal dengan array kosong)
    const data = json.data;
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;

      const isEmptyArray = Array.isArray(value) && value.length === 0;
      const isEmptyObject = typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0;
      const hasLocalData = window.localStorage.getItem(key) !== null;

      // Jika DB kosong DAN localStorage sudah ada data, jangan overwrite
      if ((isEmptyArray || isEmptyObject) && hasLocalData) continue;

      // Tulis ke localStorage via _originalSetItem (bypass interceptor agar tidak
      // kirim balik ke DB — data sudah dari DB)
      _originalSetItem(key, JSON.stringify(value));
    }

    console.log("[dbSync] Sinkronisasi dari database selesai.");
  } catch (err) {
    console.warn("[dbSync] Database tidak tersedia, menggunakan localStorage:", (err as Error).message);
    // App tetap berjalan dengan localStorage
  }
}

/**
 * Push semua data localStorage yang relevan ke DB.
 * Dipanggil SETELAH login berhasil (token sudah tersedia).
 */
export async function syncLocalStorageToDb(): Promise<void> {
  if (!dbAvailable) return;

  const token = getSessionToken();
  if (!token) return;

  const pushKeys = Array.from(SYNC_KEYS);
  for (const key of pushKeys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      // Skip array kosong
      if (Array.isArray(parsed) && parsed.length === 0) continue;
      await fetch(`${API_BASE}/data/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(parsed),
      });
    } catch {
      // ignore
    }
  }
}

/** Apakah koneksi ke DB tersedia */
export function isDbAvailable(): boolean {
  return dbAvailable;
}
