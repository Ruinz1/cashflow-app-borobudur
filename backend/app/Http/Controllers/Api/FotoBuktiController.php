<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\HasImageUpload;
use App\Models\FotoBukti;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * FotoBuktiController
 *
 * Contoh implementasi upload gambar dengan konversi WebP otomatis.
 * Endpoint ini menangani bukti foto transaksi (misal: bukti transfer, kwitansi foto).
 *
 * Fitur:
 * - Upload foto → otomatis dikonversi ke WebP & di-resize jika > 1920px lebar
 * - Update foto → file lama dihapus, file baru diupload & dikonversi
 * - Delete → file di storage ikut dihapus
 * - Akses URL publik untuk tampil di frontend
 *
 * ===========================================================
 * CARA VERIFIKASI HASIL WEBP
 * ===========================================================
 *
 * 1. Cek ekstensi file tersimpan (harus .webp):
 *    ls storage/app/public/foto-bukti/
 *
 * 2. Cek MIME type file tersimpan:
 *    file storage/app/public/foto-bukti/*.webp
 *    → harus: "RIFF ... WEBP"
 *
 * 3. Bandingkan ukuran sebelum & sesudah:
 *    Ukuran file WebP biasanya 30–70% lebih kecil dari JPEG/PNG original.
 *
 * 4. Via Postman/API:
 *    POST /api/foto-bukti dengan field 'foto' (file gambar)
 *    → Response berisi 'foto_path' yang berakhiran .webp
 *    → Akses URL: APP_URL/storage/{foto_path}
 *
 * 5. Via PHP Artisan Tinker:
 *    $path = 'foto-bukti/xxxx.webp';
 *    echo Storage::disk('public')->size($path); // cek ukuran dalam bytes
 *    echo Storage::disk('public')->mimeType($path); // harus 'image/webp'
 * ===========================================================
 *
 * Route (tambahkan di routes/api.php):
 *   Route::apiResource('foto-bukti', FotoBuktiController::class);
 */
class FotoBuktiController extends Controller
{
    use HasImageUpload;

    /**
     * Folder penyimpanan di dalam disk 'public'.
     */
    private const FOLDER = 'foto-bukti';

    /**
     * GET /api/foto-bukti
     * Ambil semua bukti foto (dengan URL publik).
     */
    public function index()
    {
        $items = FotoBukti::orderBy('created_at', 'desc')->get()->map(fn($item) => $this->format($item));
        return response()->json($items);
    }

    /**
     * POST /api/foto-bukti
     * Upload bukti foto baru. Gambar otomatis dikonversi ke WebP.
     */
    public function store(Request $request)
    {
        $request->validate([
            'foto'        => 'required|file|mimes:jpeg,jpg,png,gif,bmp,webp|max:10240',
            'keterangan'  => 'nullable|string|max:500',
            'referensi'   => 'nullable|string|max:255', // mis: ID transaksi
        ]);

        // Upload & konversi ke WebP otomatis
        $fotoPath = $this->uploadImage($request->file('foto'), self::FOLDER);

        $fotoBukti = FotoBukti::create([
            'id'         => Str::uuid(),
            'foto_path'  => $fotoPath,
            'keterangan' => $request->keterangan,
            'referensi'  => $request->referensi,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json($this->format($fotoBukti), 201);
    }

    /**
     * GET /api/foto-bukti/{id}
     */
    public function show(string $id)
    {
        return response()->json($this->format(FotoBukti::findOrFail($id)));
    }

    /**
     * PUT /api/foto-bukti/{id}
     * Update bukti foto. Jika ada foto baru → file lama otomatis dihapus.
     */
    public function update(Request $request, string $id)
    {
        $fotoBukti = FotoBukti::findOrFail($id);

        $request->validate([
            'foto'       => 'nullable|file|mimes:jpeg,jpg,png,gif,bmp,webp|max:10240',
            'keterangan' => 'nullable|string|max:500',
            'referensi'  => 'nullable|string|max:255',
        ]);

        // Ganti foto lama jika ada file baru (file lama otomatis terhapus)
        $fotoPath = $this->replaceImage(
            $request->file('foto'),
            self::FOLDER,
            $fotoBukti->foto_path
        );

        $fotoBukti->update([
            'foto_path'  => $fotoPath,
            'keterangan' => $request->input('keterangan', $fotoBukti->keterangan),
            'referensi'  => $request->input('referensi', $fotoBukti->referensi),
        ]);

        return response()->json($this->format($fotoBukti->fresh()));
    }

    /**
     * DELETE /api/foto-bukti/{id}
     * Hapus record dan file gambar dari storage.
     */
    public function destroy(string $id)
    {
        $fotoBukti = FotoBukti::findOrFail($id);

        // Hapus file dari storage terlebih dahulu
        $this->deleteImage($fotoBukti->foto_path);

        $fotoBukti->delete();

        return response()->json(['message' => 'Foto bukti dihapus']);
    }

    /**
     * Format output dengan URL publik yang bisa diakses frontend.
     */
    private function format(FotoBukti $item): array
    {
        return [
            'id'         => $item->id,
            'foto_path'  => $item->foto_path,
            'foto_url'   => $item->foto_path
                ? Storage::disk('public')->url($item->foto_path)
                : null,
            'keterangan' => $item->keterangan ?? '',
            'referensi'  => $item->referensi ?? '',
            'created_by' => $item->created_by,
            'created_at' => $item->created_at?->toISOString(),
        ];
    }
}
