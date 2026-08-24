"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { exigirSessao, exigirSupervisor, fecharSessao, gerarHash } from "@/lib/auth";
import { dataEtapa, hoje, totalEtapas } from "@/lib/regua";
import type { Pendencia } from "@/lib/tipos";

async function pendenciaPermitida(id: number): Promise<Pendencia> {
  const s = await exigirSessao();
  const linhas = await sql`
    select id, cobrador, status, etapa, regua, ciclo, parciais,
           to_char(abertura,'YYYY-MM-DD') as abertura
    from pendencias where id = ${id}
  `;
  const p = linhas[0] as Pendencia | undefined;
  if (!p) redirect("/");
  if (s.papel !== "supervisor" && p.cobrador !== s.usuario) redirect("/");
  return p;
}

function limpar(v: FormDataEntryValue | null): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

/* ---------------- registrar contato (avança a régua) ---------------- */

export async function registrarContato(dados: FormData): Promise<void> {
  const s = await exigirSessao();
  const id = Number(dados.get("id"));
  const p = await pendenciaPermitida(id);

  const etapaFeita = p.etapa ?? 0;
  const previsto = dataEtapa(p.abertura, etapaFeita, p.regua);
  const canal = String(dados.get("canal") || "WhatsApp");
  const nota = limpar(dados.get("nota"));
  const status = String(dados.get("status") || "contato_feito");
  const proxima = etapaFeita + 1;

  if (proxima >= totalEtapas(p.regua)) {
    await sql`
      insert into contatos (pendencia_id, canal, nota, por, status, etapa, previsto, tipo)
      values (${id}, ${canal}, ${nota}, ${s.usuario}, ${status}, ${etapaFeita}, ${previsto}::date, 'contato')
    `;
    await sql`
      update pendencias
      set status = 'esgotada', etapa = ${proxima}, retorno = current_date,
          esgotada_em = now(), resolvido_em = null
      where id = ${id}
    `;
  } else {
    const sugerida = dataEtapa(p.abertura, proxima, p.regua)!;
    const escolhida = limpar(dados.get("retorno")) ?? sugerida;
    const desviou = escolhida !== sugerida;

    await sql`
      insert into contatos (pendencia_id, canal, nota, por, status, etapa, previsto, fora_regua, tipo)
      values (${id}, ${canal}, ${nota}, ${s.usuario}, ${status}, ${etapaFeita}, ${previsto}::date, ${desviou}, 'contato')
    `;
    await sql`
      update pendencias
      set status = ${status}, etapa = ${proxima}, retorno = ${escolhida}::date,
          fora_regua = ${desviou}, resolvido_em = null
      where id = ${id}
    `;
  }

  revalidatePath("/", "layout");
  redirect(`/pendencia/${id}`);
}

/* ---------------- concluir ---------------- */

export async function concluir(dados: FormData): Promise<void> {
  const s = await exigirSessao();
  const id = Number(dados.get("id"));
  const p = await pendenciaPermitida(id);
  const nota = limpar(dados.get("nota"));

  await sql`
    insert into contatos (pendencia_id, canal, nota, por, status, etapa, previsto, tipo)
    values (${id}, ${String(dados.get("canal") || "Sistema")}, ${nota}, ${s.usuario},
            'resolvido', ${p.etapa ?? 0}, ${dataEtapa(p.abertura, p.etapa ?? 0, p.regua)}::date, 'conclusao')
  `;
  await sql`
    update pendencias
    set status = 'resolvido', resolvido_em = now(),
        entregue_em = now(), entregue_por = ${s.usuario}, visto_em = null
    where id = ${id}
  `;

  revalidatePath("/", "layout");
  redirect(`/pendencia/${id}`);
}

/* ---------------- parcialmente concluído: abre régua curta ---------------- */

export async function concluirParcial(dados: FormData): Promise<void> {
  const s = await exigirSessao();
  const id = Number(dados.get("id"));
  const p = await pendenciaPermitida(id);

  const falta = limpar(dados.get("falta"));
  if (!falta) redirect(`/pendencia/${id}?erro=falta`);

  const inicio = hoje();

  await sql`
    insert into contatos (pendencia_id, canal, nota, por, status, etapa, previsto, tipo)
    values (${id}, ${String(dados.get("canal") || "Sistema")},
            ${`Entrega parcial. Falta: ${falta}`}, ${s.usuario}, 'parcial',
            ${p.etapa ?? 0}, ${dataEtapa(p.abertura, p.etapa ?? 0, p.regua)}::date, 'parcial')
  `;
  await sql`
    update pendencias
    set status = 'parcial', regua = 'curta', ciclo = ciclo + 1, parciais = parciais + 1,
        abertura = ${inicio}::date, etapa = 0, retorno = ${dataEtapa(inicio, 0, "curta")}::date,
        fora_regua = false, reiniciado_em = now(), resolvido_em = null, esgotada_em = null,
        entregue_em = now(), entregue_por = ${s.usuario}, visto_em = null,
        obs = coalesce(obs || E'\n', '') || ${`Pendente desde ${inicio}: ${falta}`}
    where id = ${id}
  `;

  revalidatePath("/", "layout");
  redirect(`/pendencia/${id}`);
}

/* ---------------- ciência do gestor ---------------- */

export async function darCiencia(dados: FormData): Promise<void> {
  await exigirSupervisor();
  const id = limpar(dados.get("id"));

  if (id) {
    await sql`update pendencias set visto_em = now() where id = ${Number(id)}`;
  } else {
    await sql`update pendencias set visto_em = now() where entregue_em is not null and visto_em is null`;
  }

  revalidatePath("/", "layout");
  redirect("/entregas");
}

/* ---------------- decisão do supervisor ---------------- */

export async function decidir(dados: FormData): Promise<void> {
  const s = await exigirSessao();
  const id = Number(dados.get("id"));
  const qual = String(dados.get("qual"));
  await pendenciaPermitida(id);

  if (qual === "reiniciar") {
    const inicio = hoje();
    await sql`
      update pendencias
      set abertura = ${inicio}::date, etapa = 0, regua = 'completa', ciclo = ciclo + 1,
          retorno = ${dataEtapa(inicio, 0, "completa")}::date,
          status = 'contato_feito', fora_regua = false, reiniciado_em = now(),
          resolvido_em = null, encerrado_em = null, esgotada_em = null,
          entregue_em = null, entregue_por = null, visto_em = null
      where id = ${id}
    `;
    await sql`
      insert into contatos (pendencia_id, canal, nota, por, status, tipo)
      values (${id}, 'Sistema', 'Régua reiniciada.', ${s.usuario}, 'contato_feito', 'sistema')
    `;
  } else if (qual === "resolvido") {
    await sql`
      update pendencias set status = 'resolvido', resolvido_em = now(), visto_em = now()
      where id = ${id}
    `;
  } else if (qual === "sem_exito") {
    if (s.papel !== "supervisor") redirect(`/pendencia/${id}`);
    await sql`update pendencias set status = 'sem_exito', encerrado_em = now() where id = ${id}`;
  }

  revalidatePath("/", "layout");
  redirect(`/pendencia/${id}`);
}

/* ---------------- pendências ---------------- */

function camposPendencia(dados: FormData) {
  const abertura = limpar(dados.get("abertura")) ?? hoje();
  const regua = dados.get("regua") === "curta" ? "curta" : "completa";
  const etapa = Math.min(Math.max(Number(dados.get("etapa") ?? 0), 0), totalEtapas(regua) - 1);
  return {
    cliente: String(dados.get("cliente") || "").trim(),
    cpf: limpar(dados.get("cpf")),
    telefone: limpar(dados.get("telefone")),
    processo: limpar(dados.get("processo")),
    tipo: limpar(dados.get("tipo")),
    cobrador: limpar(dados.get("cobrador")),
    obs: limpar(dados.get("obs")),
    status: String(dados.get("status") || "novo"),
    abertura,
    regua,
    etapa,
    retorno: dataEtapa(abertura, etapa, regua)!,
  };
}

export async function criarPendencia(dados: FormData): Promise<void> {
  const s = await exigirSessao();
  const c = camposPendencia(dados);
  if (!c.cliente) redirect("/nova?erro=cliente");

  const cobrador = s.papel === "supervisor" ? c.cobrador : s.usuario;

  const linhas = await sql`
    insert into pendencias
      (cliente, cpf, telefone, processo, tipo, cobrador, status, abertura, regua, etapa, retorno, obs)
    values
      (${c.cliente}, ${c.cpf}, ${c.telefone}, ${c.processo}, ${c.tipo}, ${cobrador},
       ${c.status}, ${c.abertura}::date, ${c.regua}, ${c.etapa}, ${c.retorno}::date, ${c.obs})
    returning id
  `;

  revalidatePath("/", "layout");
  redirect(`/pendencia/${(linhas[0] as { id: number }).id}`);
}

export async function atualizarPendencia(dados: FormData): Promise<void> {
  const id = Number(dados.get("id"));
  await pendenciaPermitida(id);
  const c = camposPendencia(dados);
  if (!c.cliente) redirect(`/pendencia/${id}/editar?erro=cliente`);

  await sql`
    update pendencias set
      cliente = ${c.cliente}, cpf = ${c.cpf}, telefone = ${c.telefone},
      processo = ${c.processo}, tipo = ${c.tipo}, cobrador = ${c.cobrador},
      status = ${c.status}, abertura = ${c.abertura}::date, regua = ${c.regua},
      etapa = ${c.etapa}, retorno = ${c.retorno}::date, obs = ${c.obs}, fora_regua = false,
      resolvido_em = case when ${c.status} = 'resolvido' then coalesce(resolvido_em, now()) else null end
    where id = ${id}
  `;

  revalidatePath("/", "layout");
  redirect(`/pendencia/${id}`);
}

export async function excluirPendencia(dados: FormData): Promise<void> {
  await exigirSupervisor();
  const id = Number(dados.get("id"));
  await sql`delete from pendencias where id = ${id}`;
  revalidatePath("/", "layout");
  redirect("/todas");
}

/* ---------------- equipe ---------------- */

export async function criarUsuario(dados: FormData): Promise<void> {
  await exigirSupervisor();
  const usuario = String(dados.get("usuario") || "").trim().toLowerCase();
  const nome = String(dados.get("nome") || "").trim();
  const senha = String(dados.get("senha") || "");
  const papel = dados.get("papel") === "supervisor" ? "supervisor" : "cobrador";

  if (!usuario || !nome || senha.length < 6) redirect("/equipe?erro=dados");

  const existe = await sql`select 1 from usuarios where usuario = ${usuario}`;
  if (existe.length) redirect("/equipe?erro=duplicado");

  await sql`
    insert into usuarios (usuario, nome, papel, senha_hash)
    values (${usuario}, ${nome}, ${papel}, ${await gerarHash(senha)})
  `;
  revalidatePath("/", "layout");
  redirect("/equipe?ok=criado");
}

export async function trocarSenha(dados: FormData): Promise<void> {
  const s = await exigirSessao();
  const alvo = String(dados.get("usuario") || "").trim().toLowerCase();
  const senha = String(dados.get("senha") || "");

  if (s.papel !== "supervisor" && s.usuario !== alvo) redirect("/");
  if (senha.length < 6) redirect("/equipe?erro=senha");

  await sql`update usuarios set senha_hash = ${await gerarHash(senha)} where usuario = ${alvo}`;
  redirect("/equipe?ok=senha");
}

export async function desativarUsuario(dados: FormData): Promise<void> {
  await exigirSupervisor();
  const alvo = String(dados.get("usuario") || "").trim().toLowerCase();

  const abertas = await sql`
    select count(*)::int as n from pendencias
    where cobrador = ${alvo} and status not in ('resolvido','sem_exito')
  `;
  if ((abertas[0] as { n: number }).n > 0) redirect("/equipe?erro=carga");

  await sql`update usuarios set ativo = false where usuario = ${alvo}`;
  revalidatePath("/", "layout");
  redirect("/equipe?ok=removido");
}

export async function sair(): Promise<void> {
  await fecharSessao();
  redirect("/login");
}
