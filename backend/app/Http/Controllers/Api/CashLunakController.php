<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashLunak;
use App\Models\CashLunakCicilan;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CashLunakController extends Controller
{
    public function index()
    {
        $data = CashLunak::with('cicilan')->orderBy('tanggal_dp', 'desc')->get();
        return response()->json($data->map(fn($item) => $this->format($item)));
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama_pembeli' => 'required|string',
            'blok'         => 'required|string',
            'tanggal_dp'   => 'required|string',
            'harga_unit'   => 'required|numeric|min:0',
            'jumlah_dp'    => 'required|numeric|min:0',
            'tenor'        => 'required|integer|min:0',
        ]);

        $item = CashLunak::create([
            'id'           => Str::uuid(),
            'nama_pembeli' => $request->nama_pembeli,
            'blok'         => $request->blok,
            'tanggal_dp'   => $request->tanggal_dp,
            'harga_unit'   => $request->harga_unit,
            'jumlah_dp'    => $request->jumlah_dp,
            'tenor'        => $request->tenor,
            'keterangan'   => $request->keterangan,
            'dokumen_nama' => $request->input('dokumen.nama'),
            'dokumen_tipe' => $request->input('dokumen.tipe'),
            'dokumen_data' => $request->input('dokumen.data'),
            'created_by'   => $request->user()?->id,
        ]);

        $item->load('cicilan');
        return response()->json($this->format($item), 201);
    }

    public function show(string $id)
    {
        return response()->json($this->format(CashLunak::with('cicilan')->findOrFail($id)));
    }

    public function update(Request $request, string $id)
    {
        $item = CashLunak::findOrFail($id);

        $request->validate([
            'nama_pembeli' => 'required|string',
            'blok'         => 'required|string',
            'tanggal_dp'   => 'required|string',
            'harga_unit'   => 'required|numeric|min:0',
            'jumlah_dp'    => 'required|numeric|min:0',
            'tenor'        => 'required|integer|min:0',
        ]);

        $data = [
            'nama_pembeli' => $request->nama_pembeli,
            'blok'         => $request->blok,
            'tanggal_dp'   => $request->tanggal_dp,
            'harga_unit'   => $request->harga_unit,
            'jumlah_dp'    => $request->jumlah_dp,
            'tenor'        => $request->tenor,
            'keterangan'   => $request->keterangan,
        ];

        // Update dokumen jika ada yang baru
        if ($request->has('dokumen') && $request->dokumen) {
            $data['dokumen_nama'] = $request->input('dokumen.nama');
            $data['dokumen_tipe'] = $request->input('dokumen.tipe');
            $data['dokumen_data'] = $request->input('dokumen.data');
        } elseif ($request->dokumen === null) {
            // Hapus dokumen
            $data['dokumen_nama'] = null;
            $data['dokumen_tipe'] = null;
            $data['dokumen_data'] = null;
        }

        $item->update($data);
        $item->load('cicilan');

        return response()->json($this->format($item->fresh(['cicilan'])));
    }

    public function destroy(string $id)
    {
        CashLunak::findOrFail($id)->delete(); // cascade deletes cicilan
        return response()->json(['message' => 'Cash lunak dihapus']);
    }

    /** POST /api/cash-lunak/{id}/cicilan */
    public function addCicilan(Request $request, string $id)
    {
        $item = CashLunak::findOrFail($id);

        $request->validate([
            'tanggal_bayar' => 'required|string',
            'jumlah_bayar'  => 'required|numeric|min:1',
        ]);

        $cicilan = CashLunakCicilan::create([
            'id'            => Str::uuid(),
            'cash_lunak_id' => $item->id,
            'tanggal_bayar' => $request->tanggal_bayar,
            'jumlah_bayar'  => $request->jumlah_bayar,
            'keterangan'    => $request->keterangan,
        ]);

        return response()->json($cicilan, 201);
    }

    /** DELETE /api/cash-lunak/{id}/cicilan/{cicilanId} */
    public function deleteCicilan(Request $request, string $id, string $cicilanId)
    {
        $cicilan = CashLunakCicilan::where('cash_lunak_id', $id)->findOrFail($cicilanId);
        $cicilan->delete();
        return response()->json(['message' => 'Cicilan dihapus']);
    }

    private function format(CashLunak $item): array
    {
        $cicilan = $item->cicilan->map(fn($c) => [
            'id'            => $c->id,
            'tanggal_bayar' => $c->tanggal_bayar,
            'jumlah_bayar'  => (float) $c->jumlah_bayar,
            'keterangan'    => $c->keterangan ?? '',
        ])->values()->all();

        $dokumen = null;
        if ($item->dokumen_nama) {
            $dokumen = [
                'nama' => $item->dokumen_nama,
                'tipe' => $item->dokumen_tipe,
                'data' => $item->dokumen_data,
            ];
        }

        return [
            'id'           => $item->id,
            'nama_pembeli' => $item->nama_pembeli,
            'blok'         => $item->blok,
            'tanggal_dp'   => $item->tanggal_dp,
            'harga_unit'   => (float) $item->harga_unit,
            'jumlah_dp'    => (float) $item->jumlah_dp,
            'tenor'        => (int) $item->tenor,
            'keterangan'   => $item->keterangan ?? '',
            'cicilan'      => $cicilan,
            'dokumen'      => $dokumen,
            'created_at'   => $item->created_at?->toISOString(),
            'updated_at'   => $item->updated_at?->toISOString(),
        ];
    }
}
