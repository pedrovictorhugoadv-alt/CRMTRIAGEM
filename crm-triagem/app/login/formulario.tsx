"use client";

import { useActionState } from "react";
import { entrar } from "./acoes";

export default function Formulario() {
  const [erro, acao, pendente] = useActionState(entrar, null);

  return (
    <form className="login" action={acao}>
      <div className="marca">
        <span className="ponto" />
        <strong>Fila de Retorno</strong>
      </div>
      <p className="sub">Acompanhamento de pendências da triagem.</p>

      <div className="campo">
        <label htmlFor="usuario">Usuário</label>
        <input id="usuario" name="usuario" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
      </div>
      <div className="campo">
        <label htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>

      <button className="btn wide" type="submit" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </button>
      <p className="erro">{erro}</p>
    </form>
  );
}
