<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $table = 'transactions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'division_id',
        'tanggal',
        'uraian',
        'rencana',
        'uang_masuk',
        'uang_keluar',
        'saldo_akhir',
        'keterangan',
        'created_by',
    ];

    protected $casts = [
        'rencana'     => 'float',
        'uang_masuk'  => 'float',
        'uang_keluar' => 'float',
        'saldo_akhir' => 'float',
    ];

    public function division()
    {
        return $this->belongsTo(Division::class);
    }

    public function notes()
    {
        return $this->hasMany(TransactionNote::class);
    }
}
