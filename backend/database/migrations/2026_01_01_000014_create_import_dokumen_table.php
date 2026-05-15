<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('import_dokumen');
        Schema::create('import_dokumen', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('unit', ['amanah', 'batualam']); // ImportableUnit
            $table->string('tanggal', 10); // YYYY-MM-DD
            $table->string('keterangan');
            $table->string('kategori')->default('');
            $table->decimal('debit', 15, 2)->default(0); // uang_masuk
            $table->decimal('kredit', 15, 2)->default(0); // uang_keluar
            $table->decimal('saldo', 15, 2)->default(0); // saldo dari file sumber
            $table->text('catatan')->nullable();
            $table->string('source_file');
            $table->string('dedup_key'); // for deduplication
            $table->boolean('synced')->default(false);
            $table->timestamp('synced_at')->nullable();
            $table->uuid('synced_transaksi_id')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->index(['unit', 'synced']);
            $table->unique(['unit', 'dedup_key']); // prevent duplicates per unit
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_dokumen');
    }
};
