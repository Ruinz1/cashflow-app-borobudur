<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Division;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DivisionController extends Controller
{
    public function index()
    {
        return response()->json(Division::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama_divisi' => 'required|string',
            'kode_divisi' => 'required|string|unique:divisions',
            'color' => 'nullable|string',
        ]);

        $division = Division::create([
            'id' => Str::uuid(),
            'nama_divisi' => $request->nama_divisi,
            'kode_divisi' => $request->kode_divisi,
            'color' => $request->color ?? '#3b82f6',
        ]);

        return response()->json($division, 201);
    }

    public function show(string $id)
    {
        $division = Division::findOrFail($id);
        return response()->json($division);
    }

    public function update(Request $request, string $id)
    {
        $division = Division::findOrFail($id);

        $request->validate([
            'nama_divisi' => 'required|string',
            'kode_divisi' => 'required|string|unique:divisions,kode_divisi,' . $id . ',id',
            'color' => 'nullable|string',
        ]);

        $division->update($request->only(['nama_divisi', 'kode_divisi', 'color']));

        return response()->json($division);
    }

    public function destroy(string $id)
    {
        $division = Division::findOrFail($id);
        $division->delete();

        return response()->json(['message' => 'Division deleted']);
    }
}
