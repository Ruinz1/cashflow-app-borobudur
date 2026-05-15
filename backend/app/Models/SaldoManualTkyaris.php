<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaldoManualTkyaris extends Model
{
    protected $table = 'saldo_manual_tkyaris';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'keterangan',
        'nominal',
        'tanggal',
        'created_by',
    ];

    protected $casts = [
        'nominal' => 'float',
    ];
}
