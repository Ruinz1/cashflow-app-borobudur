<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabel ini menyimpan metadata foto bukti transaksi yang sudah dikonversi ke WebP.
     * File fisik tersimpan di: storage/app/public/foto-bukti/
     */
    public function up(): void
    {
        Schema::create('foto_buktis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('foto_path')->nullable()->comment('Path relatif di storage disk public, contoh: foto-bukti/uuid.webp');
            $table->string('keterangan', 500)->nullable()->comment('Deskripsi / catatan tambahan');
            $table->string('referensi', 255)->nullable()->comment('Opsional: referensi ke entitas lain, misal transaction_id');
            $table->string('created_by')->nullable()->comment('ID user yang mengupload');
            $table->timestamps();

            $table->index('referensi');
            $table->index('created_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('foto_buktis');
    }
};

