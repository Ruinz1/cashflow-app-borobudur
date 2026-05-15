<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportDokumen extends Model
{
    protected $table = 'import_dokumen';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'unit',
        'tanggal',
        'keterangan',
        'kategori',
        'debit',
        'kredit',
        'saldo',
        'catatan',
        'source_file',
        'dedup_key',
        'synced',
        'synced_at',
        'synced_transaksi_id',
        'created_by',
    ];

    protected $casts = [
        'debit'   => 'float',
        'kredit'  => 'float',
        'saldo'   => 'float',
        'synced'  => 'boolean',
        'synced_at' => 'datetime',
    ];
}
