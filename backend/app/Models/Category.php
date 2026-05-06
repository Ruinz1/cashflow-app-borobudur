<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $table = 'categories';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'nama_kategori',
        'tipe',
    ];

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
