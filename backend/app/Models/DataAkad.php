<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DataAkad extends Model
{
    use HasFactory;

    protected $table = 'data_akad';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tanggal_akad',
        'nama_user',
        'blok',
        'bank',
        'status',
        'tanggal_cair',
        'keterangan',
        'created_by',
    ];
}
