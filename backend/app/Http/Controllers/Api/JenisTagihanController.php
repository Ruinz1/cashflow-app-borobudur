<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JenisTagihan;
use Illuminate\Http\Request;

class JenisTagihanController extends Controller
{
    public function index()
    {
        return response()->json(JenisTagihan::orderBy('urutan')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'kode'            => 'required|string|unique:jenis_tagihan,kode',
            'nama'            => 'required|string',
            'nominal_default' => 'required|numeric|min:0',
            'warna_badge'     => 'nullable|string',
        ]);

        $maxUrutan = JenisTagihan::max('urutan') ?? 0;

        $jenis = JenisTagihan::create([
            'kode'            => strtoupper($request->kode),
            'nama'            => $request->nama,
            'nominal_default' => $request->nominal_default,
            'warna_badge'     => $request->warna_badge ?? 'primary',
            'urutan'          => $maxUrutan + 1,
        ]);

        return response()->json($jenis, 201);
    }

    public function show(string $id)
    {
        return response()->json(JenisTagihan::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $jenis = JenisTagihan::findOrFail($id);

        $request->validate([
            'kode'            => 'required|string|unique:jenis_tagihan,kode,' . $id,
            'nama'            => 'required|string',
            'nominal_default' => 'required|numeric|min:0',
            'warna_badge'     => 'nullable|string',
        ]);

        $jenis->update($request->only(['kode', 'nama', 'nominal_default', 'warna_badge']));

        return response()->json($jenis->fresh());
    }

    public function destroy(string $id)
    {
        JenisTagihan::findOrFail($id)->delete();
        return response()->json(['message' => 'Jenis tagihan dihapus']);
    }
}
