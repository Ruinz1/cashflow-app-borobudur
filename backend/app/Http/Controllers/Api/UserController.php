<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\HakAkses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
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
        ]);

        $user = User::create([
            'id'           => Str::uuid(),
            'nama_lengkap' => $request->namaLengkap,
            'username'     => $request->username,
            'password_hash'=> Hash::make($request->password),
            'role'         => $request->role,
            'status'       => $request->status,
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

        $user->update($data);

        return response()->json($this->format($user->fresh()));
    }

    public function destroy(string $id)
    {
        User::findOrFail($id)->delete();
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
            'password'    => '', // never expose
        ];
    }
}
