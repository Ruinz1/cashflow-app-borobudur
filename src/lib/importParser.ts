import * as XLSX from "xlsx";
import mammoth from "mammoth";

export type ParseError = string;

export interface ParsedRow {
  tanggal: string;
  keterangan: string;
  kategori: string;
  debit: number;
  kredit: number;
  saldo: number;
  catatan: string;
  errors: ParseError[];
}

export interface ParseResult {
  rows: ParsedRow[];
  warnings: string[];
  fileName: string;
  detectedHeader?: string[];
  rawCount: number;
}

const COLUMN_SYNONYMS: Record<keyof Omit<ParsedRow, "errors">, string[]> = {
  tanggal: ["tanggal", "tgl", "date", "tgl trans", "tgl transaksi", "tgltransaksi", "transaction date", "trans date"],
  keterangan: ["keterangan", "deskripsi", "uraian", "description", "ket", "narasi", "memo", "transaction"],
  kategori: ["kategori", "category", "jenis", "tipe", "type", "klasifikasi"],
  debit: ["debit", "masuk", "pemasukan", "income", "kredit masuk", "uang masuk", "in", "credit in", "penerimaan"],
  kredit: ["kredit", "keluar", "pengeluaran", "expense", "expenses", "uang keluar", "out", "debit keluar", "biaya", "pembayaran"],
  saldo: ["saldo", "balance", "saldo akhir", "running balance", "saldo berjalan"],
  catatan: ["catatan", "note", "notes", "remark", "remarks", "keterangan tambahan"],
};

function normHeader(h: unknown): string {
  return String(h ?? "").trim().toLowerCase().replace(/[._\-]/g, " ").replace(/\s+/g, " ");
}

function buildHeaderMap(header: unknown[]): Partial<Record<keyof Omit<ParsedRow, "errors">, number>> {
  const map: Partial<Record<keyof Omit<ParsedRow, "errors">, number>> = {};
  const norm = header.map(normHeader);
  (Object.keys(COLUMN_SYNONYMS) as (keyof typeof COLUMN_SYNONYMS)[]).forEach(col => {
    const syns = COLUMN_SYNONYMS[col];
    const idx = norm.findIndex(h => syns.includes(h));
    if (idx >= 0) map[col] = idx;
  });
  return map;
}

/** Konversi berbagai format tanggal ke ISO yyyy-mm-dd. */
export function normalizeDate(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  // Excel serial number
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      return `${String(d.y).padStart(4, "0")}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
  }
  const s = String(v).trim();
  // Already ISO
  const isoM = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoM) return `${isoM[1]}-${isoM[2].padStart(2, "0")}-${isoM[3].padStart(2, "0")}`;
  // dd/mm/yyyy or dd-mm-yyyy or d/m/yy
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dmy) {
    let y = parseInt(dmy[3]);
    if (y < 100) y += 2000;
    return `${String(y).padStart(4, "0")}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  // Fallback Date.parse
  const t = new Date(s);
  if (!Number.isNaN(t.getTime())) {
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }
  return "";
}

/** Parse nominal: terima Rp, pemisah ribuan titik/koma, parens negatif. */
export function normalizeNominal(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (!s) return 0;
  const isNeg = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()\s]/g, "").replace(/^-/, "").replace(/rp/i, "");
  // Detect last separator as decimal if present
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) {
      // Indonesian: 1.234,56 → remove dots, comma is decimal
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // English: 1,234.56 → remove commas
      s = s.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    // Only comma — treat as decimal if last 1-2 digits, else thousand sep
    const after = s.length - lastComma - 1;
    if (after === 1 || after === 2) s = s.replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastDot >= 0) {
    const after = s.length - lastDot - 1;
    if (after !== 1 && after !== 2) s = s.replace(/\./g, "");
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return isNeg ? -n : n;
}

function rowFromMap(rec: unknown[], map: Partial<Record<keyof Omit<ParsedRow, "errors">, number>>): ParsedRow {
  const get = (col: keyof Omit<ParsedRow, "errors">) => {
    const idx = map[col];
    return idx === undefined ? "" : rec[idx];
  };
  const errors: ParseError[] = [];
  const tanggal = normalizeDate(get("tanggal"));
  if (!tanggal) errors.push("Tanggal tidak terdeteksi/ tidak valid.");
  const keterangan = String(get("keterangan") ?? "").trim();
  if (!keterangan) errors.push("Keterangan kosong.");
  const debit = Math.max(0, normalizeNominal(get("debit")));
  const kredit = Math.max(0, normalizeNominal(get("kredit")));
  if (debit === 0 && kredit === 0) errors.push("Debit dan Kredit nol.");
  return {
    tanggal,
    keterangan,
    kategori: String(get("kategori") ?? "").trim(),
    debit,
    kredit,
    saldo: normalizeNominal(get("saldo")),
    catatan: String(get("catatan") ?? "").trim(),
    errors,
  };
}

/** Parse Excel/CSV file. */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const warnings: string[] = [];
  const allRows: ParsedRow[] = [];
  let detectedHeader: string[] | undefined;
  let rawCount = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    if (aoa.length < 2) continue;
    // Find header row (first row with >=2 string-like cells)
    let headerIdx = -1;
    for (let i = 0; i < Math.min(10, aoa.length); i++) {
      const cells = aoa[i] || [];
      const stringy = cells.filter(c => typeof c === "string" && String(c).trim().length > 0).length;
      if (stringy >= 2) { headerIdx = i; break; }
    }
    if (headerIdx === -1) continue;
    const header = aoa[headerIdx];
    const map = buildHeaderMap(header);
    if (Object.keys(map).length < 2) {
      warnings.push(`Sheet "${sheetName}": kolom tidak dapat dipetakan otomatis.`);
      continue;
    }
    if (!detectedHeader) detectedHeader = header.map(h => String(h ?? ""));
    for (let i = headerIdx + 1; i < aoa.length; i++) {
      const rec = aoa[i] || [];
      // Skip fully empty
      if (rec.every(c => c === "" || c === null || c === undefined)) continue;
      rawCount++;
      const r = rowFromMap(rec, map);
      // Drop only if every required field invalid
      if (r.errors.length === 3) continue;
      allRows.push(r);
    }
  }

  if (allRows.length === 0) {
    warnings.push("Tidak ada baris data yang dapat di-parse.");
  }
  return { rows: allRows, warnings, fileName: file.name, detectedHeader, rawCount };
}

/** Parse Word .docx (extract first table; fallback to paragraph regex). */
export async function parseWordFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  // mammoth.convertToHtml gives us tables; we then parse via DOMParser.
  const result = await mammoth.convertToHtml({ arrayBuffer: buf });
  const html = result.value || "";
  const warnings: string[] = (result.messages || []).map(m => `${m.type}: ${m.message}`);

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const tables = Array.from(doc.querySelectorAll("table"));

  const allRows: ParsedRow[] = [];
  let detectedHeader: string[] | undefined;
  let rawCount = 0;

  if (tables.length > 0) {
    for (const table of tables) {
      const trs = Array.from(table.querySelectorAll("tr"));
      if (trs.length < 2) continue;
      const headerCells = Array.from(trs[0].querySelectorAll("th,td")).map(c => (c.textContent || "").trim());
      const map = buildHeaderMap(headerCells);
      if (Object.keys(map).length < 2) {
        warnings.push("Tabel di Word: kolom tidak dapat dipetakan otomatis.");
        continue;
      }
      if (!detectedHeader) detectedHeader = headerCells;
      for (let i = 1; i < trs.length; i++) {
        const cells = Array.from(trs[i].querySelectorAll("td,th")).map(c => (c.textContent || "").trim());
        if (cells.every(c => !c)) continue;
        rawCount++;
        const r = rowFromMap(cells, map);
        if (r.errors.length === 3) continue;
        allRows.push(r);
      }
    }
  }

  // Fallback: paragraph regex for "tanggal — keterangan — nominal" lines
  if (allRows.length === 0) {
    const text = doc.body.textContent || "";
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const lineRe = /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\s+(.+?)\s+(masuk|keluar|debit|kredit)?\s*([Rr][Pp]\.?\s*)?([\d.,()-]+)$/i;
    for (const ln of lines) {
      const m = ln.match(lineRe);
      if (!m) continue;
      rawCount++;
      const tanggal = normalizeDate(m[1]);
      const keterangan = (m[2] || "").trim();
      const direction = (m[3] || "").toLowerCase();
      const amt = normalizeNominal(m[5]);
      if (!tanggal || !keterangan || !amt) continue;
      const isMasuk = direction === "masuk" || direction === "debit";
      allRows.push({
        tanggal,
        keterangan,
        kategori: "",
        debit: isMasuk ? amt : 0,
        kredit: isMasuk ? 0 : amt,
        saldo: 0,
        catatan: "",
        errors: [],
      });
    }
    if (allRows.length > 0) warnings.push("Word tanpa tabel — diparsing dari teks dengan pola regex.");
  }

  if (allRows.length === 0) {
    warnings.push("Tidak ada tabel/teks yang bisa diekstrak dari Word.");
  }
  return { rows: allRows, warnings, fileName: file.name, detectedHeader, rawCount };
}

/** Routing parser berdasarkan ekstensi file. */
export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    return parseExcelFile(file);
  }
  if (name.endsWith(".docx")) {
    return parseWordFile(file);
  }
  throw new Error("Format file tidak didukung. Hanya .xlsx, .xls, .csv, .docx.");
}

export const SUPPORTED_EXTENSIONS = [".xlsx", ".xls", ".csv", ".docx"] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
