<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Division;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary()
    {
        $divisions = Division::all();

        $summary = [];

        foreach ($divisions as $division) {
            $transactions = Transaction::where('division_id', $division->id)->get();

            $totalMasuk = $transactions->sum('uang_masuk');
            $totalKeluar = $transactions->sum('uang_keluar');
            $saldoAkhir = $transactions->last()?->saldo_akhir ?? 0;

            $summary[] = [
                'division' => $division,
                'total_masuk' => $totalMasuk,
                'total_keluar' => $totalKeluar,
                'saldo_akhir' => $saldoAkhir,
            ];
        }

        return response()->json($summary);
    }
}
