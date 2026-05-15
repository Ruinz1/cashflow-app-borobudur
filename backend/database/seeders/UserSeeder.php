<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['username' => 'admin',          'nama_lengkap' => 'Administrator',       'password' => 'admin123',  'role' => 'admin'],
            ['username' => 'owner',          'nama_lengkap' => 'Owner',               'password' => 'owner123',  'role' => 'owner'],
            ['username' => 'staff_bakso',    'nama_lengkap' => 'Staff Bakso Bento',   'password' => 'staff123',  'role' => 'staff_bakso'],
            ['username' => 'staff_amanah',   'nama_lengkap' => 'Staff UD Amanah',     'password' => 'staff123',  'role' => 'staff_amanah'],
            ['username' => 'staff_batualam', 'nama_lengkap' => 'Staff Batu Alam',     'password' => 'staff123',  'role' => 'staff_batualam'],
            ['username' => 'staff_kembang',  'nama_lengkap' => 'Staff Toko Kembang',  'password' => 'staff123',  'role' => 'staff_kembang'],
            ['username' => 'staff_perumahan','nama_lengkap' => 'Staff Perumahan',      'password' => 'staff123',  'role' => 'staff_perumahan'],
            ['username' => 'staff_tkyaris',  'nama_lengkap' => 'Staff TK Yaris',      'password' => 'staff123',  'role' => 'staff_tkyaris'],
        ];

        foreach ($users as $u) {
            $exists = DB::table('users')->where('username', $u['username'])->exists();
            if (!$exists) {
                DB::table('users')->insert([
                    'id'            => Str::uuid(),
                    'username'      => $u['username'],
                    'password_hash' => Hash::make($u['password']),
                    'nama_lengkap'  => $u['nama_lengkap'],
                    'role'          => $u['role'],
                    'status'        => 'aktif',
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }
        }
    }
}
