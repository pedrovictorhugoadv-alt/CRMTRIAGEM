import { exigirSupervisor } from "@/lib/auth";
import { entregasSemCiencia, indicadores, listarPendencias, produtividade } from "@/lib/dados";
import { agrupar } from "@/lib/fila";
import Link from "next/link";
import { REGUAS, fmtData, hoje } from "@/lib/regua";
import Bloco from "@/componentes/Bloco";
import Kpi from "@/componentes/Kpi";

export const dynamic = "force-dynamic";

export default async function Painel() {
  await exigirSupervisor();

  const [ind, equipe, lista, aguardando] = await Promise.all([
    indicadores(),
    produtividade(),
    listarPendencias({}),
    entregasSemCiencia(),
  ]);
  const g = agrupar(lista);
  const maior = Math.max(1, ...equipe.map((l) => l.abertas));

  return (
    <>
      <div className="kpis">
        <Kpi tom="crit" rotulo="Atrasadas" valor={ind.atrasadas} pe="retorno vencido" />
        <Kpi tom="warn" rotulo="Para hoje" valor={ind.hoje} pe={`agendadas para ${fmtData(hoje())}`} />
        <Kpi rotulo="Em aberto" valor={ind.abertas} pe="total da triagem" />
        <Kpi rotulo="Régua esgotada" valor={ind.esgotadas} pe="passaram do D30" />
        <Kpi tom="warn" rotulo="Fora da régua" valor={ind.foraRegua} pe="data mexida pelo cobrador" />
        <Kpi tom="bom" rotulo="Concluídas (7 dias)" valor={ind.resolvidas7} pe="últimos 7 dias" />
        <Kpi rotulo="Entregas sem ciência" valor={aguardando} pe="conferir na aba Entregas" />
        <Kpi rotulo="Sem 1º contato" valor={ind.semContato} pe="nunca foram acionadas" />
      </div>

      <Bloco classe="esgotada" titulo="Régua esgotada — sua decisão" itens={g.esgotada} mostrarCobrador />

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>Produtividade por cobrador</h2>
      {equipe.length === 0 ? (
        <div className="vazio">
          <h3>Nenhum cobrador cadastrado</h3>
          <p>Vá em <b>Equipe</b> e cadastre os cobradores da triagem.</p>
        </div>
      ) : (
        <div className="tabela">
          <table>
            <thead>
              <tr>
                <th>Cobrador</th><th>Em aberto</th><th>Atrasadas</th><th>Carga</th>
                <th>Fora da régua</th><th>Concluídas 7d</th><th>Contatos 7d</th><th></th>
              </tr>
            </thead>
            <tbody>
              {equipe.map((l) => (
                <tr key={l.usuario}>
                  <td><Link href={`/painel/${l.usuario}`}>{l.nome}</Link></td>
                  <td className="num">{l.abertas}</td>
                  <td className="num" style={{ color: l.atrasadas ? "var(--crit)" : undefined, fontWeight: l.atrasadas ? 600 : 400 }}>
                    {l.atrasadas}
                  </td>
                  <td>
                    <span className="medidor">
                      <span style={{ width: `${Math.round((l.abertas / maior) * 100)}%`, background: l.atrasadas ? "var(--crit)" : "var(--accent)" }} />
                    </span>
                  </td>
                  <td className="num" style={{ color: l.fora_regua ? "var(--warn)" : undefined }}>{l.fora_regua}</td>
                  <td className="num">{l.resolvidas7}</td>
                  <td className="num">{l.contatos7}</td>
                  <td><Link className="btn ghost sm" href={`/painel/${l.usuario}`}>Progresso</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 26 }}>
        <Bloco classe="atrasadas" titulo="Atrasadas de toda a equipe" itens={g.atrasada.slice(0, 25)} mostrarCobrador />
      </div>

      <section style={{ marginTop: 26 }}>
        <div className="cartao destaque">
          <h3>Régua de contato da triagem</h3>
          <ol className="regua">
            {REGUAS.completa.map((n, i) => (
              <li key={n} className={i === 0 ? "agora" : ""}>
                <span className="dia">D{n}</span>
                <span className="data">+{n} {n === 1 ? "dia" : "dias"}</span>
              </li>
            ))}
          </ol>
          <p className="dica">
            Todos os prazos contam a partir da <b>abertura da pendência</b>, não do último contato — quem atrasa um
            toque não empurra os seguintes. A cada contato registrado o sistema avança a etapa e já agenda a próxima
            data. Depois do <b>D30</b> a pendência sai da fila do cobrador e vem para este painel, para você decidir:
            reiniciar a régua, encerrar sem êxito ou marcar como concluída. Se o cobrador mudar a data sugerida, a
            pendência fica marcada como <b>fora da régua</b>.
          </p>
          <p className="dica">
            Quando a entrega é <b>parcial</b>, a pendência entra numa <b>régua curta</b> —
            D{REGUAS.curta.join(" · D")} — contada da data da entrega, porque já houve avanço e o que falta
            costuma ser pontual.
          </p>
        </div>
      </section>
    </>
  );
}
