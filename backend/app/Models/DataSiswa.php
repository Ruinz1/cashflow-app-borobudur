<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataSiswa extends Model
{
    protected $table = 'data_siswa';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'nama',
        'kelas',
        'tahun_ajaran',
        'status',
    ];

    public function admSiswa()
    {
        return $this->hasMany(AdmSiswa::class, 'id_siswa');
    }
}
