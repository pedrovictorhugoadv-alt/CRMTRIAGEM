/**
 * Réguas de contato da triagem — dias corridos a partir da abertura do ciclo.
 *
 * `completa` é o ciclo normal de uma pendência nova.
 * `curta` entra quando o cobrador marca "parcialmente concluído": já houve
 * avanço, então o acompanhamento fica mais apertado até fechar o que falta.
 */
export const REGUAS = {
  completa: [1, 3, 5, 10, 15, 30],
  curta: [1, 3, 5],
} as const;

export type TipoRegua = keyof typeof REGUAS;

export function regua(tipo: string | null | undefined): readonly number[] {
  return tipo === "curta" ? REGUAS.curta : REGUAS.completa;
}

export const STATUS: Record<string, string> = {
  novo: "Novo",
  aguardando_doc: "Aguardando documento",
  contato_feito: "Contato feito",
  sem_retorno: "Sem retorno",
  parcial: "Parcialmente concluído",
  resolvido: "Concluída",
  esgotada: "Régua esgotada",
  sem_exito: "Encerrada sem êxito",
};

/** Status que o cobrador escolhe na mão ao registrar um contato. */
export const STATUS_MANUAL = ["novo", "aguardando_doc", "contato_feito", "sem_retorno"];

/** Status disponíveis no cadastro/edição da pendência. */
export const STATUS_CADASTRO = [...STATUS_MANUAL, "resolvido"];

export const CANAIS = ["WhatsApp", "Ligação", "Presencial", "E-mail", "SMS"];

export function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function somaDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Data do toque `etapa` de uma pendência aberta em `abertura`. */
export function dataEtapa(abertura: string, etapa: number, tipo?: string | null): string | null {
  const r = regua(tipo);
  if (etapa < 0 || etapa >= r.length) return null;
  return somaDias(abertura, r[etapa]);
}

export function nomeEtapa(etapa: number, tipo?: string | null): string {
  const r = regua(tipo);
  return etapa >= 0 && etapa < r.length ? `D${r[etapa]}` : "fim da régua";
}

export function totalEtapas(tipo?: string | null): number {
  return regua(tipo).length;
}

export function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const a = Date.parse(`${iso}T00:00:00Z`);
  const b = Date.parse(`${hoje()}T00:00:00Z`);
  return Math.round((a - b) / 86400000);
}

export function comoFalta(iso: string | null): string {
  const d = diasAte(iso);
  if (d === null) return "sem data";
  if (d < 0) return `${Math.abs(d)} ${Math.abs(d) === 1 ? "dia atrasado" : "dias atrasado"}`;
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  return `em ${d} dias`;
}

export function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function fmtDataCurta(iso: string | null): string {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function fmtMomento(valor: string | Date | null): string {
  if (!valor) return "—";
  const d = new Date(valor);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
