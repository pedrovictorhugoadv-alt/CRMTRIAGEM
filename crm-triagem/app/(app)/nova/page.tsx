import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { listarUsuarios } from "@/lib/dados";
import { criarPendencia } from "@/app/acoes";
import FormPendencia from "@/componentes/FormPendencia";

export const dynamic = "force-dynamic";

export default async function Nova() {
  const s = await exigirSessao();
  const pessoas = await listarUsuarios();

  return (
    <>
      <Link className="voltar" href="/">← voltar</Link>
      <div className="cartao">
        <h3>Nova pendência</h3>
        <FormPendencia acao={criarPendencia} pessoas={pessoas} sessao={s} rotulo="Criar pendência" />
      </div>
    </>
  );
}
