<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HistoriProgresTukang extends Model
{
    protected $table = 'histori_progres_tukang';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'progres_tukang_id',
        'tanggal',
        'minggu_ke',
        'nominal',
        'blok',
        'foto_nama_file',
        'foto_tipe',
        'foto_ukuran',
        'foto_data_base64',
    ];

    protected $casts = [
        'nominal'     => 'float',
        'minggu_ke'   => 'integer',
        'foto_ukuran' => 'integer',
    ];

    public function progresTukang()
    {
        return $this->belongsTo(ProgresTukang::class);
    }
}
