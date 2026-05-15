<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hak_akses', function (Blueprint $table) {
            $table->id();
            $table->string('role');
            $table->string('halaman'); // dashboard, bakso, amanah, etc.
            $table->enum('akses', ['CRUD', 'VIEW', 'NONE'])->default('NONE');
            $table->timestamps();

            $table->unique(['role', 'halaman']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hak_akses');
    }
};
