<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JenisTagihan extends Model
{
    protected $table = 'jenis_tagihan';

    protected $fillable = [
        'kode',
        'nama',
        'nominal_default',
        'warna_badge',
        'urutan',
    ];

    protected $casts = [
        'nominal_default' => 'float',
        'urutan'          => 'integer',
    ];
}
