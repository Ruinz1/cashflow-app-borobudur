<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HakAkses;
use Illuminate\Http\Request;

class HakAksesController extends Controller
{
    /**
     * GET /api/hak-akses
     * Returns a nested map: { role: { halaman: akses } }
     */
    public function index()
    {
        $rows = HakAkses::all();
        $result = [];
        foreach ($rows as $row) {
            $result[$row->role][$row->halaman] = $row->akses;
        }
        return response()->json($result);
    }

    /**
     * PUT /api/hak-akses
     * Accepts { role: { halaman: akses } } and saves it wholesale
     */
    public function update(Request $request)
    {
        $data = $request->validate([
            '*' => 'array',
        ]);

        // Full replace: delete all and re-insert
        HakAkses::truncate();

        $rows = [];
        $now  = now();
        foreach ($data as $role => $halaman_map) {
            if (!is_array($halaman_map)) continue;
            foreach ($halaman_map as $halaman => $akses) {
                if (!in_array($akses, ['CRUD', 'VIEW', 'NONE'])) continue;
                $rows[] = [
                    'role'       => $role,
                    'halaman'    => $halaman,
                    'akses'      => $akses,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if (!empty($rows)) {
            HakAkses::insert($rows);
        }

        return response()->json(['message' => 'Hak akses disimpan']);
    }
}
