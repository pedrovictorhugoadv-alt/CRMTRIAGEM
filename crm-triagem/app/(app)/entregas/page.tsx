import Link from "next/link";
import { exigirSupervisor } from "@/lib/auth";
import { entregas } from "@/lib/dados";
import { darCiencia } from "@/app/acoes";
import { STATUS, fmtMomento } from "@/lib/regua";

export const dynamic = "force-dynamic";

export default async function Entregas() {
  await exigirSupervisor();
  const lista = await entregas(40);
  const novas = lista.filter((p) => !p.visto_em);

  return (
    <>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", marginBottom: 4 }}>
        <h1 style={{ fontSize: 24 }}>Entregas</h1>
        {novas.length > 0 ? (
          <form action={darCiencia}>
            <button className="btn ghost sm" type="submit">Dar ciência em todas ({novas.length})</button>
          </form>
        ) : null}
      </div>
      <p className="dica" style={{ marginBottom: 20 }}>
        Toda vez que um cobrador conclui — inteira ou parcialmente — a pendência aparece aqui.
        Dar ciência só limpa o aviso; não muda nada na pendência.
      </p>

      {lista.length === 0 ? (
        <div className="vazio">
          <h3>Nenhuma entrega ainda</h3>
          <p>Quando alguém concluir uma pendência, ela aparece nesta lista.</p>
        </div>
      ) : (
        <div className="cartao">
          {lista.map((p) => (
            <div className="entrega" key={p.id}>
              <div>
                <Link href={`/pendencia/${p.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>
                  {p.cliente}
                </Link>
                {!p.visto_em ? <span className="novo">novo</span> : null}
                <div className="quem">
                  {p.entregue_por_nome || p.cobrador_nome || "—"} · {fmtMomento(p.entregue_em)}
                  {p.tipo ? ` · ${p.tipo}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`selo s-${p.status}`}>{STATUS[p.status] ?? p.status}</span>
                {!p.visto_em ? (
                  <form action={darCiencia}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn ghost sm" type="submit">Ciente</button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
