import { exigirSessao } from "@/lib/auth";
import { progresso } from "@/lib/dados";
import Progresso from "@/componentes/Progresso";

export const dynamic = "force-dynamic";

export default async function MeuProgresso() {
  const s = await exigirSessao();
  const d = await progresso(s.usuario);

  return (
    <>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Meu progresso</h1>
      <p className="dica" style={{ marginBottom: 20 }}>
        Como está a sua carteira — o que entrou, o que você entregou e se os toques da régua estão saindo no prazo.
      </p>
      <Progresso d={d} />
    </>
  );
}
