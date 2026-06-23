<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Model FotoBukti
 *
 * Menyimpan metadata foto bukti transaksi yang telah dikonversi ke WebP.
 * File gambar tersimpan di storage/app/public/foto-bukti/
 *
 * Buat tabelnya via migration:
 *   php artisan make:migration create_foto_buktis_table
 *
 * Isi migration:
 *   Schema::create('foto_buktis', function (Blueprint $table) {
 *       $table->uuid('id')->primary();
 *       $table->string('foto_path')->nullable();   // path relatif di storage
 *       $table->string('keterangan')->nullable();
 *       $table->string('referensi')->nullable();   // mis: transaction_id
 *       $table->string('created_by')->nullable();
 *       $table->timestamps();
 *   });
 */
class FotoBukti extends Model
{
    use HasFactory;

    protected $table = 'foto_buktis';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'foto_path',
        'keterangan',
        'referensi',
        'created_by',
    ];
}
