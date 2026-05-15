<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class JenisTagihanSeeder extends Seeder
{
    public function run(): void
    {
        $jenisTagihan = [
            ['kode' => 'SPP',     'nama' => 'SPP Bulanan',    'nominal_default' => 150000, 'warna_badge' => 'primary',   'urutan' => 1],
            ['kode' => 'INFAQ',   'nama' => 'Infaq Bulanan',  'nominal_default' => 20000,  'warna_badge' => 'success',   'urutan' => 2],
            ['kode' => 'SERAGAM', 'nama' => 'Uang Seragam',   'nominal_default' => 350000, 'warna_badge' => 'purple',    'urutan' => 3],
            ['kode' => 'IURAN',   'nama' => 'Iuran Kegiatan', 'nominal_default' => 50000,  'warna_badge' => 'warning',   'urutan' => 4],
            ['kode' => 'MAKAN',   'nama' => 'Uang Makan',     'nominal_default' => 100000, 'warna_badge' => 'info',      'urutan' => 5],
            ['kode' => 'LAINNYA', 'nama' => 'Lainnya',        'nominal_default' => 0,      'warna_badge' => 'secondary', 'urutan' => 6],
        ];

        foreach ($jenisTagihan as $jt) {
            $exists = DB::table('jenis_tagihan')->where('kode', $jt['kode'])->exists();
            if (!$exists) {
                DB::table('jenis_tagihan')->insert([
                    'kode'            => $jt['kode'],
                    'nama'            => $jt['nama'],
                    'nominal_default' => $jt['nominal_default'],
                    'warna_badge'     => $jt['warna_badge'],
                    'urutan'          => $jt['urutan'],
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]);
            }
        }
    }
}
