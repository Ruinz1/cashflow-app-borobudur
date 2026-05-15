<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SaldoManualTkyaris;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SaldoManualController extends Controller
{
    public function index()
    {
        return response()->json(SaldoManualTkyaris::orderBy('tanggal')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'keterangan' => 'required|string|min:3',
            'nominal'    => 'required|numeric|min:1',
            'tanggal'    => 'required|string',
        ]);

        $entry = SaldoManualTkyaris::create([
            'id'         => Str::uuid(),
            'keterangan' => $request->keterangan,
            'nominal'    => $request->nominal,
            'tanggal'    => $request->tanggal,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json($entry, 201);
    }

    public function show(string $id)
    {
        return response()->json(SaldoManualTkyaris::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $entry = SaldoManualTkyaris::findOrFail($id);

        $request->validate([
            'keterangan' => 'required|string|min:3',
            'nominal'    => 'required|numeric|min:1',
            'tanggal'    => 'required|string',
        ]);

        $entry->update($request->only(['keterangan', 'nominal', 'tanggal']));

        return response()->json($entry->fresh());
    }

    public function destroy(string $id)
    {
        SaldoManualTkyaris::findOrFail($id)->delete();
        return response()->json(['message' => 'Entri saldo manual dihapus']);
    }
}
