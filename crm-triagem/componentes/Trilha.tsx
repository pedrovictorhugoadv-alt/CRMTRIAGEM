import { fechada } from "@/lib/fila";
import { dataEtapa, diasAte, fmtDataCurta, regua } from "@/lib/regua";
import type { Contato, Pendencia } from "@/lib/tipos";

export default function Trilha({ p, contatos }: { p: Pendencia; contatos: Contato[] }) {
  const passos = regua(p.regua);
  const corte = p.reiniciado_em ? new Date(p.reiniciado_em).getTime() : 0;
  const feitos = new Map<number, Contato>();
  for (const c of contatos) {
    if (c.etapa == null) continue;
    if (new Date(c.em).getTime() <= corte) continue;
    if (!feitos.has(c.etapa)) feitos.set(c.etapa, c);
  }

  return (
    <ol className="regua" style={{ gridTemplateColumns: `repeat(${passos.length}, 1fr)` }}>
      {passos.map((dias, i) => {
        const previsto = dataEtapa(p.abertura, i, p.regua);
        const feito = feitos.get(i);
        let classe = "";
        let texto = fmtDataCurta(previsto);

        if (feito) {
          classe = "feito";
          texto = new Date(feito.em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          if (feito.fora_regua) classe += " desviado";
        } else if (i === p.etapa && !fechada(p) && p.status !== "esgotada") {
          classe = (diasAte(previsto) ?? 0) < 0 ? "vencido" : "agora";
        }

        return (
          <li key={dias} className={classe}>
            <span className="dia">D{dias}</span>
            <span className="data">{texto}</span>
          </li>
        );
      })}
    </ol>
  );
}
