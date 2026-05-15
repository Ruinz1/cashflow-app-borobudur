<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Division;
use App\Models\SaldoAwalDivisi;
use App\Models\Transaction;
use Illuminate\Http\Request;

class SaldoAwalController extends Controller
{
    private const DIVISI_KEYS = ['bakso', 'amanah', 'batualam', 'kembang', 'perumahan', 'tkyaris'];

    /**
     * GET /api/saldo-awal
     * Returns { bakso: 0, amanah: 0, ... }
     */
    public function index()
    {
        $rows = SaldoAwalDivisi::all()->keyBy('kode_divisi');
        $result = [];
        foreach (self::DIVISI_KEYS as $key) {
            $result[$key] = isset($rows[$key]) ? (float) $rows[$key]->nominal : 0;
        }
        return response()->json($result);
    }

    /**
     * PUT /api/saldo-awal/{divisi}
     * Body: { nominal: 5000000 }
     */
    public function update(Request $request, string $divisi)
    {
        if (!in_array($divisi, self::DIVISI_KEYS)) {
            return response()->json(['error' => 'Divisi tidak valid'], 422);
        }

        $request->validate(['nominal' => 'required|numeric|min:0']);

        SaldoAwalDivisi::updateOrCreate(
            ['kode_divisi' => $divisi],
            ['nominal' => $request->nominal]
        );

        // Recalculate saldo for this division
        $division = Division::where('kode_divisi', $divisi)->first();
        if ($division) {
            $this->recalculateSaldo($division->id, (float) $request->nominal);
        }

        return response()->json(['kode_divisi' => $divisi, 'nominal' => (float) $request->nominal]);
    }

    private function recalculateSaldo(string $divisionId, float $saldoAwal)
    {
        $transactions = Transaction::where('division_id', $divisionId)
            ->orderBy('tanggal')
            ->orderBy('created_at')
            ->get();

        $saldo = $saldoAwal;
        foreach ($transactions as $t) {
            $saldo += $t->uang_masuk - $t->uang_keluar;
            $t->update(['saldo_akhir' => $saldo]);
        }
    }
}
