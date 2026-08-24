import "server-only";
import { neon } from "@neondatabase/serverless";

/**
 * Interface mínima usada pelo app.
 *
 * Em produção (Neon) usa o driver HTTP serverless, que é o recomendado na Vercel.
 * Em desenvolvimento, se a DATABASE_URL apontar para um Postgres comum
 * (localhost, Docker, etc.), cai no driver `pg` — assim dá para rodar
 * `npm run dev` sem depender da nuvem.
 */
export interface Sql {
  (textos: TemplateStringsArray, ...valores: unknown[]): Promise<Record<string, unknown>[]>;
  query(texto: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
  unsafe(cru: string): unknown;
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta a variável DATABASE_URL.");

const ehNeon = /\.neon\.tech|neon\.build|pooler\.[a-z0-9-]+\.neon/i.test(url);

function criarPg(): Sql {
  // Importado dinamicamente para não entrar no bundle quando roda no Neon.
  const { Pool } = require("pg") as typeof import("pg");
  const pool = new Pool({
    connectionString: url,
    ssl: /sslmode=require/.test(url!) ? { rejectUnauthorized: false } : undefined,
  });

  const marca = Symbol.for("sql.cru");
  type Cru = { [marca]: string };

  const executar = async (texto: string, params: unknown[] = []) => {
    const r = await pool.query(texto, params);
    return r.rows as Record<string, unknown>[];
  };

  const fn = (async (textos: TemplateStringsArray, ...valores: unknown[]) => {
    let texto = "";
    const params: unknown[] = [];
    textos.forEach((parte, i) => {
      texto += parte;
      if (i < valores.length) {
        const v = valores[i] as Cru | unknown;
        if (v && typeof v === "object" && marca in (v as object)) {
          texto += (v as Cru)[marca];
        } else {
          params.push(v);
          texto += `$${params.length}`;
        }
      }
    });
    return executar(texto, params);
  }) as Sql;

  fn.query = executar;
  fn.unsafe = (cru: string) => ({ [marca]: cru });
  return fn;
}

export const sql: Sql = ehNeon ? (neon(url) as unknown as Sql) : criarPg();
