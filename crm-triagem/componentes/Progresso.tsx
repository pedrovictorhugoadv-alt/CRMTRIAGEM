import type { Progresso as Dados } from "@/lib/dados";
import Kpi from "./Kpi";

function pct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

function Medidor({ rotulo, valor, detalhe, tom }: { rotulo: string; valor: number | null; detalhe: string; tom: "accent" | "good" }) {
  const largura = valor === null ? 0 : Math.round(valor * 100);
  return (
    <div className="cartao">
      <h3>{rotulo}</h3>
      <div className="grande">{pct(valor)}</div>
      <div className="medidor grosso" role="img" aria-label={`${rotulo}: ${pct(valor)}`}>
        <span style={{ width: `${largura}%`, background: tom === "good" ? "var(--good)" : "var(--accent)" }} />
      </div>
      <p className="dica">{detalhe}</p>
    </div>
  );
}

export default function Progresso({ d, titulo }: { d: Dados; titulo?: string }) {
  const maior = Math.max(1, ...d.meses.map((m) => m.total));
  const variacao = d.concluidasMes - d.concluidasMesAnterior;

  return (
    <>
      {titulo ? <h2 style={{ fontSize: 20, marginBottom: 14 }}>{titulo}</h2> : null}

      <div className="kpis">
        <Kpi rotulo="Cadastradas" valor={d.cadastradas} pe="desde o começo" />
        <Kpi rotulo="Pendentes" valor={d.pendentes} pe="ainda em aberto" />
        <Kpi tom="bom" rotulo="Concluídas" valor={d.concluidas} pe="entregues até hoje" />
        <Kpi tom="crit" rotulo="Atrasadas" valor={d.atrasadas} pe="retorno vencido" />
        <Kpi rotulo="Nesta semana" valor={d.concluidasSemana} pe="concluídas desde segunda" />
        <Kpi
          rotulo="Neste mês"
          valor={d.concluidasMes}
          pe={
            d.concluidasMesAnterior === 0
              ? "primeiro mês com registro"
              : `${variacao >= 0 ? "+" : ""}${variacao} em relação ao mês passado`
          }
        />
        <Kpi tom="warn" rotulo="Entregas parciais" valor={d.parciais} pe="abriram régua curta" />
      </div>

      <div className="tres">
        <Medidor
          rotulo="Taxa de resolução"
          valor={d.taxa}
          tom="good"
          detalhe={
            d.taxa === null
              ? "Ainda não há pendências encerradas para calcular."
              : d.semExito === 0
                ? `${d.concluidas} concluídas, nenhuma encerrada sem êxito.`
                : `${d.concluidas} concluídas de ${d.concluidas + d.semExito} encerradas — ${d.semExito} saíram sem êxito.`
          }
        />
        <Medidor
          rotulo="Adesão à régua"
          valor={d.adesao}
          tom="accent"
          detalhe={
            d.adesao === null
              ? "Nenhum toque registrado ainda."
              : `${d.toquesNoPrazo} de ${d.toques} toques feitos dentro do prazo previsto.`
          }
        />
        <div className="cartao">
          <h3>Tempo médio até concluir</h3>
          <div className="grande">
            {d.tempoMedio === null
              ? "—"
              : d.tempoMedio < 1
                ? <>{"< 1"}<span className="unidade"> dia</span></>
                : <>{d.tempoMedio.toFixed(1)}<span className="unidade"> dias</span></>}
          </div>
          <p className="dica">
            {d.tempoMedio === null
              ? "Nenhuma pendência concluída ainda."
              : "Da abertura da pendência até a entrega, na média das concluídas."}
          </p>
        </div>
      </div>

      <div className="cartao">
        <h3>Concluídas por mês</h3>
        <div className="colunas" role="img" aria-label={`Concluídas por mês: ${d.meses.map((m) => `${m.rotulo}, ${m.total}`).join("; ")}`}>
          {d.meses.map((m) => (
            <div className="coluna" key={m.rotulo}>
              <span className="valor">{m.total}</span>
              <span className="haste" style={{ height: `${Math.max(3, Math.round((m.total / maior) * 100))}%` }} />
              <span className="mes">{m.rotulo}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
