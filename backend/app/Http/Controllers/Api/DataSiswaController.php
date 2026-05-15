<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataSiswa;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DataSiswaController extends Controller
{
    public function index()
    {
        return response()->json(DataSiswa::orderBy('nama')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama'         => 'required|string',
            'kelas'        => 'required|in:Kelompok A,Kelompok B,Kelompok Bermain',
            'tahun_ajaran' => 'required|string',
            'status'       => 'required|in:Aktif,Tidak Aktif',
        ]);

        $siswa = DataSiswa::create([
            'id'           => Str::uuid(),
            'nama'         => $request->nama,
            'kelas'        => $request->kelas,
            'tahun_ajaran' => $request->tahun_ajaran,
            'status'       => $request->status,
        ]);

        return response()->json($siswa, 201);
    }

    public function show(string $id)
    {
        return response()->json(DataSiswa::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $siswa = DataSiswa::findOrFail($id);

        $request->validate([
            'nama'         => 'required|string',
            'kelas'        => 'required|in:Kelompok A,Kelompok B,Kelompok Bermain',
            'tahun_ajaran' => 'required|string',
            'status'       => 'required|in:Aktif,Tidak Aktif',
        ]);

        $siswa->update($request->only(['nama', 'kelas', 'tahun_ajaran', 'status']));

        return response()->json($siswa->fresh());
    }

    public function destroy(string $id)
    {
        DataSiswa::findOrFail($id)->delete();
        return response()->json(['message' => 'Data siswa dihapus']);
    }
}
