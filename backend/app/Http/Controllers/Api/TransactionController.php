<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Division;
use App\Models\SaldoAwalDivisi;
use App\Models\Transaction;
use App\Models\TransactionNote;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TransactionController extends Controller
{
    /**
     * GET /api/transactions/{division}?month=3&year=2026
     */
    public function index(Request $request, $division = null)
    {
        $query = Transaction::with('notes');

        if ($division) {
            $divisionModel = Division::where('kode_divisi', $division)->firstOrFail();
            $query->where('division_id', $divisionModel->id);
        }

        if ($request->has('month') && $request->month) {
            $query->whereRaw('MONTH(tanggal) = ?', [$request->month]);
        }
        if ($request->has('year') && $request->year) {
            $query->whereRaw('YEAR(tanggal) = ?', [$request->year]);
        }

        $transactions = $query->orderBy('tanggal')->orderBy('created_at')->get();

        return response()->json($transactions->map(fn($t) => $this->format($t)));
    }

    /**
     * POST /api/transactions/{division}
     */
    public function store(Request $request, $division = null)
    {
        $request->validate([
            'tanggal'    => 'required|string',
            'uraian'     => 'required|string',
            'rencana'    => 'nullable|numeric',
            'uang_masuk' => 'nullable|numeric',
            'uang_keluar'=> 'nullable|numeric',
            'keterangan' => 'nullable|string',
        ]);

        $divisionModel = Division::where('kode_divisi', $division)->firstOrFail();

        $transaction = Transaction::create([
            'id'          => Str::uuid(),
            'division_id' => $divisionModel->id,
            'tanggal'     => $request->tanggal,
            'uraian'      => $request->uraian,
            'rencana'     => $request->rencana ?? 0,
            'uang_masuk'  => $request->uang_masuk ?? 0,
            'uang_keluar' => $request->uang_keluar ?? 0,
            'saldo_akhir' => 0,
            'keterangan'  => $request->keterangan,
            'created_by'  => $request->user()?->id,
        ]);

        // Handle notes/attachments
        if ($request->has('notas') && is_array($request->notas)) {
            foreach ($request->notas as $nota) {
                TransactionNote::create([
                    'id'             => Str::uuid(),
                    'transaction_id' => $transaction->id,
                    'nama'           => $nota['nama'] ?? 'file',
                    'tipe'           => $nota['tipe'] ?? 'application/octet-stream',
                    'data'           => $nota['data'] ?? '',
                ]);
            }
        }

        $this->recalculateSaldo($divisionModel->id);
        $transaction->refresh()->load('notes');

        return response()->json($this->format($transaction), 201);
    }

    /**
     * GET /api/transactions/{division}/{id}
     */
    public function show(Request $request, $division, $id)
    {
        $transaction = Transaction::with('notes')->findOrFail($id);
        return response()->json($this->format($transaction));
    }

    /**
     * PUT /api/transactions/{division}/{id}
     */
    public function update(Request $request, $division, $id)
    {
        $transaction = Transaction::findOrFail($id);

        $request->validate([
            'tanggal'    => 'required|string',
            'uraian'     => 'required|string',
            'rencana'    => 'nullable|numeric',
            'uang_masuk' => 'nullable|numeric',
            'uang_keluar'=> 'nullable|numeric',
            'keterangan' => 'nullable|string',
        ]);

        $transaction->update([
            'tanggal'     => $request->tanggal,
            'uraian'      => $request->uraian,
            'rencana'     => $request->rencana ?? 0,
            'uang_masuk'  => $request->uang_masuk ?? 0,
            'uang_keluar' => $request->uang_keluar ?? 0,
            'keterangan'  => $request->keterangan,
        ]);

        // Replace notes if provided
        if ($request->has('notas')) {
            $transaction->notes()->delete();
            if (is_array($request->notas)) {
                foreach ($request->notas as $nota) {
                    TransactionNote::create([
                        'id'             => Str::uuid(),
                        'transaction_id' => $transaction->id,
                        'nama'           => $nota['nama'] ?? 'file',
                        'tipe'           => $nota['tipe'] ?? 'application/octet-stream',
                        'data'           => $nota['data'] ?? '',
                    ]);
                }
            }
        }

        $this->recalculateSaldo($transaction->division_id);
        $transaction->refresh()->load('notes');

        return response()->json($this->format($transaction));
    }

    /**
     * DELETE /api/transactions/{division}/{id}
     */
    public function destroy(Request $request, $division, $id)
    {
        $transaction = Transaction::findOrFail($id);
        $divisionId  = $transaction->division_id;
        $transaction->delete(); // cascade deletes notes

        $this->recalculateSaldo($divisionId);

        return response()->json(['message' => 'Transaksi dihapus']);
    }

    private function recalculateSaldo(string $divisionId)
    {
        $division  = Division::find($divisionId);
        $saldoAwal = 0;
        if ($division) {
            $saldoRow = SaldoAwalDivisi::where('kode_divisi', $division->kode_divisi)->first();
            $saldoAwal = $saldoRow ? (float) $saldoRow->nominal : 0;
        }

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

    private function format(Transaction $t): array
    {
        $notas = $t->notes->map(fn($n) => [
            'id'   => $n->id,
            'nama' => $n->nama,
            'tipe' => $n->tipe,
            'data' => $n->data,
        ])->values()->all();

        return [
            'id'          => $t->id,
            'tanggal'     => $t->tanggal,
            'uraian'      => $t->uraian,
            'rencana'     => (float) $t->rencana,
            'uang_masuk'  => (float) $t->uang_masuk,
            'uang_keluar' => (float) $t->uang_keluar,
            'saldo_akhir' => (float) $t->saldo_akhir,
            'keterangan'  => $t->keterangan ?? '',
            'notas'       => $notas,
            'nota'        => count($notas) > 0 ? $notas[0] : null, // backward compat
        ];
    }
}
