<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ImportDokumen;
use App\Models\Division;
use App\Models\SaldoAwalDivisi;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ImportDokumenController extends Controller
{
    public function index(Request $request, string $unit)
    {
        if (!in_array($unit, ['amanah', 'batualam'])) {
            return response()->json(['error' => 'Unit tidak valid'], 422);
        }

        return response()->json(ImportDokumen::where('unit', $unit)->orderBy('tanggal')->get());
    }

    public function store(Request $request, string $unit)
    {
        if (!in_array($unit, ['amanah', 'batualam'])) {
            return response()->json(['error' => 'Unit tidak valid'], 422);
        }

        // Accept array of rows for bulk insert
        $rows        = $request->input('rows', []);
        $source_file = $request->input('source_file', '');
        $added       = 0;
        $skipped     = 0;

        foreach ($rows as $row) {
            $dedup_key = $this->buildDedupKey($row);

            $exists = ImportDokumen::where('unit', $unit)
                ->where('dedup_key', $dedup_key)
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            ImportDokumen::create([
                'id'          => Str::uuid(),
                'unit'        => $unit,
                'tanggal'     => $row['tanggal'] ?? '',
                'keterangan'  => $row['keterangan'] ?? '',
                'kategori'    => $row['kategori'] ?? '',
                'debit'       => (float) ($row['debit'] ?? 0),
                'kredit'      => (float) ($row['kredit'] ?? 0),
                'saldo'       => (float) ($row['saldo'] ?? 0),
                'catatan'     => $row['catatan'] ?? '',
                'source_file' => $source_file,
                'dedup_key'   => $dedup_key,
                'synced'      => false,
                'synced_at'   => null,
                'created_by'  => $request->user()?->id,
            ]);

            $added++;
        }

        return response()->json(['ditambahkan' => $added, 'dilewati' => $skipped], 201);
    }

    public function update(Request $request, string $unit, string $id)
    {
        $row = ImportDokumen::where('unit', $unit)->findOrFail($id);

        if ($row->synced) {
            return response()->json(['error' => 'Baris sudah disinkronkan dan tidak bisa diubah.'], 422);
        }

        $row->update($request->only(['tanggal', 'keterangan', 'kategori', 'debit', 'kredit', 'saldo', 'catatan']));
        $row->update(['dedup_key' => $this->buildDedupKey($row->toArray())]);

        return response()->json($row->fresh());
    }

    public function destroy(string $unit, string $id)
    {
        ImportDokumen::where('unit', $unit)->findOrFail($id)->delete();
        return response()->json(['message' => 'Baris import dihapus']);
    }

    /** POST /api/import-dokumen/{unit}/{id}/sync */
    public function syncToCashflow(Request $request, string $unit, string $id)
    {
        $row = ImportDokumen::where('unit', $unit)->findOrFail($id);

        if ($row->synced && $row->synced_transaksi_id) {
            return response()->json(['ok' => false, 'reason' => 'Sudah disinkronkan sebelumnya.'], 422);
        }

        if (($row->debit <= 0 && $row->kredit <= 0)) {
            return response()->json(['ok' => false, 'reason' => 'Nominal debit/kredit harus > 0.'], 422);
        }

        $division = Division::where('kode_divisi', $unit)->firstOrFail();
        $saldoRow  = SaldoAwalDivisi::where('kode_divisi', $unit)->first();
        $saldoAwal = $saldoRow ? (float) $saldoRow->nominal : 0;

        $importMarker = "[imp:{$row->id}]";

        // Idempotency guard
        $existing = Transaction::where('division_id', $division->id)
            ->where('keterangan', 'like', "%$importMarker%")
            ->first();

        if ($existing) {
            $row->update(['synced' => true, 'synced_at' => now(), 'synced_transaksi_id' => $existing->id]);
            return response()->json(['ok' => true, 'transaksi_id' => $existing->id]);
        }

        $ketBase = $row->kategori
            ? "[Import: {$row->source_file}] $importMarker {$row->kategori}" . ($row->catatan ? " — {$row->catatan}" : '')
            : "[Import: {$row->source_file}] $importMarker" . ($row->catatan ? " {$row->catatan}" : '');

        $newId = Str::uuid()->toString();
        $transaction = Transaction::create([
            'id'          => $newId,
            'division_id' => $division->id,
            'tanggal'     => $row->tanggal,
            'uraian'      => $row->keterangan,
            'rencana'     => 0,
            'uang_masuk'  => $row->debit,
            'uang_keluar' => $row->kredit,
            'saldo_akhir' => 0,
            'keterangan'  => $ketBase,
            'created_by'  => $request->user()?->id,
        ]);

        // Recalculate saldo
        $transactions = Transaction::where('division_id', $division->id)
            ->orderBy('tanggal')->orderBy('created_at')->get();
        $saldo = $saldoAwal;
        foreach ($transactions as $t) {
            $saldo += $t->uang_masuk - $t->uang_keluar;
            $t->update(['saldo_akhir' => $saldo]);
        }

        $row->update(['synced' => true, 'synced_at' => now(), 'synced_transaksi_id' => $newId]);

        return response()->json(['ok' => true, 'transaksi_id' => $newId]);
    }

    private function buildDedupKey(array $row): string
    {
        $ket = strtolower(trim($row['keterangan'] ?? ''));
        $ket = preg_replace('/\s+/', ' ', $ket);
        return ($row['tanggal'] ?? '') . '|' . $ket . '|' . round($row['debit'] ?? 0) . '|' . round($row['kredit'] ?? 0);
    }
}
