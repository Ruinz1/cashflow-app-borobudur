import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import pool from "./db.js";
import { getAll, saveByKey } from "./handlers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

const app = express();
const PORT = Number(process.env.API_PORT) || 3001;
const IS_PROD = process.env.NODE_ENV === "production";

// Restrict CORS to configured origin in production
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors({
  origin: allowedOrigin ? allowedOrigin : true,
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ─── Session store (in-memory) ──────────────────────────────────────────────
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 jam
const sessions = new Map<string, { userId: string; expiresAt: number }>();

// Bersihkan sesi yang sudah kedaluwarsa setiap 30 menit
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now > session.expiresAt) sessions.delete(token);
  }
}, 30 * 60 * 1000);

function createToken(userId: string): string {
  const token = crypto.randomUUID();
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function validateToken(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

// ─── Auth middleware ─────────────────────────────────────────────────────────
function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Unauthorized — token tidak ditemukan." });
  }
  const token = auth.slice(7);
  if (!validateToken(token)) {
    return res
      .status(401)
      .json({ ok: false, error: "Session tidak valid atau sudah kedaluwarsa. Silakan login ulang." });
  }
  next();
}

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ─── GET /api/sync — full data hydration (no auth needed) ────────────────────
app.get("/api/sync", async (_req, res) => {
  try {
    const data = await getAll(pool);
    res.json({ ok: true, data });
  } catch (err: any) {
    console.error("[API] sync error:", err.message);
    res.status(500).json({ ok: false, error: IS_PROD ? "Terjadi kesalahan server." : err.message });
  }
});

// ─── PUT /api/data/:key — save by localStorage key (auth required) ────────────
app.put("/api/data/:key", requireAuth, async (req, res) => {
  const { key } = req.params;
  if (!/^[a-z0-9_]+$/.test(key)) {
    return res.status(400).json({ ok: false, error: "Key tidak valid." });
  }
  const value = req.body;
  try {
    const saved = await saveByKey(pool, key, value);
    if (!saved) {
      return res.status(400).json({ ok: false, error: "Key tidak dikenali." });
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error(`[API] save error key=${key}:`, err.message);
    res.status(500).json({ ok: false, error: IS_PROD ? "Terjadi kesalahan server." : err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: "Username dan password wajib diisi." });
  }
  try {
    const [rows] = await pool.query(
      "SELECT id, username, `password`, nama_lengkap, role, status FROM users WHERE username = ? AND status = 'aktif' LIMIT 1",
      [username]
    );
    const user = (rows as any[])[0];
    if (!user) {
      return res
        .status(401)
        .json({ ok: false, error: "Username atau password salah, atau akun tidak aktif." });
    }

    // Dukung bcrypt ($2a/$2b/$2y) dan plaintext legacy
    const hash: string = user.password || "";
    const isHashed = hash.startsWith("$2");
    const passwordValid = isHashed
      ? await bcrypt.compare(password, hash)
      : password === hash;

    if (!passwordValid) {
      return res
        .status(401)
        .json({ ok: false, error: "Username atau password salah, atau akun tidak aktif." });
    }

    const token = createToken(String(user.id));

    res.json({
      ok: true,
      token,
      user: {
        id: String(user.id),
        namaLengkap: user.nama_lengkap,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err: any) {
    console.error("[API] login error:", err.message);
    res.status(500).json({ ok: false, error: IS_PROD ? "Terjadi kesalahan server." : err.message });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
app.post("/api/auth/logout", (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    sessions.delete(auth.slice(7));
  }
  res.json({ ok: true });
});

// ─── API 404 — harus sebelum wildcard frontend ───────────────────────────────
app.all("/api/*", (_req, res) => {
  res.status(404).json({ ok: false, error: "Endpoint tidak ditemukan." });
});

// ─── Serve built frontend (production) ───────────────────────────────────────
const distPath = path.resolve(__dirname, "../dist/public");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] Backend berjalan di http://localhost:${PORT}`);
  console.log(`[Server] Database: cashflow_perusahaan`);
  console.log(`[Server] API tersedia di http://localhost:${PORT}/api`);
});

export default app;
