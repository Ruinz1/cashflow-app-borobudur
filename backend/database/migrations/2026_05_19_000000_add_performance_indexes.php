<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        try {
            Schema::table('transactions', function (Blueprint $table) {
                $table->index('tanggal');
                $table->index('division_id');
                $table->index('created_at');
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('progres_tukang', function (Blueprint $table) {
                $table->index('created_at');
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('data_akad', function (Blueprint $table) {
                $table->index('tanggal_akad');
            });
        } catch (\Exception $e) {}

        try {
            Schema::table('users', function (Blueprint $table) {
                $table->index('created_at');
            });
        } catch (\Exception $e) {}
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['tanggal']);
            $table->dropIndex(['division_id']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('progres_tukang', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        Schema::table('data_akad', function (Blueprint $table) {
            $table->dropIndex(['tanggal_akad']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });
    }
};
