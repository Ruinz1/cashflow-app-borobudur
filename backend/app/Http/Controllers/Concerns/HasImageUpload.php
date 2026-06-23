<?php

namespace App\Http\Controllers\Concerns;

use App\Services\ImageConverterService;
use Illuminate\Http\UploadedFile;

/**
 * Trait HasImageUpload
 *
 * Menyediakan helper method upload & replace gambar dengan konversi WebP otomatis.
 * Gunakan trait ini di Controller manapun yang membutuhkan upload gambar.
 *
 * Cara pakai:
 *   class MyController extends Controller
 *   {
 *       use HasImageUpload;
 *
 *       public function store(Request $request)
 *       {
 *           $path = $this->uploadImage($request->file('foto'), 'foto-progres');
 *           // $path → 'foto-progres/550e8400-e29b-41d4-a716-446655440000.webp'
 *       }
 *
 *       public function update(Request $request, string $id)
 *       {
 *           $model = MyModel::findOrFail($id);
 *           $path  = $this->replaceImage($request->file('foto'), 'foto-progres', $model->foto_path);
 *           $model->update(['foto_path' => $path]);
 *       }
 *   }
 */
trait HasImageUpload
{
    /**
     * Upload gambar baru dan konversi ke WebP.
     *
     * @param  UploadedFile|null  $file     File dari $request->file('field').
     * @param  string             $folder   Sub-folder di storage disk.
     * @param  int                $quality  Kualitas WebP (0–100), -1 = pakai default config.
     * @return string|null                  Path relatif tersimpan, atau null jika tidak ada file.
     */
    protected function uploadImage(?UploadedFile $file, string $folder, int $quality = -1): ?string
    {
        if (! $file) {
            return null;
        }

        /** @var ImageConverterService $converter */
        $converter = app(ImageConverterService::class);

        return $converter->convertToWebp($file, $folder, $quality);
    }

    /**
     * Ganti gambar lama dengan gambar baru (delete lama, upload baru).
     * File lama akan dihapus secara otomatis agar tidak menumpuk sampah.
     *
     * @param  UploadedFile|null  $file       File baru dari $request->file('field').
     * @param  string             $folder     Sub-folder di storage disk.
     * @param  string|null        $oldPath    Path relatif file lama (dari DB), untuk dihapus.
     * @param  int                $quality    Kualitas WebP (0–100), -1 = pakai default config.
     * @return string|null                    Path relatif file baru, atau $oldPath jika tidak ada file baru.
     */
    protected function replaceImage(?UploadedFile $file, string $folder, ?string $oldPath, int $quality = -1): ?string
    {
        if (! $file) {
            // Tidak ada file baru → kembalikan path lama (tidak ganti apa-apa)
            return $oldPath;
        }

        /** @var ImageConverterService $converter */
        $converter = app(ImageConverterService::class);

        // Hapus file lama terlebih dahulu
        $converter->deleteOldFile($oldPath);

        // Upload & konversi file baru
        return $converter->convertToWebp($file, $folder, $quality);
    }

    /**
     * Hapus file gambar dari storage.
     *
     * @param  string|null  $path  Path relatif file (dari DB).
     * @return bool
     */
    protected function deleteImage(?string $path): bool
    {
        if (! $path) {
            return false;
        }

        /** @var ImageConverterService $converter */
        $converter = app(ImageConverterService::class);

        return $converter->deleteOldFile($path);
    }
}
