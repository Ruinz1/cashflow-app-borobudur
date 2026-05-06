<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Division;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function monthly(Request $request)
    {
        $year = $request->get('year', date('Y'));

        $reports = Transaction::select(
            'division_id',
            DB::raw('MONTH(tanggal) as month'),
            DB::raw('SUM(uang_masuk) as total_masuk'),
            DB::raw('SUM(uang_keluar) as total_keluar'),
            DB::raw('SUM(uang_masuk - uang_keluar) as net')
        )
        ->whereYear('tanggal', $year)
        ->groupBy('division_id', DB::raw('MONTH(tanggal)'))
        ->with('division')
        ->get();

        return response()->json($reports);
    }

    public function yearly(Request $request)
    {
        $reports = Transaction::select(
            'division_id',
            DB::raw('YEAR(tanggal) as year'),
            DB::raw('SUM(uang_masuk) as total_masuk'),
            DB::raw('SUM(uang_keluar) as total_keluar'),
            DB::raw('SUM(uang_masuk - uang_keluar) as net')
        )
        ->groupBy('division_id', DB::raw('YEAR(tanggal)'))
        ->with('division')
        ->get();

        return response()->json($reports);
    }

    public function division(Request $request, $division)
    {
        $divisionModel = Division::where('kode_divisi', $division)->firstOrFail();

        $reports = Transaction::select(
            DB::raw('YEAR(tanggal) as year'),
            DB::raw('MONTH(tanggal) as month'),
            DB::raw('SUM(uang_masuk) as total_masuk'),
            DB::raw('SUM(uang_keluar) as total_keluar'),
            DB::raw('SUM(uang_masuk - uang_keluar) as net')
        )
        ->where('division_id', $divisionModel->id)
        ->groupBy(DB::raw('YEAR(tanggal)'), DB::raw('MONTH(tanggal)'))
        ->orderBy('year')
        ->orderBy('month')
        ->get();

        return response()->json($reports);
    }
}
