<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('adm_siswa');
        Schema::create('adm_siswa', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('id_siswa');
            $table->string('nama_siswa');
            $table->string('kelas');
            $table->string('jenis_tagihan'); // kode jenis tagihan
            $table->string('uraian');
            $table->string('periode_bulan', 2)->default(''); // 01-12 or ""
            $table->string('periode_tahun', 4)->default(''); // 2025 or ""
            $table->decimal('tagihan', 15, 2)->default(0);
            $table->decimal('jumlah_dibayar', 15, 2)->default(0);
            $table->decimal('sisa', 15, 2)->default(0);
            $table->enum('status', ['Lunas', 'Kurang Bayar', 'Belum Bayar'])->default('Belum Bayar');
            $table->string('tgl_transaksi', 10)->default(''); // YYYY-MM-DD or ""
            $table->string('metode_bayar', 20)->default(''); // Tunai, Transfer, ""
            $table->text('keterangan')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('id_siswa')->references('id')->on('data_siswa')->onDelete('cascade');
            $table->index(['id_siswa', 'periode_tahun', 'periode_bulan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('adm_siswa');
    }
};
