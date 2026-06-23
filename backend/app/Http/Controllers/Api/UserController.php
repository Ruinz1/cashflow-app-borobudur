<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\HasImageUpload;
use App\Models\User;
use App\Models\HakAkses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * UserController dengan dukungan avatar upload WebP.
 *
 * Perubahan dari versi sebelumnya:
 * - Ditambahkan trait HasImageUpload
 * - Method store: mendukung upload avatar opsional
 * - Method update: mendukung replace avatar (file lama otomatis dihapus)
 * - Method format: mengembalikan avatar_url yang bisa diakses frontend
 *
 * Kolom baru yang perlu ditambah ke tabel users:
 *   $table->string('avatar_path')->nullable();
 *   (jalankan: php artisan make:migration add_avatar_to_users_table)
 */
class UserController extends Controller
{
    use HasImageUpload;

    private const AVATAR_FOLDER = 'avatars';

    public function index()
    {
        $users = User::orderBy('created_at')->get()->map(fn($u) => $this->format($u));
        return response()->json($users);
    }

    public function store(Request $request)
    {
        $request->validate([
            'namaLengkap' => 'required|string',
            'username'    => 'required|string|unique:users,username',
            'password'    => 'required|string|min:4',
            'role'        => 'required|string',
            'status'      => 'required|in:aktif,nonaktif',
            // Avatar opsional; jika diupload, otomatis dikonversi ke WebP
            'avatar'      => 'nullable|file|mimes:jpeg,jpg,png,gif,bmp,webp|max:5120',
        ]);

        // Upload avatar jika ada
        $avatarPath = $this->uploadImage($request->file('avatar'), self::AVATAR_FOLDER);

        $user = User::create([
            'id'            => Str::uuid(),
            'nama_lengkap'  => $request->namaLengkap,
            'username'      => $request->username,
            'password_hash' => Hash::make($request->password),
            'role'          => $request->role,
            'status'        => $request->status,
            'avatar_path'   => $avatarPath,
        ]);

        return response()->json($this->format($user), 201);
    }

    public function show(string $id)
    {
        return response()->json($this->format(User::findOrFail($id)));
    }

    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'namaLengkap' => 'required|string',
            'username'    => 'required|string|unique:users,username,' . $id . ',id',
            'role'        => 'required|string',
            'status'      => 'required|in:aktif,nonaktif',
            // Avatar opsional; jika ada file baru, file lama otomatis dihapus
            'avatar'      => 'nullable|file|mimes:jpeg,jpg,png,gif,bmp,webp|max:5120',
        ]);

        $data = [
            'nama_lengkap' => $request->namaLengkap,
            'username'     => $request->username,
            'role'         => $request->role,
            'status'       => $request->status,
        ];

        if ($request->filled('password')) {
            $data['password_hash'] = Hash::make($request->password);
        }

        // Ganti avatar jika ada file baru (file lama otomatis terhapus)
        $data['avatar_path'] = $this->replaceImage(
            $request->file('avatar'),
            self::AVATAR_FOLDER,
            $user->avatar_path
        );

        $user->update($data);

        return response()->json($this->format($user->fresh()));
    }

    public function destroy(string $id)
    {
        $user = User::findOrFail($id);

        // Hapus avatar dari storage saat user dihapus
        $this->deleteImage($user->avatar_path);

        $user->delete();

        return response()->json(['message' => 'User deleted']);
    }

    private function format(User $u): array
    {
        return [
            'id'          => $u->id,
            'namaLengkap' => $u->nama_lengkap,
            'username'    => $u->username,
            'role'        => $u->role,
            'status'      => $u->status,
            'avatarUrl'   => $u->avatar_path
                ? Storage::disk('public')->url($u->avatar_path)
                : null,
            'password'    => '', // never expose
        ];
    }
}
