<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashflowSummary extends Model
{
    use HasFactory;

    protected $table = 'cashflow_summary';

    protected $fillable = [
        'id',
        'division_id',
        'periode',
        'total_masuk',
        'total_keluar',
        'saldo_akhir',
        'updated_at',
    ];

    protected $casts = [
        'total_masuk' => 'float',
        'total_keluar' => 'float',
        'saldo_akhir' => 'float',
        'updated_at' => 'datetime',
    ];

    public function division()
    {
        return $this->belongsTo(Division::class);
    }
}
