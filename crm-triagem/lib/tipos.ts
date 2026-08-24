export type Papel = "cobrador" | "supervisor";

export type Usuario = {
  usuario: string;
  nome: string;
  papel: Papel;
  ativo: boolean;
};

export type Contato = {
  id: number;
  pendencia_id: number;
  em: string;
  canal: string;
  nota: string | null;
  por: string | null;
  por_nome?: string | null;
  status: string | null;
  etapa: number | null;
  fora_regua: boolean;
  tipo: string;
  previsto: string | null;
};

export type Pendencia = {
  id: number;
  cliente: string;
  cpf: string | null;
  telefone: string | null;
  processo: string | null;
  tipo: string | null;
  cobrador: string | null;
  cobrador_nome?: string | null;
  status: string;
  abertura: string;
  etapa: number;
  retorno: string | null;
  fora_regua: boolean;
  obs: string | null;
  reiniciado_em: string | null;
  resolvido_em: string | null;
  esgotada_em: string | null;
  criado_em: string;
  regua: string;
  ciclo: number;
  parciais: number;
  entregue_em: string | null;
  entregue_por: string | null;
  entregue_por_nome?: string | null;
  visto_em: string | null;
  contatos_total?: number;
  ultimo_contato?: string | null;
};

export type Sessao = { usuario: string; nome: string; papel: Papel };
