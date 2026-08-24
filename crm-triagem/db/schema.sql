-- Estrutura do banco do CRM da triagem.
-- Rodado automaticamente por `npm run seed`.

create table if not exists usuarios (
  usuario     text primary key,
  nome        text not null,
  papel       text not null default 'cobrador' check (papel in ('cobrador','supervisor')),
  senha_hash  text not null,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table if not exists pendencias (
  id            serial primary key,
  cliente       text not null,
  cpf           text,
  telefone      text,
  processo      text,
  tipo          text,
  cobrador      text references usuarios(usuario) on delete set null,
  status        text not null default 'novo',
  abertura      date not null default current_date,
  etapa         integer not null default 0,
  retorno       date,
  fora_regua    boolean not null default false,
  obs           text,
  reiniciado_em timestamptz,
  resolvido_em  timestamptz,
  encerrado_em  timestamptz,
  esgotada_em   timestamptz,
  criado_em     timestamptz not null default now()
);

create index if not exists pendencias_fila on pendencias (cobrador, status, retorno);

create table if not exists contatos (
  id           serial primary key,
  pendencia_id integer not null references pendencias(id) on delete cascade,
  em           timestamptz not null default now(),
  canal        text not null,
  nota         text,
  por          text,
  status       text,
  etapa        integer,
  fora_regua   boolean not null default false
);

create index if not exists contatos_pendencia on contatos (pendencia_id, em desc);

-- ---------------------------------------------------------------
-- Entrega, conferência e régua curta (parcialmente concluído).
-- `add column if not exists` deixa este arquivo seguro de rodar
-- de novo num banco que já existe.
-- ---------------------------------------------------------------

alter table pendencias add column if not exists regua        text        not null default 'completa';
alter table pendencias add column if not exists ciclo        integer     not null default 1;
alter table pendencias add column if not exists parciais      integer     not null default 0;
alter table pendencias add column if not exists entregue_em  timestamptz;
alter table pendencias add column if not exists entregue_por text;
alter table pendencias add column if not exists visto_em     timestamptz;

alter table contatos   add column if not exists tipo     text not null default 'contato';
alter table contatos   add column if not exists previsto date;

create index if not exists pendencias_entregas on pendencias (entregue_em desc);
