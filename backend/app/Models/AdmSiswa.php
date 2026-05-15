<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdmSiswa extends Model
{
    protected $table = 'adm_siswa';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'id_siswa',
        'nama_siswa',
        'kelas',
        'jenis_tagihan',
        'uraian',
        'periode_bulan',
        'periode_tahun',
        'tagihan',
        'jumlah_dibayar',
        'sisa',
        'status',
        'tgl_transaksi',
        'metode_bayar',
        'keterangan',
        'created_by',
    ];

    protected $casts = [
        'tagihan'        => 'float',
        'jumlah_dibayar' => 'float',
        'sisa'           => 'float',
    ];

    public function siswa()
    {
        return $this->belongsTo(DataSiswa::class, 'id_siswa');
    }
}
