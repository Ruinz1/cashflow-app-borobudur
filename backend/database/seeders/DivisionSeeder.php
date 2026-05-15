<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DivisionSeeder extends Seeder
{
    public function run(): void
    {
        $divisions = [
            ['kode_divisi' => 'bakso',    'nama_divisi' => 'Bakso Bento Malang', 'color' => '#3b82f6'],
            ['kode_divisi' => 'amanah',   'nama_divisi' => 'Toko UD Amanah',     'color' => '#10b981'],
            ['kode_divisi' => 'batualam', 'nama_divisi' => 'Toko Batu Alam',     'color' => '#f59e0b'],
            ['kode_divisi' => 'kembang',  'nama_divisi' => 'Toko Kembang',       'color' => '#ec4899'],
            ['kode_divisi' => 'perumahan','nama_divisi' => 'Divisi Perumahan',   'color' => '#8b5cf6'],
            ['kode_divisi' => 'tkyaris',  'nama_divisi' => 'TK Yaris',           'color' => '#4527a0'],
        ];

        foreach ($divisions as $div) {
            $exists = DB::table('divisions')->where('kode_divisi', $div['kode_divisi'])->exists();
            if (!$exists) {
                DB::table('divisions')->insert([
                    'id'          => Str::uuid(),
                    'nama_divisi' => $div['nama_divisi'],
                    'kode_divisi' => $div['kode_divisi'],
                    'color'       => $div['color'],
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }
        }
    }
}
