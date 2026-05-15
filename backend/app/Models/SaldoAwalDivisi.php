<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaldoAwalDivisi extends Model
{
    protected $table = 'saldo_awal_divisi';

    protected $fillable = [
        'kode_divisi',
        'nominal',
    ];

    protected $casts = [
        'nominal' => 'float',
    ];
}
