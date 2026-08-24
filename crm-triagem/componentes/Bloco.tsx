import Linha from "./Linha";
import type { Pendencia } from "@/lib/tipos";

export default function Bloco({
  classe, titulo, itens, mostrarCobrador,
}: { classe?: string; titulo: string; itens: Pendencia[]; mostrarCobrador?: boolean }) {
  if (!itens.length) return null;
  return (
    <section className={`bloco ${classe ?? ""}`}>
      <h2>
        {titulo}
        <span className="qtd">{itens.length}</span>
      </h2>
      <div className="linhas">
        {itens.map((p) => (
          <Linha key={p.id} p={p} mostrarCobrador={mostrarCobrador} />
        ))}
      </div>
    </section>
  );
}
