import Link from "next/link";
import { fechada, faixa } from "@/lib/fila";
import { STATUS, comoFalta, fmtDataCurta, fmtMomento, nomeEtapa } from "@/lib/regua";
import type { Pendencia } from "@/lib/tipos";

export default function Linha({ p, mostrarCobrador }: { p: Pendencia; mostrarCobrador?: boolean }) {
  const f = faixa(p);
  const classe =
    f === "atrasada" ? "l-atrasada" :
    f === "hoje" ? "l-hoje" :
    f === "feito" ? "l-feito" :
    f === "esgotada" ? "l-esgotada" : "l-ok";

  const partes: string[] = [];
  if (!fechada(p)) partes.push(f === "esgotada" ? "fim da régua" : nomeEtapa(p.etapa));
  if (p.processo) partes.push(p.processo);
  partes.push(p.tipo || "sem tipo");
  if (mostrarCobrador) partes.push(p.cobrador_nome || "sem cobrador");
  partes.push(p.ultimo_contato ? `último contato ${fmtMomento(p.ultimo_contato)}` : "sem contato registrado");

  return (
    <Link className={`linha ${classe}`} href={`/pendencia/${p.id}`}>
      <span className="faixa" />
      <span>
        <span className="nome">{p.cliente}</span>
        <span className="meta">
          {partes.join(" · ")}
          {p.fora_regua && !fechada(p) ? <> · <span className="fora">fora da régua</span></> : null}
        </span>
      </span>
      <span className={`col-status selo s-${p.status}`}>{STATUS[p.status] ?? p.status}</span>
      <span className="quando">
        <span className="d">{fmtDataCurta(p.retorno)}</span>
        <span className="rel">{comoFalta(p.retorno)}</span>
      </span>
      <span className="col-tel selo">{p.telefone || "sem telefone"}</span>
    </Link>
  );
}
