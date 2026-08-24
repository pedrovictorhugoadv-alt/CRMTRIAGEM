import { exigirSupervisor } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listarUsuarios } from "@/lib/dados";
import { criarUsuario, desativarUsuario, trocarSenha } from "@/app/acoes";

export const dynamic = "force-dynamic";

const MENSAGENS: Record<string, string> = {
  dados: "Confira os campos — a senha precisa ter ao menos 6 caracteres.",
  duplicado: "Já existe alguém com esse usuário.",
  senha: "A senha precisa ter ao menos 6 caracteres.",
  carga: "Essa pessoa ainda tem pendências em aberto. Transfira antes de remover.",
};

export default async function Equipe({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  await exigirSupervisor();
  const { erro } = await searchParams;

  const pessoas = await listarUsuarios();
  const cargas = (await sql`
    select cobrador, count(*)::int as n
    from pendencias
    where status not in ('resolvido','sem_exito')
    group by cobrador
  `) as { cobrador: string | null; n: number }[];
  const porPessoa = new Map(cargas.map((c) => [c.cobrador, c.n]));

  return (
    <>
      <h2 style={{ fontSize: 16, marginBottom: 14 }}>Equipe</h2>
      {erro ? <p className="erro">{MENSAGENS[erro] ?? "Não foi possível concluir."}</p> : null}

      <div className="tabela" style={{ marginBottom: 22 }}>
        <table>
          <thead>
            <tr><th>Nome</th><th>Usuário</th><th>Papel</th><th>Em aberto</th><th>Senha</th><th></th></tr>
          </thead>
          <tbody>
            {pessoas.map((p) => (
              <tr key={p.usuario}>
                <td>{p.nome}</td>
                <td className="mono">{p.usuario}</td>
                <td>{p.papel === "supervisor" ? "Supervisor" : "Cobrador"}</td>
                <td className="num">{porPessoa.get(p.usuario) ?? 0}</td>
                <td>
                  <form action={trocarSenha} style={{ display: "flex", gap: 6 }}>
                    <input type="hidden" name="usuario" value={p.usuario} />
                    <input name="senha" type="password" placeholder="nova senha" minLength={6} required style={{ maxWidth: 150 }} />
                    <button className="btn ghost sm" type="submit">Trocar</button>
                  </form>
                </td>
                <td>
                  {p.papel === "supervisor" ? null : (
                    <form action={desativarUsuario}>
                      <input type="hidden" name="usuario" value={p.usuario} />
                      <button className="btn perigo sm" type="submit">Remover</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cartao">
        <h3>Cadastrar pessoa</h3>
        <form action={criarUsuario}>
          <div className="duas">
            <div className="campo">
              <label htmlFor="nome">Nome</label>
              <input id="nome" name="nome" required />
            </div>
            <div className="campo">
              <label htmlFor="usuario">Usuário (login)</label>
              <input id="usuario" name="usuario" required autoCapitalize="none" spellCheck={false} />
            </div>
          </div>
          <div className="duas">
            <div className="campo">
              <label htmlFor="papel">Papel</label>
              <select id="papel" name="papel" defaultValue="cobrador">
                <option value="cobrador">Cobrador</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
            <div className="campo">
              <label htmlFor="senha">Senha inicial</label>
              <input id="senha" name="senha" type="password" minLength={6} required />
            </div>
          </div>
          <div className="acoes">
            <button className="btn" type="submit">Cadastrar</button>
          </div>
        </form>
      </div>
    </>
  );
}
