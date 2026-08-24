"use server";

import { redirect } from "next/navigation";
import { abrirSessao, conferirSenha } from "@/lib/auth";

export async function entrar(_estado: string | null, dados: FormData): Promise<string | null> {
  const usuario = String(dados.get("usuario") || "");
  const senha = String(dados.get("senha") || "");

  if (!usuario || !senha) return "Preencha usuário e senha.";

  const s = await conferirSenha(usuario, senha);
  if (!s) return "Usuário ou senha não conferem.";

  await abrirSessao(s);
  redirect(s.papel === "supervisor" ? "/painel" : "/");
}
