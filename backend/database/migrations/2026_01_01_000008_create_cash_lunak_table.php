<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('cash_lunak_cicilan');
        Schema::dropIfExists('cash_lunak');

        Schema::create('cash_lunak', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama_pembeli');
            $table->string('blok');
            $table->string('tanggal_dp', 10); // YYYY-MM-DD
            $table->decimal('harga_unit', 15, 2)->default(0);
            $table->decimal('jumlah_dp', 15, 2)->default(0);
            $table->integer('tenor')->default(0); // bulan
            $table->text('keterangan')->nullable();
            // Dokumen lampiran (stored as base64 in DB for backward compat)
            $table->string('dokumen_nama')->nullable();
            $table->string('dokumen_tipe')->nullable();
            $table->longText('dokumen_data')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('cash_lunak_cicilan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('cash_lunak_id');
            $table->string('tanggal_bayar', 10); // YYYY-MM-DD
            $table->decimal('jumlah_bayar', 15, 2)->default(0);
            $table->text('keterangan')->nullable();
            $table->timestamps();

            $table->foreign('cash_lunak_id')->references('id')->on('cash_lunak')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_lunak_cicilan');
        Schema::dropIfExists('cash_lunak');
    }
};
