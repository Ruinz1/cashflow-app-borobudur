<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Division;
use App\Models\SaldoAwalDivisi;
use App\Models\Transaction;
use App\Models\AdmSiswa;
use App\Models\SaldoManualTkyaris;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private const DIVISI_UTAMA = ['bakso', 'amanah', 'batualam', 'kembang', 'perumahan'];
    private const ALL_DIVISI   = ['bakso', 'amanah', 'batualam', 'kembang', 'perumahan', 'tkyaris'];

    public function summary(Request $request)
    {
        $divisions    = Division::all()->keyBy('kode_divisi');
        $saldoAwalMap = SaldoAwalDivisi::all()->keyBy('kode_divisi');

        $divisiSummary = [];
        $totalPerusahaan = 0;
        $totalMasuk      = 0;
        $totalKeluar     = 0;

        foreach (self::ALL_DIVISI as $kode) {
            $division  = $divisions->get($kode);
            $saldoAwal = $kode === 'tkyaris'
                ? $this->getSaldoAwalTkyaris()
                : (float) ($saldoAwalMap->get($kode)?->nominal ?? 0);

            if (!$division) {
                $divisiSummary[$kode] = [
                    'saldo_awal'  => $saldoAwal,
                    'uang_masuk'  => 0,
                    'uang_keluar' => 0,
                    'saldo_akhir' => $saldoAwal,
                ];
                continue;
            }

            $transactions = Transaction::where('division_id', $division->id)->get();
            $masuk   = (float) $transactions->sum('uang_masuk');
            $keluar  = (float) $transactions->sum('uang_keluar');
            $saldoAk = $saldoAwal + $masuk - $keluar;

            $divisiSummary[$kode] = [
                'saldo_awal'  => $saldoAwal,
                'uang_masuk'  => $masuk,
                'uang_keluar' => $keluar,
                'saldo_akhir' => $saldoAk,
            ];

            if (in_array($kode, self::DIVISI_UTAMA)) {
                $totalPerusahaan += $saldoAk;
                $totalMasuk      += $masuk;
                $totalKeluar     += $keluar;
            }
        }

        return response()->json([
            'divisi'          => $divisiSummary,
            'total_perusahaan'=> $totalPerusahaan,
            'total_masuk'     => $totalMasuk,
            'total_keluar'    => $totalKeluar,
            'saldo_tkyaris'   => $divisiSummary['tkyaris']['saldo_akhir'] ?? 0,
        ]);
    }

    private function getSaldoAwalTkyaris(): float
    {
        $totalAdm    = (float) AdmSiswa::sum('jumlah_dibayar');
        $totalManual = (float) SaldoManualTkyaris::sum('nominal');
        return $totalAdm + $totalManual;
    }
}
