import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { entregasSemCiencia } from "@/lib/dados";
import { sair } from "@/app/acoes";
import Abas from "@/componentes/Abas";

export const dynamic = "force-dynamic";

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await exigirSessao();
  const aguardando = s.papel === "supervisor" ? await entregasSemCiencia() : 0;

  return (
    <>
      <div className="topo">
        <div className="marca">
          <span className="ponto" />
          <strong>Fila de Retorno</strong>
        </div>

        <Abas papel={s.papel} aguardando={aguardando} />

        <div className="vago" />

        <Link className="btn sm" href="/nova">+ Nova pendência</Link>

        <div className="quem">
          <span className="inicial">{iniciais(s.nome)}</span>
          <span>{s.nome}</span>
          <form action={sair}>
            <button className="btn ghost sm" type="submit">Sair</button>
          </form>
        </div>
      </div>
      <main>{children}</main>
    </>
  );
}
