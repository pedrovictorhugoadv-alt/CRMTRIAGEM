import { diasAte } from "./regua";
import type { Pendencia } from "./tipos";

export type Faixa = "esgotada" | "atrasada" | "hoje" | "semana" | "depois" | "semdata" | "feito";

export function fechada(p: Pendencia): boolean {
  return p.status === "resolvido" || p.status === "sem_exito";
}

export function faixa(p: Pendencia): Faixa {
  if (p.status === "esgotada") return "esgotada";
  if (fechada(p)) return "feito";
  const d = diasAte(p.retorno);
  if (d === null) return "semdata";
  if (d < 0) return "atrasada";
  if (d === 0) return "hoje";
  if (d <= 7) return "semana";
  return "depois";
}

export function agrupar(lista: Pendencia[]): Record<Faixa, Pendencia[]> {
  const grupos: Record<Faixa, Pendencia[]> = {
    esgotada: [], atrasada: [], hoje: [], semana: [], depois: [], semdata: [], feito: [],
  };
  for (const p of lista) grupos[faixa(p)].push(p);
  grupos.feito.reverse();
  return grupos;
}
