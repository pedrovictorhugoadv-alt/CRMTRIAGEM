import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSupervisor } from "@/lib/auth";
import { listarPendencias, pegarUsuario, progresso } from "@/lib/dados";
import { agrupar } from "@/lib/fila";
import Bloco from "@/componentes/Bloco";
import Progresso from "@/componentes/Progresso";

export const dynamic = "force-dynamic";

export default async function PainelDoCobrador({ params }: { params: Promise<{ usuario: string }> }) {
  await exigirSupervisor();
  const { usuario } = await params;

  const pessoa = await pegarUsuario(usuario);
  if (!pessoa) notFound();

  const [d, lista] = await Promise.all([progresso(usuario), listarPendencias({ cobrador: usuario })]);
  const g = agrupar(lista);

  return (
    <>
      <Link className="voltar" href="/painel">← voltar para o painel</Link>
      <Progresso d={d} titulo={pessoa.nome} />

      <Bloco classe="esgotada" titulo="Régua esgotada" itens={g.esgotada} />
      <Bloco classe="atrasadas" titulo="Atrasadas" itens={g.atrasada} />
      <Bloco classe="hoje" titulo="Para hoje" itens={g.hoje} />
    </>
  );
}
