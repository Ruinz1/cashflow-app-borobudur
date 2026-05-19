<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\HakAksesController;
use App\Http\Controllers\Api\DivisionController;
use App\Http\Controllers\Api\SaldoAwalController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\DataAkadController;
use App\Http\Controllers\Api\CashLunakController;
use App\Http\Controllers\Api\DataSiswaController;
use App\Http\Controllers\Api\JenisTagihanController;
use App\Http\Controllers\Api\AdmSiswaController;
use App\Http\Controllers\Api\ProgresTukangController;
use App\Http\Controllers\Api\SaldoManualController;
use App\Http\Controllers\Api\ImportDokumenController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ReportController;

// ─── Auth (public) ────────────────────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);

// ─── Auth (protected) ─────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);
    Route::get('/user',    fn(Request $r) => $r->user());

    // ── Users ────────────────────────────────────────────────────────────────
    Route::apiResource('users', UserController::class);

    // ── Hak Akses ────────────────────────────────────────────────────────────
    Route::get('/hak-akses',  [HakAksesController::class, 'index']);
    Route::put('/hak-akses',  [HakAksesController::class, 'update']);

    // ── Divisi ───────────────────────────────────────────────────────────────
    Route::apiResource('divisions', DivisionController::class);

    // ── Saldo Awal ───────────────────────────────────────────────────────────
    Route::get('/saldo-awal',             [SaldoAwalController::class, 'index']);
    Route::put('/saldo-awal/{divisi}',    [SaldoAwalController::class, 'update']);

    // ── Transaksi Cashflow ────────────────────────────────────────────────────
    Route::get('/transactions',                        [TransactionController::class, 'index']);
    Route::get('/transactions/nota/{id}',              [TransactionController::class, 'getNota']);
    Route::get('/transactions/{division}',             [TransactionController::class, 'index']);
    Route::post('/transactions/{division}',            [TransactionController::class, 'store']);
    Route::get('/transactions/{division}/{id}',        [TransactionController::class, 'show']);
    Route::put('/transactions/{division}/{id}',        [TransactionController::class, 'update']);
    Route::delete('/transactions/{division}/{id}',     [TransactionController::class, 'destroy']);

    // ── Data Akad ────────────────────────────────────────────────────────────
    Route::apiResource('data-akad', DataAkadController::class);

    // ── Cash Lunak ───────────────────────────────────────────────────────────
    Route::apiResource('cash-lunak', CashLunakController::class);
    Route::post('/cash-lunak/{id}/cicilan',                    [CashLunakController::class, 'addCicilan']);
    Route::delete('/cash-lunak/{id}/cicilan/{cicilanId}',      [CashLunakController::class, 'deleteCicilan']);

    // ── TK Yaris: Data Siswa ─────────────────────────────────────────────────
    Route::apiResource('data-siswa', DataSiswaController::class);

    // ── TK Yaris: Jenis Tagihan ──────────────────────────────────────────────
    Route::apiResource('jenis-tagihan', JenisTagihanController::class);

    // ── TK Yaris: Adm Siswa ──────────────────────────────────────────────────
    Route::get('/adm-siswa/summary/saldo', [AdmSiswaController::class, 'saldoSummary']);
    Route::apiResource('adm-siswa', AdmSiswaController::class);

    // ── TK Yaris: Saldo Manual ───────────────────────────────────────────────
    Route::apiResource('saldo-manual-tkyaris', SaldoManualController::class);

    // ── Perumahan: Progres Tukang ─────────────────────────────────────────────
    Route::apiResource('progres-tukang', ProgresTukangController::class);
    Route::post('/progres-tukang/{id}/histori',                 [ProgresTukangController::class, 'addHistori']);
    Route::delete('/progres-tukang/{id}/histori/{historiId}',   [ProgresTukangController::class, 'deleteHistori']);

    // ── Import Dokumen ────────────────────────────────────────────────────────
    Route::get('/import-dokumen/{unit}',             [ImportDokumenController::class, 'index']);
    Route::post('/import-dokumen/{unit}',            [ImportDokumenController::class, 'store']);
    Route::put('/import-dokumen/{unit}/{id}',        [ImportDokumenController::class, 'update']);
    Route::delete('/import-dokumen/{unit}/{id}',     [ImportDokumenController::class, 'destroy']);
    Route::post('/import-dokumen/{unit}/{id}/sync',  [ImportDokumenController::class, 'syncToCashflow']);

    // ── Dashboard ─────────────────────────────────────────────────────────────
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    // ── Reports ───────────────────────────────────────────────────────────────
    Route::get('/reports/monthly',           [ReportController::class, 'monthly']);
    Route::get('/reports/yearly',            [ReportController::class, 'yearly']);
    Route::get('/reports/division/{division}',[ReportController::class, 'division']);
});
