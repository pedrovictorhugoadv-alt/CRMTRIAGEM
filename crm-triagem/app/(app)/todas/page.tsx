import { exigirSupervisor } from "@/lib/auth";
import { listarPendencias } from "@/lib/dados";
import { agrupar } from "@/lib/fila";
import Bloco from "@/componentes/Bloco";
import Filtros from "@/componentes/Filtros";

export const dynamic = "force-dynamic";

export default async function Todas({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; status?: string }>;
}) {
  await exigirSupervisor();
  const { busca, status } = await searchParams;
  const lista = await listarPendencias({ busca, status });
  const g = agrupar(lista);

  return (
    <>
      <Filtros busca={busca} status={status} acao="/todas" />
      {lista.length === 0 ? (
        <div className="vazio">
          <h3>Nenhuma pendência</h3>
          <p>Cadastre a primeira em “Nova pendência”.</p>
        </div>
      ) : (
        <>
          <Bloco classe="esgotada" titulo="Régua esgotada — decidir" itens={g.esgotada} mostrarCobrador />
          <Bloco classe="atrasadas" titulo="Atrasadas" itens={g.atrasada} mostrarCobrador />
          <Bloco classe="hoje" titulo="Para hoje" itens={g.hoje} mostrarCobrador />
          <Bloco titulo="Próximos 7 dias" itens={g.semana} mostrarCobrador />
          <Bloco titulo="Mais adiante" itens={g.depois} mostrarCobrador />
          <Bloco titulo="Sem data de retorno" itens={g.semdata} mostrarCobrador />
          <Bloco titulo="Encerradas" itens={g.feito.slice(0, 60)} mostrarCobrador />
        </>
      )}
    </>
  );
}
