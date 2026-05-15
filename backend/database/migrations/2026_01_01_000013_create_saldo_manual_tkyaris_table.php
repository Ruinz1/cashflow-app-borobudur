<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('saldo_manual_tkyaris');
        Schema::create('saldo_manual_tkyaris', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('keterangan');
            $table->decimal('nominal', 15, 2)->default(0);
            $table->string('tanggal', 10); // YYYY-MM-DD
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saldo_manual_tkyaris');
    }
};
