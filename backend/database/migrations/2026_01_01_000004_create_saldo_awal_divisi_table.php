<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saldo_awal_divisi', function (Blueprint $table) {
            $table->id();
            $table->string('kode_divisi')->unique(); // bakso, amanah, batualam, kembang, perumahan, tkyaris
            $table->decimal('nominal', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saldo_awal_divisi');
    }
};
