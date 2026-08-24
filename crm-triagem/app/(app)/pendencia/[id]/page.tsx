import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { listarContatos, pegarPendencia } from "@/lib/dados";
import { fechada } from "@/lib/fila";
import {
  CANAIS, STATUS, STATUS_MANUAL,
  comoFalta, dataEtapa, fmtData, fmtMomento, nomeEtapa, regua, totalEtapas,
} from "@/lib/regua";
import { concluir, concluirParcial, decidir, excluirPendencia, registrarContato } from "@/app/acoes";
import Trilha from "@/componentes/Trilha";

export const dynamic = "force-dynamic";

export default async function Detalhe({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const s = await exigirSessao();
  const { id } = await params;
  const { erro } = await searchParams;
  const p = await pegarPendencia(Number(id));
  if (!p) notFound();
  if (s.papel !== "supervisor" && p.cobrador !== s.usuario) redirect("/");

  const contatos = await listarContatos(p.id);
  const historico = [...contatos].reverse();
  const telefone = (p.telefone ?? "").replace(/\D/g, "");
  const proxima = p.etapa + 1 < totalEtapas(p.regua) ? dataEtapa(p.abertura, p.etapa + 1, p.regua) : null;
  const passos = regua(p.regua);

  return (
    <>
      <Link className="voltar" href={s.papel === "supervisor" ? "/todas" : "/"}>← voltar para a fila</Link>

      <header style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: 22 }}>{p.cliente}</h1>
          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className={`selo s-${p.status}`}>{STATUS[p.status] ?? p.status}</span>
            {fechada(p) ? null : (
              <span className="selo">retorno {fmtData(p.retorno)} · {comoFalta(p.retorno)}</span>
            )}
            {p.fora_regua && !fechada(p) ? <span className="selo" style={{ color: "var(--warn)" }}>fora da régua</span> : null}
            {p.regua === "curta" && !fechada(p) ? <span className="selo">régua curta · D{passos.join(" · D")}</span> : null}
            {p.parciais > 0 ? <span className="selo">{p.parciais} entrega{p.parciais > 1 ? "s" : ""} parcial{p.parciais > 1 ? "is" : ""}</span> : null}
          </div>
        </div>
        <Link className="btn ghost sm" href={`/pendencia/${p.id}/editar`}>Editar dados</Link>
      </header>

      {p.entregue_em && !fechada(p) ? null : null}
      {p.entregue_em ? (
        <div className="nota-entrega cartao destaque">
          <h3>Entrega</h3>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
            {p.entregue_por_nome || p.cobrador_nome || "—"} registrou a entrega em {fmtMomento(p.entregue_em)}
            {p.visto_em ? " · gestor já deu ciência" : " · aguardando ciência do gestor"}.
          </p>
        </div>
      ) : null}

      <div className="cartao">
        <h3>Dados do cliente</h3>
        <dl className="dl">
          <dt>CPF</dt><dd className="mono">{p.cpf || "—"}</dd>
          <dt>Telefone</dt>
          <dd>
            {telefone ? (
              <a href={`https://wa.me/55${telefone}`} target="_blank" rel="noopener noreferrer">{p.telefone}</a>
            ) : "—"}
          </dd>
          <dt>Processo / benefício</dt><dd>{p.processo || "—"}</dd>
          <dt>Tipo de pendência</dt><dd>{p.tipo || "—"}</dd>
          <dt>Cobrador</dt><dd>{p.cobrador_nome || "—"}</dd>
          <dt>Aberta em</dt><dd>{fmtData(p.abertura)}</dd>
        </dl>
        {p.obs ? <p style={{ marginTop: 12, fontSize: 13.5, color: "var(--ink-2)" }}>{p.obs}</p> : null}
        {s.papel === "supervisor" ? (
          <form action={excluirPendencia} className="acoes esq">
            <input type="hidden" name="id" value={p.id} />
            <button className="btn perigo sm" type="submit">Excluir pendência</button>
          </form>
        ) : null}
      </div>

      <div className="cartao">
        <h3>Régua de contato</h3>
        <Trilha p={p} contatos={contatos} />
        <p className="dica">
          {p.ciclo > 1 ? `${p.ciclo}º ciclo · ` : ""}Abertura em {fmtData(p.abertura)} ·{" "}
          {p.status === "esgotada"
            ? "régua esgotada — aguardando decisão"
            : fechada(p)
              ? (STATUS[p.status] ?? p.status).toLowerCase()
              : <>próximo toque <b>{nomeEtapa(p.etapa, p.regua)}</b> em {fmtData(p.retorno)} ({comoFalta(p.retorno)})</>}
        </p>
      </div>

      {p.status === "esgotada" ? (
        <div className="cartao destaque">
          <h3>Régua esgotada — decisão</h3>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
            Todos os toques da régua foram feitos e o cliente não resolveu.{" "}
            {s.papel === "supervisor" ? "Escolha o desfecho:" : "Aguardando decisão do supervisor."}
          </p>
          {s.papel === "supervisor" ? (
            <div className="acoes esq">
              {[
                { qual: "reiniciar", texto: "Reiniciar a régua hoje", classe: "btn sm" },
                { qual: "resolvido", texto: "Marcar como concluída", classe: "btn ghost sm" },
                { qual: "sem_exito", texto: "Encerrar sem êxito", classe: "btn perigo sm" },
              ].map((b) => (
                <form key={b.qual} action={decidir}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="qual" value={b.qual} />
                  <button className={b.classe} type="submit">{b.texto}</button>
                </form>
              ))}
            </div>
          ) : null}
        </div>
      ) : fechada(p) ? (
        <div className="cartao">
          <h3>Pendência encerrada</h3>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
            {STATUS[p.status]}{p.resolvido_em ? ` em ${fmtMomento(p.resolvido_em)}` : ""}.
          </p>
          <form action={decidir} className="acoes esq">
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="qual" value="reiniciar" />
            <button className="btn ghost sm" type="submit">Reabrir e reiniciar a régua</button>
          </form>
        </div>
      ) : (
        <div className="cartao">
          <h3>Registrar contato — {nomeEtapa(p.etapa, p.regua)}</h3>
          <form action={registrarContato}>
            <input type="hidden" name="id" value={p.id} />
            <div className="duas">
              <div className="campo">
                <label htmlFor="canal">Canal</label>
                <select id="canal" name="canal" defaultValue="WhatsApp">
                  {CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="status">Novo status</label>
                <select id="status" name="status" defaultValue={p.status === "novo" ? "contato_feito" : p.status}>
                  {STATUS_MANUAL.map((k) => <option key={k} value={k}>{STATUS[k]}</option>)}
                </select>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="nota">O que foi tratado</label>
              <textarea id="nota" name="nota" placeholder="Ex.: falei com a filha, vai levar a carteira de trabalho na sexta." />
            </div>

            {proxima ? (
              <>
                <div className="campo">
                  <label htmlFor="retorno">Próximo toque — {nomeEtapa(p.etapa + 1, p.regua)} (sugerido pela régua)</label>
                  <input id="retorno" name="retorno" type="date" defaultValue={proxima} />
                </div>
                <p className="dica">
                  Mudar esta data marca a pendência como <b>fora da régua</b> no painel do supervisor.
                </p>
              </>
            ) : (
              <p className="dica">
                Este é o último toque desta régua ({nomeEtapa(p.etapa, p.regua)}). Ao salvar, a pendência vai para o supervisor decidir o desfecho.
              </p>
            )}

            <div className="acoes">
              <button className="btn" type="submit">Salvar contato</button>
            </div>
          </form>
        </div>
      )}

      {!fechada(p) && p.status !== "esgotada" ? (
        <div className="entregar">
          <div className="cartao">
            <h3>Concluir a pendência</h3>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 12 }}>
              O cliente entregou tudo e não há mais o que cobrar. A pendência sai da fila e o gestor
              é avisado na aba <b>Entregas</b>.
            </p>
            <form action={concluir}>
              <input type="hidden" name="id" value={p.id} />
              <div className="duas">
                <div className="campo">
                  <label htmlFor="canal-c">Como recebeu</label>
                  <select id="canal-c" name="canal" defaultValue="WhatsApp">
                    {CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="campo">
                <label htmlFor="nota-c">O que foi entregue</label>
                <textarea id="nota-c" name="nota" placeholder="Ex.: recebi a CTPS e o comprovante de residência pelo WhatsApp." />
              </div>
              <div className="acoes">
                <button className="btn" type="submit">Concluir pendência</button>
              </div>
            </form>
          </div>

          <div className="cartao">
            <h3>Parcialmente concluído</h3>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 12 }}>
              Veio parte do que foi pedido. Descreva o que ainda falta: a pendência entra numa
              <b> régua curta</b> (D1 · D3 · D5) contada a partir de hoje, e o gestor é avisado.
            </p>
            {erro === "falta" ? <p className="erro">Descreva o que ainda falta para registrar a entrega parcial.</p> : null}
            <form action={concluirParcial}>
              <input type="hidden" name="id" value={p.id} />
              <div className="duas">
                <div className="campo">
                  <label htmlFor="canal-p">Como recebeu</label>
                  <select id="canal-p" name="canal" defaultValue="WhatsApp">
                    {CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="campo">
                <label htmlFor="falta">O que ainda falta</label>
                <textarea id="falta" name="falta" required placeholder="Ex.: entregou a CTPS, falta o comprovante de residência atualizado." />
              </div>
              <div className="acoes">
                <button className="btn ghost" type="submit">Registrar entrega parcial</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="cartao">
        <h3>Histórico ({historico.length})</h3>
        {historico.length === 0 ? (
          <p style={{ fontSize: 13.5, color: "var(--ink-3)" }}>Nenhum contato registrado ainda.</p>
        ) : (
          <ul className="historico">
            {historico.map((c) => (
              <li key={c.id}>
                <span className="qd">{fmtMomento(c.em)}</span>
                <span>
                  <span className="oq">
                    <b>{c.canal}</b>
                    {c.etapa != null ? ` (${nomeEtapa(c.etapa, p.regua)})` : ""}
                    {c.nota ? ` — ${c.nota}` : ""}
                  </span>
                  <br />
                  <span className="qm">
                    {c.por_nome || c.por || "sistema"}
                    {c.status ? ` · marcou como ${STATUS[c.status] ?? c.status}` : ""}
                    {c.fora_regua ? " · agendou fora da régua" : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
