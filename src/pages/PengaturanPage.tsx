import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/lib/types";
import { usersApi, hakAksesApi } from "@/lib/api";
import { Plus, Pencil, Trash2, Eye, EyeOff, AlertCircle, Shield } from "lucide-react";

const ROLES = [
  { val: "owner", label: "Owner" },
  { val: "admin", label: "Administrator" },
  { val: "staff_bakso", label: "Staff Bakso Bento" },
  { val: "staff_amanah", label: "Staff UD Amanah" },
  { val: "staff_batualam", label: "Staff Batu Alam" },
  { val: "staff_kembang", label: "Staff Toko Kembang" },
  { val: "staff_perumahan", label: "Staff Perumahan" },
  { val: "staff_tkyaris", label: "Staff TK Yaris" },
];

const HALAMAN_LIST = [
  { key: "dashboard", label: "Dashboard" },
  { key: "bakso", label: "Bakso Bento" },
  { key: "amanah", label: "UD Amanah" },
  { key: "batualam", label: "Batu Alam" },
  { key: "kembang", label: "Toko Kembang" },
  { key: "perumahan", label: "Perumahan" },
  { key: "tkyaris", label: "TK Yaris" },
  { key: "akad", label: "Data Akad" },
  { key: "cashlunak", label: "Cash Lunak" },
  { key: "progrestukang", label: "Progres Tukang" },
  { key: "admsiswa", label: "Adm. Keuangan Siswa" },
  { key: "laporan", label: "Laporan" },
  { key: "pengaturan", label: "Pengaturan" },
];

const ACCESS_OPTIONS: Array<"CRUD" | "VIEW" | "NONE"> = ["CRUD", "VIEW", "NONE"];

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium fade-in ${type === "success" ? "bg-green-600" : "bg-red-500"}`}>
      {message}
    </div>
  );
}

export default function PengaturanPage() {
  const { user, hasAccess } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "akses">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [hakAkses, setHakAkses] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ namaLengkap: "", username: "", password: "", role: "admin", status: "aktif" as "aktif" | "nonaktif" });
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const access = hasAccess("pengaturan");

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [u, h] = await Promise.all([usersApi.list(), hakAksesApi.get()]);
      setUsers(u as User[]);
      setHakAkses(h);
    } catch (error) {
      console.error("Gagal memuat pengaturan", error);
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenAdd = () => {
    setEditId(null);
    setForm({ namaLengkap: "", username: "", password: "", role: "admin", status: "aktif" });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditId(u.id);
    // Jangan tampilkan hash password — kosongkan agar admin tahu harus isi ulang jika ingin mengubah
    setForm({ namaLengkap: u.namaLengkap, username: u.username, password: "", role: u.role, status: u.status });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSaveUser = async () => {
    if (!form.namaLengkap.trim() || !form.username.trim()) {
      showToast("Nama lengkap dan username wajib diisi.", "error"); return;
    }
    if (!editId && !form.password) {
      showToast("Password wajib diisi untuk pengguna baru.", "error"); return;
    }
    if (form.password && form.password.length < 6) {
      showToast("Password minimal 6 karakter.", "error"); return;
    }
    const all = users;
    const dup = all.find(u => u.username === form.username && u.id !== editId);
    if (dup) { showToast("Username sudah digunakan.", "error"); return; }

    try {
      if (editId) {
        const existing = all.find(u => u.id === editId);
        if (user?.role === "admin" && existing?.role === "owner" && form.role !== "owner") {
          showToast("Anda tidak bisa mengubah role Owner.", "error"); return;
        }
        await usersApi.update(editId, form);
        showToast("Pengguna berhasil diperbarui.");
      } else {
        await usersApi.create(form);
        showToast("Pengguna berhasil ditambahkan.");
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      showToast(err?.message || "Gagal menyimpan pengguna", "error");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === user?.id) { showToast("Tidak bisa menghapus akun sendiri.", "error"); setConfirmDelete(null); return; }
    try {
      await usersApi.delete(id);
      setConfirmDelete(null);
      showToast("Pengguna berhasil dihapus.");
      loadData();
    } catch (err: any) {
      showToast(err?.message || "Gagal menghapus pengguna", "error");
    }
  };

  const handleAccessChange = async (role: string, halaman: string, val: "CRUD" | "VIEW" | "NONE") => {
    const updated = { ...hakAkses, [role]: { ...(hakAkses[role] || {}), [halaman]: val } };
    setHakAkses(updated);
    try {
      await hakAksesApi.update(updated);
    } catch (err: any) {
      showToast(err?.message || "Gagal menyimpan hak akses", "error");
      loadData(); // revert on fail
    }
  };

  const getRoleLabel = (role: string) => ROLES.find(r => r.val === role)?.label || role;

  if (access === "NONE") return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-lg font-semibold text-foreground">Akses Ditolak</p>
      <p className="text-muted-foreground text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
    </div>
  );

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Memuat pengaturan...</div>;
  }

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} />}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Konfirmasi Hapus</p>
                <p className="text-sm text-muted-foreground">Apakah Anda yakin ingin menghapus pengguna ini?</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl border text-sm font-medium" style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
              <button onClick={() => handleDeleteUser(confirmDelete!)} className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium">Hapus</button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-foreground">Pengaturan & Manajemen Pengguna</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola pengguna dan hak akses sistem</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: "hsl(var(--border))" }}>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-users"
        >Manajemen Pengguna</button>
        <button
          onClick={() => setActiveTab("akses")}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === "akses" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          data-testid="tab-akses"
        >Hak Akses</button>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{users.length} pengguna terdaftar</p>
            <button onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shadow-sm"
              data-testid="button-add-user">
              <Plus className="w-4 h-4" /> Tambah Pengguna
            </button>
          </div>

          <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(var(--card-border))" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-users">
                <thead>
                  <tr style={{ background: "hsl(var(--muted))", borderBottom: "1px solid hsl(var(--border))" }}>
                    {["No", "Nama Lengkap", "Username", "Role", "Status", "Aksi"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} className="border-b hover:bg-muted/30 transition-colors" style={{ borderColor: "hsl(var(--border))" }}
                      data-testid={`row-user-${u.id}`}>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{u.namaLengkap}</td>
                      <td className="px-4 py-2.5 text-foreground">{u.username}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{getRoleLabel(u.role)}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.status === "aktif" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {u.status === "aktif" ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => handleOpenEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500"
                            data-testid={`button-edit-user-${u.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {u.id !== user?.id && (
                            <button onClick={() => setConfirmDelete(u.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500"
                              data-testid={`button-delete-user-${u.id}`}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Akses Tab */}
      {activeTab === "akses" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-sm text-muted-foreground">Konfigurasi hak akses per role dan halaman</p>
          </div>
          <div className="bg-card rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(var(--card-border))" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "hsl(var(--muted))", borderBottom: "1px solid hsl(var(--border))" }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground sticky left-0 bg-muted z-10 min-w-[140px]">Role</th>
                    {HALAMAN_LIST.map(h => (
                      <th key={h.key} className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map(role => (
                    <tr key={role.val} className="border-b hover:bg-muted/20" style={{ borderColor: "hsl(var(--border))" }}>
                      <td className="px-4 py-3 font-medium text-foreground text-xs sticky left-0 bg-card z-10 whitespace-nowrap">{role.label}</td>
                      {HALAMAN_LIST.map(h => {
                        const currentVal = (hakAkses[role.val]?.[h.key] as "CRUD" | "VIEW" | "NONE") || "NONE";
                        const colorMap: Record<string, string> = { CRUD: "bg-green-100 text-green-700", VIEW: "bg-blue-100 text-blue-700", NONE: "bg-gray-100 text-gray-500" };
                        return (
                          <td key={h.key} className="px-3 py-3 text-center">
                            <select
                              value={currentVal}
                              onChange={e => handleAccessChange(role.val, h.key, e.target.value as "CRUD" | "VIEW" | "NONE")}
                              className={`text-xs font-medium rounded-lg px-2 py-1 border-0 focus:outline-none cursor-pointer ${colorMap[currentVal]}`}
                              data-testid={`akses-${role.val}-${h.key}`}
                            >
                              {ACCESS_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <h3 className="font-semibold text-foreground">{editId ? "Edit Pengguna" : "Tambah Pengguna"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Nama Lengkap *</label>
                <input type="text" value={form.namaLengkap} onChange={e => setForm(f => ({ ...f, namaLengkap: e.target.value }))}
                  placeholder="Nama lengkap pengguna"
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }} data-testid="input-nama-lengkap" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Username *</label>
                <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Username unik"
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }} data-testid="input-user-username" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Password {editId ? <span className="text-muted-foreground font-normal">(kosongkan jika tidak ingin diubah)</span> : "*"}
                </label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={editId ? "Isi untuk mengganti password" : "Minimal 6 karakter"}
                    className="w-full px-3 py-2 pr-10 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ borderColor: "hsl(var(--border))" }} data-testid="input-user-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }} data-testid="select-role"
                  disabled={user?.role === "admin" && editId !== null && getUsers().find(u => u.id === editId)?.role === "owner"}>
                  {ROLES.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as "aktif" | "nonaktif" }))}
                  className="w-full px-3 py-2 rounded-xl border text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ borderColor: "hsl(var(--border))" }} data-testid="select-status">
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t" style={{ borderColor: "hsl(var(--border))" }}>
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted"
                style={{ borderColor: "hsl(var(--border))" }}>Batal</button>
              <button onClick={handleSaveUser}
                data-testid="button-save-user"
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
