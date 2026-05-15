<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('data_akad');
        Schema::create('data_akad', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tanggal_akad', 10); // YYYY-MM-DD
            $table->string('nama_user');
            $table->string('blok');
            $table->string('bank');
            $table->enum('status', ['Cair', 'Belum Cair'])->default('Belum Cair');
            $table->string('tanggal_cair', 10)->nullable();
            $table->text('keterangan')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_akad');
    }
};
