<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SaldoAwalSeeder extends Seeder
{
    public function run(): void
    {
        $divisi = ['bakso', 'amanah', 'batualam', 'kembang', 'perumahan', 'tkyaris'];

        foreach ($divisi as $kode) {
            $exists = DB::table('saldo_awal_divisi')->where('kode_divisi', $kode)->exists();
            if (!$exists) {
                DB::table('saldo_awal_divisi')->insert([
                    'kode_divisi' => $kode,
                    'nominal'     => 0,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }
        }
    }
}
