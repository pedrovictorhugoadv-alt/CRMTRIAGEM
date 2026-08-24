import "server-only";
import { sql } from "./db";
import type { Contato, Pendencia, Usuario } from "./tipos";

const CAMPOS = `
  p.id, p.cliente, p.cpf, p.telefone, p.processo, p.tipo, p.cobrador,
  u.nome as cobrador_nome, p.status, p.etapa, p.fora_regua, p.obs,
  p.regua, p.ciclo, p.parciais, p.entregue_em, p.entregue_por, p.visto_em,
  to_char(p.abertura, 'YYYY-MM-DD') as abertura,
  to_char(p.retorno,  'YYYY-MM-DD') as retorno,
  p.reiniciado_em, p.resolvido_em, p.esgotada_em, p.criado_em
`;

export async function listarPendencias(filtro: {
  cobrador?: string | null;
  status?: string | null;
  busca?: string | null;
}): Promise<Pendencia[]> {
  const cobrador = filtro.cobrador ?? null;
  const status = filtro.status || null;
  const busca = filtro.busca?.trim() || null;

  const linhas = await sql`
    select ${sql.unsafe(CAMPOS)},
      (select count(*) from contatos c where c.pendencia_id = p.id) as contatos_total,
      (select max(c.em) from contatos c where c.pendencia_id = p.id) as ultimo_contato
    from pendencias p
    left join usuarios u on u.usuario = p.cobrador
    where (${cobrador}::text is null or p.cobrador = ${cobrador})
      and (${status}::text is null or p.status = ${status})
      and (${busca}::text is null or (
        p.cliente ilike '%' || ${busca} || '%'
        or coalesce(p.cpf, '') ilike '%' || ${busca} || '%'
        or coalesce(p.processo, '') ilike '%' || ${busca} || '%'
        or coalesce(p.telefone, '') ilike '%' || ${busca} || '%'
      ))
    order by p.retorno asc nulls last, p.id asc
  `;
  return linhas as Pendencia[];
}

export async function pegarPendencia(id: number): Promise<Pendencia | null> {
  const linhas = await sql`
    select ${sql.unsafe(CAMPOS)}
    from pendencias p
    left join usuarios u on u.usuario = p.cobrador
    where p.id = ${id}
  `;
  return (linhas[0] as Pendencia) ?? null;
}

export async function listarContatos(pendenciaId: number): Promise<Contato[]> {
  const linhas = await sql`
    select c.*, u.nome as por_nome
    from contatos c
    left join usuarios u on u.usuario = c.por
    where c.pendencia_id = ${pendenciaId}
    order by c.em asc
  `;
  return linhas as Contato[];
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const linhas = await sql`
    select usuario, nome, papel, ativo
    from usuarios
    where ativo = true
    order by papel desc, nome asc
  `;
  return linhas as Usuario[];
}

export type LinhaEquipe = {
  usuario: string;
  nome: string;
  abertas: number;
  atrasadas: number;
  fora_regua: number;
  resolvidas7: number;
  contatos7: number;
};

export async function produtividade(): Promise<LinhaEquipe[]> {
  const linhas = await sql`
    select
      u.usuario,
      u.nome,
      count(*) filter (where p.status not in ('resolvido','sem_exito'))                                        as abertas,
      count(*) filter (where p.status not in ('resolvido','sem_exito','esgotada') and p.retorno < current_date) as atrasadas,
      count(*) filter (where p.status not in ('resolvido','sem_exito') and p.fora_regua)                        as fora_regua,
      count(*) filter (where p.status = 'resolvido' and p.resolvido_em > now() - interval '7 days')             as resolvidas7,
      coalesce((
        select count(*) from contatos c
        where c.por = u.usuario and c.em > now() - interval '7 days'
      ), 0) as contatos7
    from usuarios u
    left join pendencias p on p.cobrador = u.usuario
    where u.ativo = true and u.papel = 'cobrador'
    group by u.usuario, u.nome
    order by atrasadas desc, abertas desc, u.nome asc
  `;
  return (linhas as Record<string, unknown>[]).map((l) => ({
    usuario: String(l.usuario),
    nome: String(l.nome),
    abertas: Number(l.abertas),
    atrasadas: Number(l.atrasadas),
    fora_regua: Number(l.fora_regua),
    resolvidas7: Number(l.resolvidas7),
    contatos7: Number(l.contatos7),
  }));
}

export async function indicadores() {
  const linhas = await sql`
    select
      count(*) filter (where status not in ('resolvido','sem_exito'))                                        as abertas,
      count(*) filter (where status not in ('resolvido','sem_exito','esgotada') and retorno < current_date)   as atrasadas,
      count(*) filter (where status not in ('resolvido','sem_exito','esgotada') and retorno = current_date)   as hoje,
      count(*) filter (where status = 'esgotada')                                                            as esgotadas,
      count(*) filter (where status not in ('resolvido','sem_exito') and fora_regua)                          as fora_regua,
      count(*) filter (where status = 'resolvido' and resolvido_em > now() - interval '7 days')               as resolvidas7,
      count(*) filter (where status not in ('resolvido','sem_exito')
        and not exists (select 1 from contatos c where c.pendencia_id = pendencias.id))                       as sem_contato
    from pendencias
  `;
  const l = linhas[0] as Record<string, unknown>;
  return {
    abertas: Number(l.abertas),
    atrasadas: Number(l.atrasadas),
    hoje: Number(l.hoje),
    esgotadas: Number(l.esgotadas),
    foraRegua: Number(l.fora_regua),
    resolvidas7: Number(l.resolvidas7),
    semContato: Number(l.sem_contato),
  };
}

/* ---------------- entregas ---------------- */

export async function entregas(limite = 30): Promise<Pendencia[]> {
  const linhas = await sql`
    select ${sql.unsafe(CAMPOS)}, e.nome as entregue_por_nome
    from pendencias p
    left join usuarios u on u.usuario = p.cobrador
    left join usuarios e on e.usuario = p.entregue_por
    where p.entregue_em is not null
    order by p.entregue_em desc
    limit ${limite}
  `;
  return linhas as Pendencia[];
}

export async function entregasSemCiencia(): Promise<number> {
  const linhas = await sql`
    select count(*)::int as n from pendencias
    where entregue_em is not null and visto_em is null
  `;
  return (linhas[0] as { n: number }).n;
}

/* ---------------- métricas de progresso ---------------- */

export type Progresso = {
  cadastradas: number;
  pendentes: number;
  concluidas: number;
  concluidasSemana: number;
  concluidasMes: number;
  concluidasMesAnterior: number;
  semExito: number;
  parciais: number;
  atrasadas: number;
  taxa: number | null;
  tempoMedio: number | null;
  toques: number;
  toquesNoPrazo: number;
  adesao: number | null;
  meses: { rotulo: string; total: number }[];
};

export async function progresso(usuario: string | null): Promise<Progresso> {
  const alvo = usuario ?? null;

  const g = (await sql`
    select
      count(*)                                                                        as cadastradas,
      count(*) filter (where status not in ('resolvido','sem_exito'))                  as pendentes,
      count(*) filter (where status = 'resolvido')                                     as concluidas,
      count(*) filter (where status = 'sem_exito')                                     as sem_exito,
      coalesce(sum(parciais), 0)                                                       as parciais,
      count(*) filter (where status not in ('resolvido','sem_exito','esgotada')
                         and retorno < current_date)                                   as atrasadas,
      count(*) filter (where status = 'resolvido'
                         and resolvido_em >= date_trunc('week', now()))                as semana,
      count(*) filter (where status = 'resolvido'
                         and resolvido_em >= date_trunc('month', now()))               as mes,
      count(*) filter (where status = 'resolvido'
                         and resolvido_em >= date_trunc('month', now()) - interval '1 month'
                         and resolvido_em <  date_trunc('month', now()))               as mes_anterior,
      avg(extract(epoch from (resolvido_em - criado_em)) / 86400)
        filter (where status = 'resolvido')                                            as tempo_medio
    from pendencias
    where (${alvo}::text is null or cobrador = ${alvo})
  `)[0] as Record<string, unknown>;

  const t = (await sql`
    select
      count(*)                                                   as total,
      count(*) filter (where c.em::date <= c.previsto)           as no_prazo
    from contatos c
    join pendencias p on p.id = c.pendencia_id
    where c.previsto is not null
      and (${alvo}::text is null or c.por = ${alvo})
  `)[0] as Record<string, unknown>;

  const serie = (await sql`
    select to_char(mes, 'MM/YY') as rotulo, coalesce(n, 0)::int as total
    from generate_series(date_trunc('month', now()) - interval '5 months',
                         date_trunc('month', now()), interval '1 month') as mes
    left join (
      select date_trunc('month', resolvido_em) as m, count(*) as n
      from pendencias
      where status = 'resolvido'
        and (${alvo}::text is null or cobrador = ${alvo})
      group by 1
    ) x on x.m = mes
    order by mes
  `) as { rotulo: string; total: number }[];

  const concluidas = Number(g.concluidas);
  const semExito = Number(g.sem_exito);
  const encerradas = concluidas + semExito;
  const toques = Number(t.total);
  const noPrazo = Number(t.no_prazo);

  return {
    cadastradas: Number(g.cadastradas),
    pendentes: Number(g.pendentes),
    concluidas,
    concluidasSemana: Number(g.semana),
    concluidasMes: Number(g.mes),
    concluidasMesAnterior: Number(g.mes_anterior),
    semExito,
    parciais: Number(g.parciais),
    atrasadas: Number(g.atrasadas),
    taxa: encerradas > 0 ? concluidas / encerradas : null,
    tempoMedio: g.tempo_medio == null ? null : Number(g.tempo_medio),
    toques,
    toquesNoPrazo: noPrazo,
    adesao: toques > 0 ? noPrazo / toques : null,
    meses: serie.map((s) => ({ rotulo: s.rotulo, total: Number(s.total) })),
  };
}

export async function pegarUsuario(usuario: string): Promise<Usuario | null> {
  const linhas = await sql`
    select usuario, nome, papel, ativo from usuarios where usuario = ${usuario}
  `;
  return (linhas[0] as Usuario) ?? null;
}
