<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProgresTukang;
use App\Models\HistoriProgresTukang;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProgresTukangController extends Controller
{
    public function index()
    {
        $data = ProgresTukang::with('historiProgres')->orderBy('created_at', 'desc')->get();
        return response()->json($data->map(fn($item) => $this->format($item)));
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama_tukang'    => 'required|string',
            'total_kontrak'  => 'required|numeric|min:0',
            'tanggal_mulai'  => 'nullable|string',
            'estimasi_selesai' => 'nullable|string',
        ]);

        $item = ProgresTukang::create([
            'id'               => Str::uuid(),
            'nama_tukang'      => $request->nama_tukang,
            'lokasi'           => $request->lokasi ?? '',
            'total_kontrak'    => $request->total_kontrak,
            'total_terbayar'   => 0,
            'sisa_progres'     => $request->total_kontrak,
            'persen_selesai'   => 0,
            'status'           => 'Belum Mulai',
            'tanggal_mulai'    => $request->tanggal_mulai ?? '',
            'estimasi_selesai' => $request->estimasi_selesai ?? '',
            'keterangan'       => $request->keterangan,
            'created_by'       => $request->user()?->id,
        ]);

        $item->load('historiProgres');
        return response()->json($this->format($item), 201);
    }

    public function show(string $id)
    {
        return response()->json($this->format(ProgresTukang::with('historiProgres')->findOrFail($id)));
    }

    public function update(Request $request, string $id)
    {
        $item = ProgresTukang::findOrFail($id);

        $request->validate([
            'nama_tukang'   => 'required|string',
            'total_kontrak' => 'required|numeric|min:0',
        ]);

        $item->update([
            'nama_tukang'      => $request->nama_tukang,
            'lokasi'           => $request->lokasi ?? $item->lokasi,
            'total_kontrak'    => $request->total_kontrak,
            'tanggal_mulai'    => $request->tanggal_mulai ?? $item->tanggal_mulai,
            'estimasi_selesai' => $request->estimasi_selesai ?? $item->estimasi_selesai,
            'keterangan'       => $request->keterangan ?? $item->keterangan,
        ]);

        $this->recalculate($item);
        $item->load('historiProgres');

        return response()->json($this->format($item->fresh(['historiProgres'])));
    }

    public function destroy(string $id)
    {
        ProgresTukang::findOrFail($id)->delete();
        return response()->json(['message' => 'Progres tukang dihapus']);
    }

    /** POST /api/progres-tukang/{id}/histori */
    public function addHistori(Request $request, string $id)
    {
        $tukang = ProgresTukang::findOrFail($id);

        $request->validate([
            'tanggal'   => 'required|string',
            'minggu_ke' => 'required|integer|min:0',
            'nominal'   => 'required|numeric|min:0',
        ]);

        $fotos = [];
        if ($request->has('fotos')) {
            $fotos = $request->input('fotos');
        } elseif ($request->has('foto') && $request->input('foto')) {
            $fotos = [$request->input('foto')];
        }

        $firstFoto = count($fotos) > 0 ? $fotos[0] : null;

        $histori = HistoriProgresTukang::create([
            'id'                => Str::uuid(),
            'progres_tukang_id' => $tukang->id,
            'tanggal'           => $request->tanggal,
            'minggu_ke'         => $request->minggu_ke,
            'nominal'           => $request->nominal,
            'blok'              => $request->blok ?? '',
            'foto_nama_file'    => $firstFoto ? ($firstFoto['nama_file'] ?? '') : null,
            'foto_tipe'         => $firstFoto ? ($firstFoto['tipe'] ?? '') : null,
            'foto_ukuran'       => $firstFoto ? ($firstFoto['ukuran'] ?? null) : null,
            'foto_data_base64'  => count($fotos) > 0 ? json_encode($fotos) : null,
        ]);

        $this->recalculate($tukang);

        return response()->json($this->formatHistori($histori), 201);
    }

    /** DELETE /api/progres-tukang/{id}/histori/{historiId} */
    public function deleteHistori(Request $request, string $id, string $historiId)
    {
        $histori = HistoriProgresTukang::where('progres_tukang_id', $id)->findOrFail($historiId);
        $histori->delete();

        $tukang = ProgresTukang::findOrFail($id);
        $this->recalculate($tukang);

        return response()->json(['message' => 'Histori dihapus']);
    }

    private function recalculate(ProgresTukang $tukang)
    {
        $tukang->refresh();
        $total_terbayar = (float) $tukang->historiProgres()->sum('nominal');
        $sisa_progres   = max(0, $tukang->total_kontrak - $total_terbayar);
        $persen         = $tukang->total_kontrak > 0
            ? min(100, round($total_terbayar / $tukang->total_kontrak * 100, 2))
            : 0;

        $status = 'Belum Mulai';
        if ($total_terbayar > 0 && $total_terbayar < $tukang->total_kontrak) $status = 'Berjalan';
        if ($total_terbayar >= $tukang->total_kontrak) $status = 'Selesai';

        $tukang->update([
            'total_terbayar' => $total_terbayar,
            'sisa_progres'   => $sisa_progres,
            'persen_selesai' => $persen,
            'status'         => $status,
        ]);
    }

    private function format(ProgresTukang $item): array
    {
        return [
            'id'               => $item->id,
            'nama_tukang'      => $item->nama_tukang,
            'lokasi'           => $item->lokasi,
            'total_kontrak'    => (float) $item->total_kontrak,
            'total_terbayar'   => (float) $item->total_terbayar,
            'sisa_progres'     => (float) $item->sisa_progres,
            'persen_selesai'   => (float) $item->persen_selesai,
            'status'           => $item->status,
            'tanggal_mulai'    => $item->tanggal_mulai,
            'estimasi_selesai' => $item->estimasi_selesai,
            'keterangan'       => $item->keterangan ?? '',
            'histori_progres'  => $item->historiProgres->map(fn($h) => $this->formatHistori($h))->values()->all(),
            'created_at'       => $item->created_at?->toISOString(),
            'updated_at'       => $item->updated_at?->toISOString(),
            'created_by'       => $item->created_by,
        ];
    }

    private function formatHistori(HistoriProgresTukang $h): array
    {
        $fotos = [];
        $isJsonList = false;

        if ($h->foto_data_base64 && str_starts_with(trim($h->foto_data_base64), '[')) {
            $decoded = json_decode($h->foto_data_base64, true);
            if (is_array($decoded)) {
                $isJsonList = true;
                $fotos = $decoded;
            }
        }

        if (!$isJsonList && $h->foto_nama_file) {
            $fotos[] = [
                'nama_file'    => $h->foto_nama_file,
                'tipe'         => $h->foto_tipe,
                'ukuran'       => (int) $h->foto_ukuran,
                'data_base64'  => $h->foto_data_base64,
            ];
        }

        return [
            'id_progres' => $h->id,
            'tanggal'    => $h->tanggal,
            'minggu_ke'  => (int) $h->minggu_ke,
            'nominal'    => (float) $h->nominal,
            'blok'       => $h->blok,
            'foto'       => count($fotos) > 0 ? $fotos[0] : null,
            'fotos'      => $fotos,
        ];
    }
}
