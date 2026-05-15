<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class HakAksesSeeder extends Seeder
{
    public function run(): void
    {
        $hakAkses = [
            'owner' => [
                'dashboard' => 'VIEW', 'bakso' => 'CRUD',  'amanah' => 'CRUD',
                'batualam'  => 'CRUD', 'kembang' => 'CRUD','perumahan' => 'CRUD',
                'tkyaris'   => 'CRUD', 'akad' => 'VIEW',   'cashlunak' => 'VIEW',
                'admsiswa'  => 'VIEW', 'progrestukang' => 'VIEW', 'laporan' => 'VIEW',
                'pengaturan'=> 'NONE',
            ],
            'admin' => [
                'dashboard' => 'VIEW', 'bakso' => 'CRUD',  'amanah' => 'CRUD',
                'batualam'  => 'CRUD', 'kembang' => 'CRUD','perumahan' => 'CRUD',
                'tkyaris'   => 'CRUD', 'akad' => 'CRUD',   'cashlunak' => 'CRUD',
                'admsiswa'  => 'CRUD', 'progrestukang' => 'CRUD', 'laporan' => 'VIEW',
                'pengaturan'=> 'CRUD',
            ],
            'staff_bakso' => [
                'dashboard' => 'VIEW', 'bakso' => 'CRUD',  'amanah' => 'NONE',
                'batualam'  => 'NONE', 'kembang' => 'NONE','perumahan' => 'NONE',
                'tkyaris'   => 'NONE', 'akad' => 'NONE',   'cashlunak' => 'NONE',
                'admsiswa'  => 'NONE', 'progrestukang' => 'NONE', 'laporan' => 'NONE',
                'pengaturan'=> 'NONE',
            ],
            'staff_amanah' => [
                'dashboard' => 'VIEW', 'bakso' => 'NONE',  'amanah' => 'CRUD',
                'batualam'  => 'NONE', 'kembang' => 'NONE','perumahan' => 'NONE',
                'tkyaris'   => 'NONE', 'akad' => 'NONE',   'cashlunak' => 'NONE',
                'admsiswa'  => 'NONE', 'progrestukang' => 'NONE', 'laporan' => 'NONE',
                'pengaturan'=> 'NONE',
            ],
            'staff_batualam' => [
                'dashboard' => 'VIEW', 'bakso' => 'NONE',  'amanah' => 'NONE',
                'batualam'  => 'CRUD', 'kembang' => 'NONE','perumahan' => 'NONE',
                'tkyaris'   => 'NONE', 'akad' => 'NONE',   'cashlunak' => 'NONE',
                'admsiswa'  => 'NONE', 'progrestukang' => 'NONE', 'laporan' => 'NONE',
                'pengaturan'=> 'NONE',
            ],
            'staff_kembang' => [
                'dashboard' => 'VIEW', 'bakso' => 'NONE',  'amanah' => 'NONE',
                'batualam'  => 'NONE', 'kembang' => 'CRUD','perumahan' => 'NONE',
                'tkyaris'   => 'NONE', 'akad' => 'NONE',   'cashlunak' => 'NONE',
                'admsiswa'  => 'NONE', 'progrestukang' => 'NONE', 'laporan' => 'NONE',
                'pengaturan'=> 'NONE',
            ],
            'staff_perumahan' => [
                'dashboard' => 'VIEW', 'bakso' => 'NONE',  'amanah' => 'NONE',
                'batualam'  => 'NONE', 'kembang' => 'NONE','perumahan' => 'CRUD',
                'tkyaris'   => 'NONE', 'akad' => 'CRUD',   'cashlunak' => 'CRUD',
                'admsiswa'  => 'NONE', 'progrestukang' => 'CRUD', 'laporan' => 'NONE',
                'pengaturan'=> 'NONE',
            ],
            'staff_tkyaris' => [
                'dashboard' => 'VIEW', 'bakso' => 'NONE',  'amanah' => 'NONE',
                'batualam'  => 'NONE', 'kembang' => 'NONE','perumahan' => 'NONE',
                'tkyaris'   => 'CRUD', 'akad' => 'NONE',   'cashlunak' => 'NONE',
                'admsiswa'  => 'CRUD', 'progrestukang' => 'NONE', 'laporan' => 'NONE',
                'pengaturan'=> 'NONE',
            ],
        ];

        foreach ($hakAkses as $role => $halamanMap) {
            foreach ($halamanMap as $halaman => $akses) {
                $exists = DB::table('hak_akses')
                    ->where('role', $role)
                    ->where('halaman', $halaman)
                    ->exists();

                if (!$exists) {
                    DB::table('hak_akses')->insert([
                        'role'       => $role,
                        'halaman'    => $halaman,
                        'akses'      => $akses,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }
}
