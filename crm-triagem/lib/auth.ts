import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { sql } from "./db";
import type { Papel, Sessao } from "./tipos";

const COOKIE = "sessao";
const DURACAO_HORAS = 12;

function chave(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Falta a variável AUTH_SECRET.");
  return new TextEncoder().encode(s);
}

export async function conferirSenha(usuario: string, senha: string): Promise<Sessao | null> {
  const linhas = (await sql`
    select usuario, nome, papel, senha_hash
    from usuarios
    where usuario = ${usuario.trim().toLowerCase()} and ativo = true
  `) as { usuario: string; nome: string; papel: Papel; senha_hash: string }[];

  const u = linhas[0];
  if (!u) return null;
  if (!(await bcrypt.compare(senha, u.senha_hash))) return null;
  return { usuario: u.usuario, nome: u.nome, papel: u.papel };
}

export async function abrirSessao(s: Sessao): Promise<void> {
  const token = await new SignJWT({ nome: s.nome, papel: s.papel })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.usuario)
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_HORAS}h`)
    .sign(chave());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_HORAS * 3600,
  });
}

export async function fecharSessao(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function sessao(): Promise<Sessao | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave());
    return {
      usuario: String(payload.sub),
      nome: String(payload.nome),
      papel: payload.papel === "supervisor" ? "supervisor" : "cobrador",
    };
  } catch {
    return null;
  }
}

export async function exigirSessao(): Promise<Sessao> {
  const s = await sessao();
  if (!s) redirect("/login");
  return s;
}

export async function exigirSupervisor(): Promise<Sessao> {
  const s = await exigirSessao();
  if (s.papel !== "supervisor") redirect("/");
  return s;
}

export async function gerarHash(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}
