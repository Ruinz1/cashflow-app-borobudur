import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ImportableUnit, ImportedRow, formatRupiah, formatDate,
} from "@/lib/types";
import { importDokumenApi } from "@/lib/api";
import {
  RefreshCw, Trash2, Pencil, Eye, FileSpreadsheet, FileText, Search, Filter,
  ChevronUp, ChevronDown, CheckCircle2, X, AlertCircle, Inbox, Database,
} from "lucide-react";

type SortKey = "tanggal" | "keterangan" | "kategori" | "debit" | "kredit" | "saldo" | "uploaded_at";
type SortDir = "asc" | "desc";
type ToastType = "success" | "error" | "info";

type Props = {
  unit: ImportableUnit;
  canCRUD: boolean;
  onAfterSync?: () => void;
};

export default function ImportDokumenSection({ unit, canCRUD, onAfterSync }: Props) {
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "synced" | "unsynced">("all");
  const [sortKey, setSortKey] = useState<SortKey>("uploaded_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ImportedRow>>({});
  const [detailRow, setDetailRow] = useState<ImportedRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  const showToast = useCallback((msg: string, type: ToastType = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const reload = useCallback(async () => {
    try {
      const data = await importDokumenApi.list(unit);
      setRows(data);
      setSelected(new Set());
    } catch (e) {
      console.error("Gagal load import", e);
    }
  }, [unit]);

  useEffect(() => {
    reload();
  }, [reload]);

  const kategoriOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.kategori) set.add(r.kategori); });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (q) {
        const blob = `${r.tanggal} ${r.keterangan} ${r.kategori} ${r.catatan} ${r.source_file}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (filterKategori && r.kategori !== filterKategori) return false;
      if (filterFrom && r.tanggal < filterFrom) return false;
      if (filterTo && r.tanggal > filterTo) return false;
      if (filterStatus === "synced" && !r.synced) return false;
      if (filterStatus === "unsynced" && r.synced) return false;
      return true;
    });
  }, [rows, search, filterKategori, filterFrom, filterTo, filterStatus]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = a[sortKey] as string | number;
      const vb = b[sortKey] as string | number;
      if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };
  const sortIcon = (k: SortKey) => sortKey !== k ? null : sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;

  const toggleAllOnPage = (checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      pageRows.forEach(r => { if (checked) next.add(r.id); else next.delete(r.id); });
      return next;
    });
  };
  const toggleOne = (id: string) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const startEdit = (r: ImportedRow) => {
    setEditId(r.id);
    setEditForm({ tanggal: r.tanggal, keterangan: r.keterangan, kategori: r.kategori, debit: r.debit, kredit: r.kredit, catatan: r.catatan });
  };
  const saveEdit = async () => {
    if (!editId) return;
    try {
      await importDokumenApi.update(unit, editId, editForm);
      showToast("Baris berhasil diperbarui.");
      setEditId(null);
      reload();
    } catch (e: any) {
      showToast(e?.message || "Gagal memperbarui baris.", "error");
    }
  };

  const handleSyncOne = async (id: string) => {
    try {
      const res = await importDokumenApi.sync(unit, id);
      if (res.ok) {
        showToast("Baris berhasil disinkronkan ke cashflow utama.");
        onAfterSync?.();
        reload();
      } else {
        showToast(res.reason || "Gagal sinkronisasi.", "error");
      }
    } catch (e: any) {
      showToast(e?.message || "Gagal sinkronisasi.", "error");
    }
  };

  const handleBulkSync = async () => {
    if (selected.size === 0) return;
    let berhasil = 0;
    let gagal = 0;
    for (const id of Array.from(selected)) {
      try {
        const res = await importDokumenApi.sync(unit, id);
        if (res.ok) berhasil++; else gagal++;
      } catch {
        gagal++;
      }
    }
    if (berhasil > 0) onAfterSync?.();
    if (gagal === 0) showToast(`${berhasil} baris berhasil disinkronkan.`);
    else showToast(`${berhasil} berhasil, ${gagal} gagal — cek baris yang sudah disync atau invalid.`, berhasil > 0 ? "info" : "error");
    reload();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    let n = 0;
    for (const id of confirmDelete.ids) {
      try {
        await importDokumenApi.delete(unit, id);
        n++;
      } catch (e) {
        // ignore
      }
    }
    showToast(`${n} baris dihapus.`);
    setConfirmDelete(null);
    reload();
  };

  const totalDebit = filtered.reduce((s, r) => s + (r.debit || 0), 0);
  const totalKredit = filtered.reduce((s, r) => s + (r.kredit || 0), 0);
  const totalUnsynced = rows.filter(r => !r.synced).length;

  const allOnPageSelected = pageRows.length > 0 && pageRows.every(r => selected.has(r.id));

  return (
    <div className="space-y-3" data-testid={`section-import-${unit}`}>
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[60] px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium fade-in ${toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-500" : "bg-blue-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}>
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Data Import Dokumen</h2>
            <p className="text-xs text-muted-foreground">Hasil parsing file Excel/CSV/Word — dapat disinkronkan ke cashflow utama</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{rows.length}</strong> total</span>
          <span>•</span>
          <span><strong className="text-amber-600">{totalUnsynced}</strong> belum sync</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border bg-card p-3 space-y-2" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari keterangan / kategori / catatan..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: "hsl(var(--border))" }}
              data-testid="input-search-import"
            />
          </div>
          <select
            value={filterKategori}
            onChange={e => { setFilterKategori(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border bg-card text-sm" style={{ borderColor: "hsl(var(--border))" }}
            data-testid="select-filter-kategori-import"
          >
            <option value="">Semua Kategori</option>
            {kategoriOptions.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value as any); setPage(1); }}
            className="px-3 py-2 rounded-xl border bg-card text-sm" style={{ borderColor: "hsl(var(--border))" }}
            data-testid="select-filter-status-import"
          >
            <option value="all">Semua Status</option>
            <option value="unsynced">Belum Sync</option>
            <option value="synced">Sudah Sync</option>
          </select>
          <input type="date" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border bg-card text-sm" style={{ borderColor: "hsl(var(--border))" }}
            data-testid="input-filter-from-import" placeholder="Dari" />
          <input type="date" value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border bg-card text-sm" style={{ borderColor: "hsl(var(--border))" }}
            data-testid="input-filter-to-import" placeholder="Sampai" />
          {(search || filterKategori || filterFrom || filterTo || filterStatus !== "all") && (
            <button onClick={() => { setSearch(""); setFilterKategori(""); setFilterFrom(""); setFilterTo(""); setFilterStatus("all"); setPage(1); }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted">
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        {/* Bulk actions */}
        {canCRUD && selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-xs">
            <span className="font-medium"><strong>{selected.size}</strong> baris dipilih</span>
            <button onClick={handleBulkSync} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium" data-testid="button-bulk-sync-import">
              <RefreshCw className="w-3.5 h-3.5" /> Sinkron Terpilih
            </button>
            <button onClick={() => setConfirmDelete({ ids: Array.from(selected), label: `${selected.size} baris terpilih` })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium" data-testid="button-bulk-delete-import">
              <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih
            </button>
            <button onClick={() => setSelected(new Set())} className="px-2 py-1 text-muted-foreground hover:underline">Batal</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-card overflow-hidden" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm" data-testid={`table-import-${unit}`}>
            <thead className="bg-muted/80 backdrop-blur sticky top-0 z-10">
              <tr>
                {canCRUD && (
                  <th className="px-3 py-2 w-10 text-center">
                    <input type="checkbox" checked={allOnPageSelected} onChange={e => toggleAllOnPage(e.target.checked)} aria-label="Pilih semua di halaman ini" />
                  </th>
                )}
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-10">No</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("tanggal")}>Tanggal {sortIcon("tanggal")}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("keterangan")}>Keterangan {sortIcon("keterangan")}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("kategori")}>Kategori {sortIcon("kategori")}</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("debit")}>Debit {sortIcon("debit")}</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("kredit")}>Kredit {sortIcon("kredit")}</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Saldo</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Sumber</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("uploaded_at")}>Tgl Upload {sortIcon("uploaded_at")}</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-44">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={canCRUD ? 11 : 10} className="px-4 py-12 text-center">
                    <Inbox className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Belum ada data import</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Klik tombol "Import Data" di atas untuk mengupload file Excel/Word.</p>
                  </td>
                </tr>
              ) : pageRows.map((r, idx) => {
                const isEdit = editId === r.id;
                return (
                  <tr key={r.id} className={`border-t hover:bg-muted/30 ${r.synced ? "bg-green-50/30 dark:bg-green-950/10" : ""}`} style={{ borderColor: "hsl(var(--border))" }} data-testid={`row-import-${r.id}`}>
                    {canCRUD && (
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} aria-label="Pilih baris" disabled={r.synced} />
                      </td>
                    )}
                    <td className="px-3 py-2 text-xs text-muted-foreground">{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td className="px-3 py-2 text-xs">
                      {isEdit ? <input type="date" value={editForm.tanggal || ""} onChange={e => setEditForm(f => ({ ...f, tanggal: e.target.value }))} className="px-2 py-1 rounded border bg-card text-xs" style={{ borderColor: "hsl(var(--border))" }} /> : formatDate(r.tanggal)}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-xs">
                      {isEdit ? <input type="text" value={editForm.keterangan || ""} onChange={e => setEditForm(f => ({ ...f, keterangan: e.target.value }))} className="w-full px-2 py-1 rounded border bg-card text-xs" style={{ borderColor: "hsl(var(--border))" }} /> : <span className="line-clamp-2">{r.keterangan}</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {isEdit ? <input type="text" value={editForm.kategori || ""} onChange={e => setEditForm(f => ({ ...f, kategori: e.target.value }))} className="w-24 px-2 py-1 rounded border bg-card text-xs" style={{ borderColor: "hsl(var(--border))" }} /> : (r.kategori || <span className="text-muted-foreground italic">—</span>)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-green-700 font-medium">
                      {isEdit ? <input type="number" value={editForm.debit || 0} onChange={e => setEditForm(f => ({ ...f, debit: Number(e.target.value) || 0 }))} className="w-24 px-2 py-1 rounded border bg-card text-xs text-right" style={{ borderColor: "hsl(var(--border))" }} /> : (r.debit > 0 ? formatRupiah(r.debit) : "-")}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-red-600 font-medium">
                      {isEdit ? <input type="number" value={editForm.kredit || 0} onChange={e => setEditForm(f => ({ ...f, kredit: Number(e.target.value) || 0 }))} className="w-24 px-2 py-1 rounded border bg-card text-xs text-right" style={{ borderColor: "hsl(var(--border))" }} /> : (r.kredit > 0 ? formatRupiah(r.kredit) : "-")}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">{r.saldo !== 0 ? formatRupiah(r.saldo) : "-"}</td>
                    <td className="px-3 py-2 text-xs">
                      <div className="flex items-center gap-1.5 max-w-[160px]">
                        {r.source_file.toLowerCase().endsWith(".docx")
                          ? <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          : <FileSpreadsheet className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                        <span className="truncate" title={r.source_file}>{r.source_file}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.uploaded_at).toLocaleDateString("id-ID")}</td>
                    <td className="px-3 py-2">
                      {isEdit ? (
                        <div className="flex justify-center gap-1">
                          <button onClick={saveEdit} className="px-2 py-1 rounded-md bg-blue-600 text-white text-xs">Simpan</button>
                          <button onClick={() => { setEditId(null); setEditForm({}); }} className="px-2 py-1 rounded-md border text-xs" style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center gap-1">
                          {r.synced ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-medium" data-testid={`badge-synced-${r.id}`}>
                              <CheckCircle2 className="w-3 h-3" /> Tersinkron
                            </span>
                          ) : canCRUD ? (
                            <button onClick={() => handleSyncOne(r.id)} className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-950/30 text-blue-600 transition-colors" title="Sinkronkan ke cashflow utama" data-testid={`button-sync-${r.id}`}>
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                          <button onClick={() => setDetailRow(r)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground" title="Detail" data-testid={`button-detail-${r.id}`}>
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canCRUD && !r.synced && (
                            <>
                              <button onClick={() => startEdit(r)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground" title="Edit" data-testid={`button-edit-${r.id}`}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setConfirmDelete({ ids: [r.id], label: `entri "${r.keterangan}"` })} className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600" title="Hapus" data-testid={`button-delete-${r.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {pageRows.length > 0 && (
              <tfoot>
                <tr className="bg-muted/50 font-semibold text-xs">
                  <td colSpan={canCRUD ? 5 : 4} className="px-3 py-2 text-right">Subtotal halaman:</td>
                  <td className="px-3 py-2 text-right text-green-700">{formatRupiah(pageRows.reduce((s, r) => s + r.debit, 0))}</td>
                  <td className="px-3 py-2 text-right text-red-600">{formatRupiah(pageRows.reduce((s, r) => s + r.kredit, 0))}</td>
                  <td colSpan={4} className="px-3 py-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t text-xs text-muted-foreground" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-2">
            <span>Total: <strong className="text-foreground">{filtered.length}</strong> | Debit: <strong className="text-green-700">{formatRupiah(totalDebit)}</strong> | Kredit: <strong className="text-red-600">{formatRupiah(totalKredit)}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1 rounded-lg border bg-card text-xs" style={{ borderColor: "hsl(var(--border))" }}
              data-testid="select-page-size-import">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <button disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2 py-1 rounded-lg border disabled:opacity-40" style={{ borderColor: "hsl(var(--border))" }}
              data-testid="button-prev-page-import">‹</button>
            <span>Hal. <strong className="text-foreground">{currentPage}</strong> / {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2 py-1 rounded-lg border disabled:opacity-40" style={{ borderColor: "hsl(var(--border))" }}
              data-testid="button-next-page-import">›</button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailRow(null)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()} data-testid="modal-detail-import">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Detail Baris Import</h3>
              <button onClick={() => setDetailRow(null)} aria-label="Tutup" className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <dl className="grid grid-cols-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Tanggal</dt><dd className="col-span-2">{formatDate(detailRow.tanggal)}</dd>
              <dt className="text-muted-foreground">Keterangan</dt><dd className="col-span-2">{detailRow.keterangan}</dd>
              <dt className="text-muted-foreground">Kategori</dt><dd className="col-span-2">{detailRow.kategori || "—"}</dd>
              <dt className="text-muted-foreground">Debit</dt><dd className="col-span-2 text-green-700 font-semibold">{formatRupiah(detailRow.debit)}</dd>
              <dt className="text-muted-foreground">Kredit</dt><dd className="col-span-2 text-red-600 font-semibold">{formatRupiah(detailRow.kredit)}</dd>
              <dt className="text-muted-foreground">Saldo (file)</dt><dd className="col-span-2">{formatRupiah(detailRow.saldo)}</dd>
              <dt className="text-muted-foreground">Catatan</dt><dd className="col-span-2">{detailRow.catatan || "—"}</dd>
              <dt className="text-muted-foreground">Sumber File</dt><dd className="col-span-2 break-all">{detailRow.source_file}</dd>
              <dt className="text-muted-foreground">Tgl Upload</dt><dd className="col-span-2">{new Date(detailRow.uploaded_at).toLocaleString("id-ID")}</dd>
              <dt className="text-muted-foreground">Diupload Oleh</dt><dd className="col-span-2">{detailRow.created_by}</dd>
              <dt className="text-muted-foreground">Status Sync</dt>
              <dd className="col-span-2">
                {detailRow.synced
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> Tersinkron pada {detailRow.synced_at && new Date(detailRow.synced_at).toLocaleString("id-ID")}</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-medium">Belum disync</span>}
              </dd>
            </dl>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl p-5 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-red-500" /></div>
              <div>
                <p className="font-semibold text-foreground">Hapus Data Import</p>
                <p className="text-sm text-muted-foreground">{confirmDelete.label} akan dihapus permanen.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl border text-sm font-medium hover:bg-muted" style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
              <button onClick={handleConfirmDelete} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700" data-testid="button-confirm-delete-import">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
