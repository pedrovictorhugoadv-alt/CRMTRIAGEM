import { STATUS, STATUS_CADASTRO, hoje, regua } from "@/lib/regua";
import type { Pendencia, Sessao, Usuario } from "@/lib/tipos";

const TIPOS = [
  "Documento faltante",
  "Exigência do INSS",
  "Assinatura de contrato",
  "Confirmação de dados",
  "Retorno de proposta",
  "Pagamento em aberto",
];

export default function FormPendencia({
  acao, p, pessoas, sessao, rotulo,
}: {
  acao: (dados: FormData) => Promise<void>;
  p?: Pendencia;
  pessoas: Usuario[];
  sessao: Sessao;
  rotulo: string;
}) {
  const passos = regua(p?.regua);
  const curta = (p?.regua ?? "completa") === "curta";

  return (
    <form action={acao}>
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <input type="hidden" name="regua" value={p?.regua ?? "completa"} />

      <div className="campo">
        <label htmlFor="cliente">Cliente</label>
        <input id="cliente" name="cliente" required defaultValue={p?.cliente ?? ""} />
      </div>

      <div className="duas">
        <div className="campo">
          <label htmlFor="cpf">CPF</label>
          <input id="cpf" name="cpf" inputMode="numeric" defaultValue={p?.cpf ?? ""} />
        </div>
        <div className="campo">
          <label htmlFor="telefone">Telefone / WhatsApp</label>
          <input id="telefone" name="telefone" inputMode="tel" defaultValue={p?.telefone ?? ""} />
        </div>
      </div>

      <div className="duas">
        <div className="campo">
          <label htmlFor="processo">Processo / benefício</label>
          <input id="processo" name="processo" defaultValue={p?.processo ?? ""} />
        </div>
        <div className="campo">
          <label htmlFor="tipo">Tipo de pendência</label>
          <input id="tipo" name="tipo" list="tipos" defaultValue={p?.tipo ?? ""} />
          <datalist id="tipos">
            {TIPOS.map((t) => <option key={t} value={t} />)}
          </datalist>
        </div>
      </div>

      <div className="duas">
        <div className="campo">
          <label htmlFor="cobrador">Cobrador responsável</label>
          <select id="cobrador" name="cobrador" defaultValue={p?.cobrador ?? sessao.usuario} disabled={sessao.papel !== "supervisor"}>
            {pessoas.map((u) => (
              <option key={u.usuario} value={u.usuario}>{u.nome}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="abertura">Abertura da régua</label>
          <input id="abertura" name="abertura" type="date" defaultValue={p?.abertura ?? hoje()} />
        </div>
      </div>

      <div className="duas">
        <div className="campo">
          <label htmlFor="etapa">Próximo toque</label>
          <select id="etapa" name="etapa" defaultValue={String(Math.min(p?.etapa ?? 0, passos.length - 1))}>
            {passos.map((n, i) => (
              <option key={n} value={i}>D{n} — {n} {n === 1 ? "dia" : "dias"} após a abertura</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={p?.status ?? "novo"}>
            {STATUS_CADASTRO.map((k) => (
              <option key={k} value={k}>{STATUS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="campo">
        <label htmlFor="obs">Observação</label>
        <textarea id="obs" name="obs" defaultValue={p?.obs ?? ""} />
      </div>

      <p className="dica">
        A data de retorno é calculada pela régua: abertura + o prazo do toque escolhido. Use <b>Próximo toque</b> para
        encaixar casos que já vêm de outro sistema.
        {curta ? " Esta pendência está na régua curta (D1 · D3 · D5) porque teve entrega parcial." : ""}
      </p>

      <div className="acoes">
        <button className="btn" type="submit">{rotulo}</button>
      </div>
    </form>
  );
}
