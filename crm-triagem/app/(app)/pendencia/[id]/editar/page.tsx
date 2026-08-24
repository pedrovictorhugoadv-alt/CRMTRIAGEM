import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { listarUsuarios, pegarPendencia } from "@/lib/dados";
import { atualizarPendencia } from "@/app/acoes";
import FormPendencia from "@/componentes/FormPendencia";

export const dynamic = "force-dynamic";

export default async function Editar({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSessao();
  const { id } = await params;
  const p = await pegarPendencia(Number(id));
  if (!p) notFound();

  const pessoas = await listarUsuarios();

  return (
    <>
      <Link className="voltar" href={`/pendencia/${p.id}`}>← voltar para a pendência</Link>
      <div className="cartao">
        <h3>Editar pendência</h3>
        <FormPendencia acao={atualizarPendencia} p={p} pessoas={pessoas} sessao={s} rotulo="Salvar" />
      </div>
    </>
  );
}
