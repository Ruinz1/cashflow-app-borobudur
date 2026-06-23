<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * ImageUploadRequest
 *
 * Form Request reusable untuk validasi upload gambar.
 * Dapat di-extend atau digunakan langsung di semua modul yang menerima gambar.
 *
 * Cara pakai di Controller:
 *   public function store(ImageUploadRequest $request)
 *   {
 *       $file = $request->file('image');
 *       $path = app(ImageConverterService::class)->convertToWebp($file, 'avatars');
 *   }
 *
 * Atau gunakan trait HasImageUpload untuk integrasi lebih mudah.
 */
class ImageUploadRequest extends FormRequest
{
    /**
     * Nama field file di form-data. Override di subclass jika berbeda.
     * Misal: 'foto', 'bukti', 'avatar', dll.
     */
    protected string $imageField = 'image';

    /**
     * Ukuran maksimum file dalam kilobytes.
     */
    protected int $maxSizeKb = 10240; // 10 MB

    /**
     * Apakah upload gambar wajib (required) atau opsional (nullable).
     */
    protected bool $required = true;

    public function authorize(): bool
    {
        return true; // Otorisasi ditangani middleware auth
    }

    public function rules(): array
    {
        $field    = $this->imageField;
        $maxSize  = $this->maxSizeKb;
        $presence = $this->required ? 'required' : 'nullable';

        return [
            $field => [
                $presence,
                'file',
                'mimes:jpeg,jpg,png,gif,bmp,webp',
                "max:{$maxSize}",
            ],
        ];
    }

    public function messages(): array
    {
        $field = $this->imageField;

        return [
            "{$field}.required" => 'File gambar wajib diupload.',
            "{$field}.file"     => 'Upload harus berupa file.',
            "{$field}.mimes"    => 'Format gambar tidak didukung. Gunakan: JPEG, PNG, GIF, BMP, atau WebP.',
            "{$field}.max"      => "Ukuran file maksimal {$this->maxSizeKb} KB.",
        ];
    }
}
