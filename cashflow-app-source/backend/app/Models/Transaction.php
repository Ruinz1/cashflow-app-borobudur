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
        'category_id',
        'jenis_transaksi',
        'deskripsi',
        'nominal',
        'tanggal',
        'uraian',
        'rencana',
        'uang_masuk',
        'uang_keluar',
        'saldo_akhir',
        'keterangan',
        'nota_nama',
        'nota_tipe',
        'nota_data',
        'created_by',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'nominal' => 'float',
        'rencana' => 'float',
        'uang_masuk' => 'float',
        'uang_keluar' => 'float',
        'saldo_akhir' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function division()
    {
        return $this->belongsTo(Division::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function attachments()
    {
        return $this->hasMany(Attachment::class);
    }
}
