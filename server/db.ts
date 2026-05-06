import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// override: true — selalu pakai nilai terbaru dari .env (MAMP port 3306)
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

function parseDbUrl(url: string) {
  const m = url.match(/^mysql:\/\/([^:]*):([^@]*)@([^:/]+):?(\d*)\/(.+)$/);
  if (!m) throw new Error(`Invalid DATABASE_URL format: ${url}`);
  return {
    user: decodeURIComponent(m[1]),
    password: decodeURIComponent(m[2]),
    host: m[3],
    port: m[4] ? parseInt(m[4]) : 3306,
    database: m[5],
  };
}

const url = process.env.DATABASE_URL ?? "mysql://root:@localhost:3306/cashflow_perusahaan";
const cfg = parseDbUrl(url);

console.log(`[DB] Connecting to ${cfg.host}:${cfg.port}/${cfg.database} as ${cfg.user}`);

export const pool = mysql.createPool({
  ...cfg,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
  timezone: "+07:00",
});

export default pool;
