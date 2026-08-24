# Fila de Retorno — CRM da triagem

Acompanhamento das pendências da triagem com **régua de contato D1 · D3 · D5 · D10 · D15 · D30**,
histórico de contatos e painel do supervisor.

Feito para rodar na **Vercel** com banco **Neon** (Postgres).

---

## O que o sistema faz

- **Login por pessoa.** Cada cobrador vê apenas a própria carteira; o supervisor vê tudo.
- **Fila organizada por urgência:** régua esgotada, atrasadas, para hoje, próximos 7 dias, mais adiante, sem data, encerradas.
- **Régua automática.** Os prazos contam da *abertura* da pendência, não do último contato — quem atrasa
  um toque não empurra os seguintes. Cada contato registrado avança a etapa e já agenda a próxima data.
- **Desvio fica registrado.** Se o cobrador mudar a data sugerida, a pendência é marcada como
  *fora da régua* e isso aparece no painel do supervisor.
- **Concluir a pendência.** Botão próprio no detalhe: o cobrador registra o que recebeu, a pendência
  sai da fila e a entrega é sinalizada ao gestor na aba **Entregas** (com aviso numerado no menu,
  que some quando ele dá ciência).
- **Parcialmente concluído.** Quando vem só parte do que foi pedido, o cobrador descreve o que falta
  e a pendência entra numa **régua curta — D1 · D3 · D5** contada da data da entrega, porque já houve
  avanço. O que falta é anexado à observação e a entrega parcial também aparece para o gestor.
- **Depois do último toque da régua** a pendência sai da fila do cobrador e vai para o supervisor decidir:
  reiniciar a régua, encerrar sem êxito ou marcar como concluída.
- **Painel do supervisor** com atrasadas, para hoje, em aberto, régua esgotada, fora da régua,
  concluídas nos últimos 7 dias, entregas sem ciência e sem primeiro contato — e produtividade por cobrador.
- **Meu progresso** (cobrador) e **um painel por cobrador** (gestor, clicando no nome na tabela de
  produtividade): cadastradas, pendentes, concluídas, atrasadas, entregas parciais, concluídas na
  semana e no mês com comparação, taxa de resolução, adesão à régua, tempo médio até concluir e
  concluídas por mês nos últimos seis meses.

---

## Como colocar no ar

### 1. Criar o banco no Neon

1. Entre em <https://neon.tech> e crie uma conta (o plano gratuito basta).
2. Crie um projeto — anote a *connection string*, algo como
   `postgresql://usuario:senha@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require`.

> Se preferir, dá para pular esta etapa e usar a integração da Vercel (passo 3), que cria o Neon
> e preenche a `DATABASE_URL` sozinha.

### 2. Subir o código

Coloque esta pasta num repositório do GitHub:

```bash
git init
git add .
git commit -m "CRM da triagem"
git branch -M main
git remote add origin git@github.com:SEU-USUARIO/crm-triagem.git
git push -u origin main
```

### 3. Publicar na Vercel

1. Em <https://vercel.com> → **Add New → Project** → importe o repositório.
2. Em **Storage**, conecte um banco Neon (ou cole a `DATABASE_URL` você mesmo).
3. Em **Settings → Environment Variables**, adicione:

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | a connection string do Neon |
   | `AUTH_SECRET` | um valor aleatório longo — gere com `openssl rand -base64 32` |

4. **Deploy**.

### 4. Criar as tabelas e o primeiro acesso

Na sua máquina, com a `DATABASE_URL` do Neon em mãos:

```bash
npm install
DATABASE_URL="postgresql://..." \
ADMIN_USUARIO="pedro" \
ADMIN_NOME="Pedro Moraes" \
ADMIN_SENHA="uma-senha-boa" \
npm run seed
```

Isso cria as tabelas e o primeiro supervisor. Entre no site, vá em **Equipe** e cadastre os cobradores.

---

## Atualizar um sistema que já está no ar

Depois de mexer no código:

```bash
git add .
git commit -m "descreva a mudança"
git push
```

A Vercel publica sozinha. **Se a atualização mexeu no banco** (colunas novas), rode também, uma vez:

```bash
DATABASE_URL="postgresql://..." npm run seed
```

O `db/schema.sql` usa `create table if not exists` e `add column if not exists`, então rodar de novo
é seguro: cria só o que falta e não apaga nada.

## Rodar na sua máquina

Com um Postgres local (o projeto detecta sozinho e usa o driver comum em vez do Neon):

```bash
cp .env.example .env      # preencha DATABASE_URL e AUTH_SECRET
npm install
npm run seed
npm run dev               # http://localhost:3000
```

---

## Estrutura

```
app/
  login/                 tela de entrada
  (app)/                 área autenticada (cabeçalho, abas, fila)
    page.tsx             minha fila
    todas/               todas as pendências (supervisor)
    painel/              indicadores e produtividade (supervisor)
    equipe/              cadastro de pessoas (supervisor)
    nova/                nova pendência
    pendencia/[id]/      detalhe, régua, histórico, contato, conclusão e entrega parcial
    entregas/            entregas dos cobradores e ciência do gestor (supervisor)
    progresso/           painel de progresso do próprio usuário
    painel/[usuario]/    painel de progresso de um cobrador (supervisor)
  acoes.ts               server actions (contato, conclusão, parcial, régua, decisões, equipe)
lib/
  regua.ts               a régua D1–D30 e os cálculos de data
  fila.ts                classificação das pendências por urgência
  auth.ts                sessão em cookie assinado (JWT) + bcrypt
  dados.ts               consultas
  db.ts                  conexão (Neon em produção, pg no local)
db/schema.sql            estrutura das tabelas
scripts/seed.mjs         cria as tabelas e o primeiro supervisor
```

## Ajustar a régua

Os prazos ficam num lugar só, em `lib/regua.ts`:

```ts
export const REGUAS = {
  completa: [1, 3, 5, 10, 15, 30],  // pendência nova
  curta:    [1, 3, 5],              // depois de uma entrega parcial
} as const;
```

Mudar essa linha muda a régua inteira — a trilha visual, as datas sugeridas e o ponto em que a
pendência é considerada esgotada. Pendências já abertas seguem a régua nova a partir do próximo toque.

## Segurança

- Senhas guardadas com **bcrypt**; sessão em cookie `httpOnly` assinado com `AUTH_SECRET`.
- Cobrador só enxerga e altera as próprias pendências — a checagem é feita no servidor,
  não só na tela.
- Troque a senha do supervisor depois do primeiro acesso e use `AUTH_SECRET` diferente
  de qualquer exemplo desta documentação.
