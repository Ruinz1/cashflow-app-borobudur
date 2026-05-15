<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransactionNote extends Model
{
    protected $table = 'transaction_notes';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'transaction_id',
        'nama',
        'tipe',
        'data',
    ];

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }
}
