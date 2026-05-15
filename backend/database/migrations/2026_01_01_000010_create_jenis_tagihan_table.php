<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('jenis_tagihan');
        Schema::create('jenis_tagihan', function (Blueprint $table) {
            $table->id();
            $table->string('kode')->unique(); // SPP, INFAQ, SERAGAM, etc.
            $table->string('nama');
            $table->decimal('nominal_default', 15, 2)->default(0);
            $table->string('warna_badge', 30)->default('primary'); // primary, success, warning, etc.
            $table->integer('urutan')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jenis_tagihan');
    }
};
