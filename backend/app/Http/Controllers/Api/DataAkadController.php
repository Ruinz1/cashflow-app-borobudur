<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataAkad;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DataAkadController extends Controller
{
    public function index()
    {
        return response()->json(DataAkad::orderBy('tanggal_akad', 'desc')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'tanggal_akad' => 'required|string',
            'nama_user'    => 'required|string',
            'blok'         => 'required|string',
            'bank'         => 'required|string',
            'status'       => 'required|in:Cair,Belum Cair',
        ]);

        $akad = DataAkad::create([
            'id'           => Str::uuid(),
            'tanggal_akad' => $request->tanggal_akad,
            'nama_user'    => $request->nama_user,
            'blok'         => $request->blok,
            'bank'         => $request->bank,
            'status'       => $request->status,
            'tanggal_cair' => $request->tanggal_cair,
            'keterangan'   => $request->keterangan,
            'created_by'   => $request->user()?->id,
        ]);

        return response()->json($akad, 201);
    }

    public function show(string $id)
    {
        return response()->json(DataAkad::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $akad = DataAkad::findOrFail($id);

        $request->validate([
            'tanggal_akad' => 'required|string',
            'nama_user'    => 'required|string',
            'blok'         => 'required|string',
            'bank'         => 'required|string',
            'status'       => 'required|in:Cair,Belum Cair',
        ]);

        $akad->update([
            'tanggal_akad' => $request->tanggal_akad,
            'nama_user'    => $request->nama_user,
            'blok'         => $request->blok,
            'bank'         => $request->bank,
            'status'       => $request->status,
            'tanggal_cair' => $request->tanggal_cair,
            'keterangan'   => $request->keterangan,
        ]);

        return response()->json($akad->fresh());
    }

    public function destroy(string $id)
    {
        DataAkad::findOrFail($id)->delete();
        return response()->json(['message' => 'Data akad dihapus']);
    }
}
