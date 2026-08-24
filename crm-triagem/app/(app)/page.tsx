import { exigirSessao } from "@/lib/auth";
import { listarPendencias } from "@/lib/dados";
import { agrupar, fechada } from "@/lib/fila";
import Bloco from "@/componentes/Bloco";
import Filtros from "@/componentes/Filtros";

export const dynamic = "force-dynamic";

export default async function MinhaFila({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; status?: string }>;
}) {
  const s = await exigirSessao();
  const { busca, status } = await searchParams;

  const lista = await listarPendencias({ cobrador: s.usuario, busca, status });
  const g = agrupar(lista);
  const emAberto = lista.filter((p) => !fechada(p)).length;
  const urgentes = g.atrasada.length + g.hoje.length;

  return (
    <>
      <div className={`aviso ${urgentes === 0 ? "calmo" : ""}`}>
        <strong>
          {urgentes > 0
            ? `${urgentes} contato${urgentes > 1 ? "s" : ""} para retornar agora`
            : "Nenhum retorno vencido"}
        </strong>
        <span className="txt">
          {g.atrasada.length > 0 ? `${g.atrasada.length} atrasado${g.atrasada.length > 1 ? "s" : ""}` : "nenhum atrasado"}
          {" · "}
          {g.hoje.length > 0 ? `${g.hoje.length} para hoje` : "nada para hoje"}
          {" · "}
          {emAberto} pendência{emAberto === 1 ? "" : "s"} em aberto na sua carteira.
        </span>
      </div>

      <Filtros busca={busca} status={status} acao="/" />

      {lista.length === 0 ? (
        <div className="vazio">
          <h3>Nada por aqui</h3>
          <p>Nenhuma pendência corresponde ao filtro — ou sua carteira está zerada.</p>
        </div>
      ) : (
        <>
          <Bloco classe="esgotada" titulo="Régua esgotada — aguardando decisão" itens={g.esgotada} />
          <Bloco classe="atrasadas" titulo="Atrasadas" itens={g.atrasada} />
          <Bloco classe="hoje" titulo="Para hoje" itens={g.hoje} />
          <Bloco titulo="Próximos 7 dias" itens={g.semana} />
          <Bloco titulo="Mais adiante" itens={g.depois} />
          <Bloco titulo="Sem data de retorno" itens={g.semdata} />
          <Bloco titulo="Encerradas" itens={g.feito.slice(0, 40)} />
        </>
      )}
    </>
  );
}
