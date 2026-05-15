<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('histori_progres_tukang');
        Schema::dropIfExists('progres_tukang');

        Schema::create('progres_tukang', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama_tukang');
            $table->string('lokasi')->default('');
            $table->decimal('total_kontrak', 15, 2)->default(0);
            $table->decimal('total_terbayar', 15, 2)->default(0);
            $table->decimal('sisa_progres', 15, 2)->default(0);
            $table->decimal('persen_selesai', 5, 2)->default(0);
            $table->enum('status', ['Belum Mulai', 'Berjalan', 'Selesai'])->default('Belum Mulai');
            $table->string('tanggal_mulai', 10)->default(''); // YYYY-MM-DD
            $table->string('estimasi_selesai', 10)->default(''); // YYYY-MM-DD
            $table->text('keterangan')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('histori_progres_tukang', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('progres_tukang_id');
            $table->string('tanggal', 10); // YYYY-MM-DD
            $table->integer('minggu_ke')->default(0);
            $table->decimal('nominal', 15, 2)->default(0);
            $table->string('blok')->default('');
            // Foto disimpan sebagai base64 di DB
            $table->string('foto_nama_file')->nullable();
            $table->string('foto_tipe')->nullable();
            $table->bigInteger('foto_ukuran')->nullable();
            $table->longText('foto_data_base64')->nullable();
            $table->timestamps();

            $table->foreign('progres_tukang_id')->references('id')->on('progres_tukang')->onDelete('cascade');
            $table->index(['progres_tukang_id', 'tanggal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('histori_progres_tukang');
        Schema::dropIfExists('progres_tukang');
    }
};
