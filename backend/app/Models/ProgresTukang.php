<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProgresTukang extends Model
{
    protected $table = 'progres_tukang';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'nama_tukang',
        'lokasi',
        'total_kontrak',
        'total_terbayar',
        'sisa_progres',
        'persen_selesai',
        'status',
        'tanggal_mulai',
        'estimasi_selesai',
        'keterangan',
        'created_by',
    ];

    protected $casts = [
        'total_kontrak'   => 'float',
        'total_terbayar'  => 'float',
        'sisa_progres'    => 'float',
        'persen_selesai'  => 'float',
    ];

    public function historiProgres()
    {
        return $this->hasMany(HistoriProgresTukang::class, 'progres_tukang_id')->orderBy('tanggal');
    }
}
