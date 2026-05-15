<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashLunak extends Model
{
    use HasFactory;

    protected $table = 'cash_lunak';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'nama_pembeli',
        'blok',
        'tanggal_dp',
        'harga_unit',
        'jumlah_dp',
        'tenor',
        'keterangan',
        'dokumen_nama',
        'dokumen_tipe',
        'dokumen_data',
        'created_by',
    ];

    protected $casts = [
        'harga_unit'  => 'float',
        'jumlah_dp'   => 'float',
        'tenor'       => 'integer',
    ];

    public function cicilan()
    {
        return $this->hasMany(CashLunakCicilan::class);
    }
}
