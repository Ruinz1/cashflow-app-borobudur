<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attachment extends Model
{
    use HasFactory;

    protected $table = 'attachments';

    protected $fillable = [
        'id',
        'transaction_id',
        'file_name',
        'file_path',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }
}
