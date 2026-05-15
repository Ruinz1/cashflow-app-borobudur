<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'username',
        'password_hash',
        'nama_lengkap',
        'role',
        'status',
    ];

    protected $hidden = [
        'password_hash',
    ];

    /**
     * Laravel Sanctum / Hash::check uses the 'password' attribute by default.
     * We override getAuthPassword() to point to password_hash column.
     */
    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
