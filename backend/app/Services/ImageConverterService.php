<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;

/**
 * ImageConverterService
 *
 * Mengkonversi gambar yang diupload user ke format WebP secara otomatis
 * sebelum disimpan ke storage, dengan tujuan menghemat bandwidth dan penyimpanan.
 *
 * ===========================================================
 * PRASYARAT SERVER (aaPanel)
 * ===========================================================
 * Pastikan salah satu ekstensi PHP berikut sudah aktif:
 *
 * 1. Cek via CLI:
 *    php -m | grep -E "^gd$|^imagick$"
 *
 * 2. Jika belum ada, aktifkan di aaPanel:
 *    - Login aaPanel → App Store → PHP Manager → pilih versi PHP
 *    - Tab "Extensions" → cari "gd" atau "imagick" → klik Install
 *    - Setelah install, klik "Reload" atau restart PHP-FPM
 *
 * 3. Verifikasi ulang:
 *    php -r "echo extension_loaded('gd') ? 'GD OK' : 'GD MISSING';"
 *
 * GD lebih ringan dan biasanya sudah terinstal di shared hosting.
 * Imagick lebih powerful (mendukung lebih banyak format), tapi perlu install manual.
 * ===========================================================
 */
class ImageConverterService
{
    /**
     * Instance ImageManager dari Intervention Image v3.
     */
    private ImageManager $manager;

    /**
     * Konfigurasi service (dari config/image_converter.php).
     */
    private array $config;

    public function __construct()
    {
        $this->config = config('image_converter', [
            'webp_quality'           => 80,
            'max_width'              => 1920,
            'disk'                   => 'public',
            'allowed_mime_types'     => ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
            'convertible_mime_types' => ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'],
        ]);

        // Pilih driver: prioritaskan Imagick jika tersedia, fallback ke GD
        $this->manager = $this->resolveImageManager();
    }

    /**
     * Konversi file gambar ke WebP dan simpan ke storage.
     *
     * Logika:
     * - Jika MIME bukan gambar yang dikenal → simpan file asli tanpa konversi.
     * - Jika MIME sudah WebP → simpan langsung tanpa konversi ulang.
     * - Jika gambar biasa (jpeg/png/gif/bmp) → konversi ke WebP.
     * - Jika lebar > max_width → resize proporsional dulu, baru konversi.
     * - Jika konversi gagal → fallback ke menyimpan file asli (tidak gagal total).
     *
     * @param  UploadedFile  $file      File yang diupload dari request.
     * @param  string        $folder    Sub-folder di dalam disk storage (misal: 'avatars', 'bukti-transaksi').
     * @param  int           $quality   Kualitas WebP (0–100). Default dari config.
     * @return string                   Path relatif file yang tersimpan (untuk disimpan di DB).
     */
    public function convertToWebp(UploadedFile $file, string $folder, int $quality = -1): string
    {
        if ($quality < 0) {
            $quality = (int) $this->config['webp_quality'];
        }

        $mimeType   = $file->getMimeType();
        $disk       = $this->config['disk'];
        $maxWidth   = (int) $this->config['max_width'];

        // --- 1. Bukan gambar sama sekali → simpan apa adanya ---
        if (! $this->isAllowedImage($mimeType)) {
            return $this->storeOriginal($file, $folder, $disk);
        }

        // --- 2. Sudah WebP → simpan langsung tanpa konversi ---
        if ($mimeType === 'image/webp') {
            $filename = Str::uuid() . '.webp';
            $path     = $folder . '/' . $filename;
            Storage::disk($disk)->put($path, file_get_contents($file->getRealPath()));
            return $path;
        }

        // --- 3. Gambar konvertible → konversi ke WebP ---
        try {
            $image = $this->manager->read($file->getRealPath());

            // Resize jika lebar melebihi max_width (jaga aspect ratio)
            if ($maxWidth > 0 && $image->width() > $maxWidth) {
                $image->scale(width: $maxWidth);
            }

            $filename    = Str::uuid() . '.webp';
            $path        = $folder . '/' . $filename;
            $encoded     = $image->toWebp($quality);

            Storage::disk($disk)->put($path, $encoded->toString());

            Log::info('[ImageConverter] Berhasil konversi ke WebP', [
                'original'  => $file->getClientOriginalName(),
                'mime'      => $mimeType,
                'path'      => $path,
                'quality'   => $quality,
            ]);

            return $path;

        } catch (\Throwable $e) {
            // --- Fallback: jika konversi gagal, simpan file asli ---
            Log::error('[ImageConverter] Gagal konversi ke WebP, fallback ke file asli', [
                'original' => $file->getClientOriginalName(),
                'mime'     => $mimeType,
                'error'    => $e->getMessage(),
                'trace'    => $e->getTraceAsString(),
            ]);

            return $this->storeOriginal($file, $folder, $disk);
        }
    }

    /**
     * Hapus file lama dari storage saat user melakukan update/replace gambar.
     * Aman dipanggil meski file tidak ada (tidak throw exception).
     *
     * @param  string|null  $oldPath  Path relatif file lama (dari DB).
     * @return bool                   true jika berhasil dihapus, false jika tidak ada / gagal.
     */
    public function deleteOldFile(?string $oldPath): bool
    {
        if (! $oldPath) {
            return false;
        }

        $disk = $this->config['disk'];

        try {
            if (Storage::disk($disk)->exists($oldPath)) {
                Storage::disk($disk)->delete($oldPath);
                Log::info('[ImageConverter] File lama dihapus', ['path' => $oldPath]);
                return true;
            }
        } catch (\Throwable $e) {
            Log::warning('[ImageConverter] Gagal hapus file lama', [
                'path'  => $oldPath,
                'error' => $e->getMessage(),
            ]);
        }

        return false;
    }

    /**
     * Simpan file asli (tanpa konversi) ke storage.
     * Digunakan sebagai fallback atau untuk non-image files.
     *
     * @param  UploadedFile  $file
     * @param  string        $folder
     * @param  string        $disk
     * @return string  Path relatif file tersimpan.
     */
    private function storeOriginal(UploadedFile $file, string $folder, string $disk): string
    {
        $extension = $file->getClientOriginalExtension() ?: $file->extension();
        $filename  = Str::uuid() . '.' . $extension;
        $path      = $folder . '/' . $filename;

        Storage::disk($disk)->put($path, file_get_contents($file->getRealPath()));

        return $path;
    }

    /**
     * Cek apakah MIME type termasuk dalam daftar gambar yang diizinkan.
     */
    private function isAllowedImage(?string $mimeType): bool
    {
        if (! $mimeType) {
            return false;
        }

        return in_array($mimeType, $this->config['allowed_mime_types'] ?? [], true);
    }

    /**
     * Resolve driver ImageManager: gunakan Imagick jika tersedia, fallback ke GD.
     * Jika keduanya tidak tersedia, lempar exception dengan pesan yang jelas.
     *
     * @throws \RuntimeException
     */
    private function resolveImageManager(): ImageManager
    {
        if (extension_loaded('imagick')) {
            return new ImageManager(new ImagickDriver());
        }

        if (extension_loaded('gd')) {
            return new ImageManager(new GdDriver());
        }

        throw new \RuntimeException(
            'ImageConverterService membutuhkan ekstensi PHP "gd" atau "imagick". ' .
            'Aktifkan salah satunya di aaPanel: PHP Manager → Extensions → gd/imagick → Install, lalu restart PHP-FPM.'
        );
    }
}
