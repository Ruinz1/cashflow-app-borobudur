<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Image Converter Settings
    |--------------------------------------------------------------------------
    |
    | Konfigurasi untuk ImageConverterService.
    | Ubah nilai di sini atau via environment variable sesuai kebutuhan server.
    |
    */

    /*
     * Kualitas WebP default (0–100).
     * Semakin tinggi = semakin bagus kualitas tapi ukuran file lebih besar.
     * Nilai 80 adalah sweet-spot yang direkomendasikan.
     */
    'webp_quality' => (int) env('IMAGE_WEBP_QUALITY', 80),

    /*
     * Lebar maksimum gambar dalam piksel.
     * Gambar dengan lebar > nilai ini akan di-resize proporsional ke lebar ini.
     * Set ke 0 untuk menonaktifkan resize.
     *
     * Cara cek/set di aaPanel:
     *   1. Pastikan ekstensi gd atau imagick aktif:
     *      php -m | grep -E "gd|imagick"
     *   2. Jika belum, di aaPanel: PHP Manager → Extensions → cari "gd" → Install
     *   3. Restart PHP-FPM setelah install ekstensi.
     */
    'max_width' => (int) env('IMAGE_MAX_WIDTH', 1920),

    /*
     * Disk storage Laravel tempat file gambar disimpan.
     * Sesuaikan dengan konfigurasi di config/filesystems.php.
     */
    'disk' => env('IMAGE_STORAGE_DISK', 'public'),

    /*
     * MIME type yang dianggap sebagai gambar dan akan dikonversi ke WebP.
     * File dengan MIME type di luar daftar ini akan disimpan apa adanya.
     */
    'allowed_mime_types' => [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp',
    ],

    /*
     * MIME type gambar yang akan benar-benar dikonversi ke WebP.
     * image/webp dikecualikan karena file sudah dalam format WebP.
     */
    'convertible_mime_types' => [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/bmp',
    ],

];
