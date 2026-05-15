<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashLunakCicilan extends Model
{
    protected $table = 'cash_lunak_cicilan';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'cash_lunak_id',
        'tanggal_bayar',
        'jumlah_bayar',
        'keterangan',
    ];

    protected $casts = [
        'jumlah_bayar' => 'float',
    ];

    public function cashLunak()
    {
        return $this->belongsTo(CashLunak::class);
    }
}
