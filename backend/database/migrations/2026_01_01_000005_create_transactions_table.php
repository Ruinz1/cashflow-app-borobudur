<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('transactions');
        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('division_id');
            $table->string('tanggal', 10); // YYYY-MM-DD
            $table->string('uraian');
            $table->decimal('rencana', 15, 2)->default(0);
            $table->decimal('uang_masuk', 15, 2)->default(0);
            $table->decimal('uang_keluar', 15, 2)->default(0);
            $table->decimal('saldo_akhir', 15, 2)->default(0);
            $table->text('keterangan')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('division_id')->references('id')->on('divisions')->onDelete('cascade');
            $table->index(['division_id', 'tanggal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
