<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdmSiswa;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdmSiswaController extends Controller
{
    public function index(Request $request)
    {
        $query = AdmSiswa::query();

        if ($request->has('id_siswa') && $request->id_siswa) {
            $query->where('id_siswa', $request->id_siswa);
        }
        if ($request->has('periode_tahun') && $request->periode_tahun) {
            $query->where('periode_tahun', $request->periode_tahun);
        }
        if ($request->has('periode_bulan') && $request->periode_bulan) {
            $query->where('periode_bulan', $request->periode_bulan);
        }
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'id_siswa'      => 'required|exists:data_siswa,id',
            'nama_siswa'    => 'required|string',
            'kelas'         => 'required|string',
            'jenis_tagihan' => 'required|string',
            'uraian'        => 'required|string',
            'tagihan'       => 'required|numeric|min:0',
            'jumlah_dibayar'=> 'required|numeric|min:0',
        ]);

        $sisa   = max(0, $request->tagihan - $request->jumlah_dibayar);
        $status = $this->calcStatus($request->tagihan, $request->jumlah_dibayar);

        $adm = AdmSiswa::create([
            'id'             => Str::uuid(),
            'id_siswa'       => $request->id_siswa,
            'nama_siswa'     => $request->nama_siswa,
            'kelas'          => $request->kelas,
            'jenis_tagihan'  => $request->jenis_tagihan,
            'uraian'         => $request->uraian,
            'periode_bulan'  => $request->periode_bulan ?? '',
            'periode_tahun'  => $request->periode_tahun ?? '',
            'tagihan'        => $request->tagihan,
            'jumlah_dibayar' => $request->jumlah_dibayar,
            'sisa'           => $sisa,
            'status'         => $status,
            'tgl_transaksi'  => $request->tgl_transaksi ?? '',
            'metode_bayar'   => $request->metode_bayar ?? '',
            'keterangan'     => $request->keterangan,
            'created_by'     => $request->user()?->id,
        ]);

        return response()->json($adm, 201);
    }

    public function show(string $id)
    {
        return response()->json(AdmSiswa::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $adm = AdmSiswa::findOrFail($id);

        $request->validate([
            'tagihan'        => 'required|numeric|min:0',
            'jumlah_dibayar' => 'required|numeric|min:0',
        ]);

        $sisa   = max(0, $request->tagihan - $request->jumlah_dibayar);
        $status = $this->calcStatus($request->tagihan, $request->jumlah_dibayar);

        $adm->update([
            'id_siswa'       => $request->id_siswa ?? $adm->id_siswa,
            'nama_siswa'     => $request->nama_siswa ?? $adm->nama_siswa,
            'kelas'          => $request->kelas ?? $adm->kelas,
            'jenis_tagihan'  => $request->jenis_tagihan ?? $adm->jenis_tagihan,
            'uraian'         => $request->uraian ?? $adm->uraian,
            'periode_bulan'  => $request->input('periode_bulan', $adm->periode_bulan),
            'periode_tahun'  => $request->input('periode_tahun', $adm->periode_tahun),
            'tagihan'        => $request->tagihan,
            'jumlah_dibayar' => $request->jumlah_dibayar,
            'sisa'           => $sisa,
            'status'         => $status,
            'tgl_transaksi'  => $request->input('tgl_transaksi', $adm->tgl_transaksi),
            'metode_bayar'   => $request->input('metode_bayar', $adm->metode_bayar),
            'keterangan'     => $request->input('keterangan', $adm->keterangan),
        ]);

        return response()->json($adm->fresh());
    }

    public function destroy(string $id)
    {
        AdmSiswa::findOrFail($id)->delete();
        return response()->json(['message' => 'Adm siswa dihapus']);
    }

    /**
     * GET /api/adm-siswa/summary/saldo
     * Returns total saldo terbayar per siswa (for TK Yaris saldo awal calculation)
     */
    public function saldoSummary()
    {
        $total_saldo = (float) AdmSiswa::sum('jumlah_dibayar');

        $rincian = AdmSiswa::selectRaw('id_siswa, nama_siswa as nama, SUM(jumlah_dibayar) as total_terbayar')
            ->groupBy('id_siswa', 'nama_siswa')
            ->get()
            ->map(fn($r) => [
                'id_siswa'      => $r->id_siswa,
                'nama'          => $r->nama,
                'total_terbayar'=> (float) $r->total_terbayar,
            ])
            ->values()
            ->all();

        return response()->json([
            'total_saldo' => $total_saldo,
            'rincian'     => $rincian,
        ]);
    }

    private function calcStatus(float $tagihan, float $dibayar): string
    {
        if ($dibayar <= 0) return 'Belum Bayar';
        if ($dibayar >= $tagihan) return 'Lunas';
        return 'Kurang Bayar';
    }
}
