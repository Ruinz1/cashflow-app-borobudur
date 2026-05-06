<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Division extends Model
{
    use HasFactory;

    protected $table = 'divisions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'nama_divisi',
        'kode_divisi',
        'color',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function cashflowSummaries()
    {
        return $this->hasMany(CashflowSummary::class);
    }

    public function saldoAwal()
    {
        return $this->hasOne(SaldoAwalDivisi::class);
    }
}
