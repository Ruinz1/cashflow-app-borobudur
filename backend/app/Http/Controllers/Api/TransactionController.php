<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Division;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function index(Request $request, $division = null)
    {
        $query = Transaction::with(['division', 'category']);

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

        $transactions = $query->orderBy('tanggal', 'desc')->get();

        return response()->json($transactions);
    }

    public function store(Request $request, $division = null)
    {
        $request->validate([
            'tanggal' => 'required|date',
            'uraian' => 'required|string',
            'rencana' => 'nullable|numeric',
            'uang_masuk' => 'nullable|numeric',
            'uang_keluar' => 'nullable|numeric',
            'keterangan' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        if ($division) {
            $divisionModel = Division::where('kode_divisi', $division)->firstOrFail();
            $divisionId = $divisionModel->id;
        } else {
            $request->validate(['division_id' => 'required|exists:divisions,id']);
            $divisionId = $request->division_id;
        }

        $transaction = Transaction::create([
            'id' => Str::uuid(),
            'division_id' => $divisionId,
            'category_id' => $request->category_id,
            'jenis_transaksi' => 'umum',
            'deskripsi' => $request->uraian,
            'nominal' => $request->uang_masuk - $request->uang_keluar,
            'tanggal' => $request->tanggal,
            'uraian' => $request->uraian,
            'rencana' => $request->rencana ?? 0,
            'uang_masuk' => $request->uang_masuk ?? 0,
            'uang_keluar' => $request->uang_keluar ?? 0,
            'saldo_akhir' => 0, // perlu recalculate
            'keterangan' => $request->keterangan,
            'created_by' => $request->user()->id ?? null,
        ]);

        // Recalculate saldo
        $this->recalculateSaldo($divisionId);

        return response()->json($transaction, 201);
    }

    public function show(string $id)
    {
        $transaction = Transaction::with(['division', 'category'])->findOrFail($id);
        return response()->json($transaction);
    }

    public function update(Request $request, string $id)
    {
        $transaction = Transaction::findOrFail($id);

        $request->validate([
            'tanggal' => 'required|date',
            'uraian' => 'required|string',
            'rencana' => 'nullable|numeric',
            'uang_masuk' => 'nullable|numeric',
            'uang_keluar' => 'nullable|numeric',
            'keterangan' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $transaction->update([
            'category_id' => $request->category_id,
            'deskripsi' => $request->uraian,
            'nominal' => $request->uang_masuk - $request->uang_keluar,
            'tanggal' => $request->tanggal,
            'uraian' => $request->uraian,
            'rencana' => $request->rencana ?? 0,
            'uang_masuk' => $request->uang_masuk ?? 0,
            'uang_keluar' => $request->uang_keluar ?? 0,
            'keterangan' => $request->keterangan,
        ]);

        // Recalculate saldo
        $this->recalculateSaldo($transaction->division_id);

        return response()->json($transaction);
    }

    public function destroy(string $id)
    {
        $transaction = Transaction::findOrFail($id);
        $divisionId = $transaction->division_id;
        $transaction->delete();

        // Recalculate saldo
        $this->recalculateSaldo($divisionId);

        return response()->json(['message' => 'Transaction deleted']);
    }

    private function recalculateSaldo($divisionId)
    {
        $transactions = Transaction::where('division_id', $divisionId)
            ->orderBy('tanggal')
            ->orderBy('created_at')
            ->get();

        $saldo = 0;
        foreach ($transactions as $transaction) {
            $saldo += $transaction->uang_masuk - $transaction->uang_keluar;
            $transaction->update(['saldo_akhir' => $saldo]);
        }
    }
}
