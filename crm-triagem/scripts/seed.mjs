// Cria as tabelas e o primeiro supervisor.
// Uso:  DATABASE_URL=... ADMIN_SENHA=... npm run seed
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta a variável DATABASE_URL.");
  process.exit(1);
}

const ehNeon = /\.neon\.tech|neon\.build|pooler\.[a-z0-9-]+\.neon/i.test(url);

let executar;
let fechar = async () => {};

if (ehNeon) {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  executar = (texto, params = []) => sql.query(texto, params);
} else {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString: url,
    ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
  });
  executar = async (texto, params = []) => (await pool.query(texto, params)).rows;
  fechar = () => pool.end();
}

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const comandos = schema
  .split(";")
  .map((c) => c.replace(/^\s*--.*$/gm, "").trim())
  .filter(Boolean);

for (const comando of comandos) await executar(comando);
console.log("Tabelas criadas.");

const usuario = (process.env.ADMIN_USUARIO || "pedro").toLowerCase();
const nome = process.env.ADMIN_NOME || "Supervisor";
const senha = process.env.ADMIN_SENHA;

if (senha) {
  const hash = await bcrypt.hash(senha, 10);
  await executar(
    `insert into usuarios (usuario, nome, papel, senha_hash)
     values ($1, $2, 'supervisor', $3)
     on conflict (usuario) do update set nome = excluded.nome, senha_hash = excluded.senha_hash`,
    [usuario, nome, hash],
  );
  console.log(`Supervisor "${usuario}" pronto.`);
} else {
  console.log("Sem ADMIN_SENHA definida — nenhum usuário criado.");
}

await fechar();
