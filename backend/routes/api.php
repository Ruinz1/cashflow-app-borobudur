<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DivisionController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\DashboardController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Auth
Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);
Route::middleware('auth:sanctum')->get('/me', [AuthController::class, 'me']);

// Divisions
Route::middleware('auth:sanctum')->apiResource('divisions', DivisionController::class);

// Categories
Route::middleware('auth:sanctum')->apiResource('categories', CategoryController::class);

// Transactions
Route::middleware('auth:sanctum')->get('/transactions', [TransactionController::class, 'index']);
Route::middleware('auth:sanctum')->get('/transactions/{division}', [TransactionController::class, 'index']);
Route::middleware('auth:sanctum')->post('/transactions/{division}', [TransactionController::class, 'store']);
Route::middleware('auth:sanctum')->get('/transactions/{division}/{id}', [TransactionController::class, 'show']);
Route::middleware('auth:sanctum')->put('/transactions/{division}/{id}', [TransactionController::class, 'update']);
Route::middleware('auth:sanctum')->delete('/transactions/{division}/{id}', [TransactionController::class, 'destroy']);

// Reports
Route::middleware('auth:sanctum')->get('/reports/monthly', [ReportController::class, 'monthly']);
Route::middleware('auth:sanctum')->get('/reports/yearly', [ReportController::class, 'yearly']);
Route::middleware('auth:sanctum')->get('/reports/division/{division}', [ReportController::class, 'division']);

// Dashboard
Route::middleware('auth:sanctum')->get('/dashboard/summary', [DashboardController::class, 'summary']);

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
