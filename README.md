# Painel de Alunos — Controle de Planos e Emissão de NFe

Sistema próprio (fora do Claude) para controlar alunos/clientes, planos, forma de
pagamento e quem precisa de emissão de NFe. Tem dois níveis de acesso (matriz e
cliente), cada um com senha própria e trocável.

## O que já vem pronto

- Dashboard com indicadores: ativos, quem emite NFe, ticket médio, valor total
  arrecadado e detalhamento por forma de pagamento.
- Filtros por status, plano, forma de pagamento, emissão de NFe e busca por nome/CPF.
- Cadastro, edição e exclusão de aluno, com validação de CPF (dígito verificador
  real), nome completo, idade, e campos obrigatórios.
- Dois logins (Matriz e Cliente), cada um com sua própria senha, armazenada com
  hash (bcrypt) — nunca em texto puro.
- Tela para trocar a própria senha (qualquer um dos dois perfis).
- 24 alunos da sua planilha já importados.

## ⚠️ Antes de tudo: troque as senhas padrão

Por padrão (apenas no primeiro uso, antes de você logar e trocar):
- Matriz: `matriz123`
- Cliente: `cliente123`

Entre com cada uma e use o botão **"Alterar senha"** no topo do painel para
definir senhas suas. Depois disso as senhas padrão deixam de existir.

## Como rodar na sua máquina

Pré-requisito: ter o [Node.js](https://nodejs.org) instalado (versão 18 ou mais nova).

```bash
cd painel-nfe
npm install
npm start
```

Acesse **http://localhost:3000** no navegador.

Os dados ficam salvos em `data/db.json` (esse arquivo é o seu banco de dados —
faça backup dele periodicamente).

## Como publicar como site, de graça (Render + banco Neon)

Para 2 clientes, dá para rodar 100% sem custo. A diferença em relação à versão
anterior: em vez de guardar os dados num "disco" (que é pago no Render), eles
ficam num banco de dados na nuvem com plano gratuito permanente (Neon —
não pede cartão de crédito).

### 1. Criar o banco de dados gratuito (Neon)

1. Acesse **https://neon.tech** e crie uma conta gratuita (pode entrar com
   GitHub, é mais rápido).
2. Crie um novo projeto (qualquer nome, ex: `painel-nfe`).
3. Na tela do projeto, procure o botão **"Connection string"** (ou
   "Connect"). Copie o texto que começa com `postgresql://...` — essa é a
   "chave" de acesso ao seu banco. Guarde em algum lugar seguro por enquanto.

### 2. Subir o projeto para o GitHub

(Pule esta parte se você já fez isso antes.)

1. Crie uma conta gratuita em **https://github.com**.
2. Clique em **New repository**, dê um nome (ex: `painel-nfe`), marque como
   **Private**, clique em **Create repository**.
3. Clique em **uploading an existing file** e arraste **o conteúdo de dentro**
   da pasta `painel-nfe` (não a pasta em si, os arquivos soltos: server.js,
   package.json, render.yaml, a pasta public, etc.).
4. Clique em **Commit changes**.

### 3. Criar o site no Render

1. Crie uma conta gratuita em **https://render.com** (pode entrar com GitHub).
2. Clique em **New** → **Blueprint**, selecione seu repositório `painel-nfe`.
3. O Render vai detectar o `render.yaml` e pedir o valor de **DATABASE_URL**
   — cole ali a "connection string" que você copiou do Neon no passo 1.
4. Clique em **Apply** / **Create**.
5. Aguarde o deploy (alguns minutos). Quando o status ficar **"Live"**, copie
   o link do topo da página, algo como `https://painel-nfe-xxxx.onrender.com`.

### 4. Testar e trocar as senhas

1. Abra o link gerado.
2. Entre com `matriz123`, troque a senha pelo botão **Alterar senha**.
3. Entre com `cliente123`, troque também.
4. Envie o link para os seus clientes.

### Sobre essa configuração gratuita

- O Neon free tier é permanente, sem cartão de crédito, e tem espaço de sobra
  para a quantidade de alunos que você vai cadastrar.
- O Render free "dorme" o site depois de uns minutos sem uso — a primeira
  pessoa a acessar depois disso espera ~30 segundos o site "acordar". Os
  dados continuam seguros nesse meio tempo (eles estão no Neon, não no
  Render).
- Quando tiver mais clientes e quiser que o site nunca durma, é só trocar o
  plano do Render de `free` para `starter` no arquivo `render.yaml` (custo
  aproximado de US$7/mês) — o banco de dados (Neon) não muda.

Se preferir, posso te guiar em tempo real enquanto você faz esses passos —
é só ir me avisando em qual etapa você está.

## Sobre os dados importados da sua planilha

24 dos 30 alunos foram importados automaticamente. 6 ficaram de fora porque os
dados estavam incompletos ou inválidos — exatamente o tipo de erro que o
cadastro novo já bloqueia automaticamente. Veja, corrija com o aluno e cadastre
manualmente pelo painel:

| Aluno | Problema |
|---|---|
| Antunilde Saraiva Matos | CPF (056.801.011-34) não passa na validação de dígito verificador — confirme o número correto. |
| Ana Claudia Teixeira Vieira | Forma de pagamento estava em branco na planilha. |
| Ane Karoline Cardoso | CPF não informado na planilha. |
| Elzimar Alves Ximenes Bezerra | CPF não informado na planilha. |
| Fernanda Bezerra | CPF não informado na planilha. |
| Samara Almeida Ferreira Santos | CPF não informado na planilha. |

A idade de todos os alunos importados foi definida como **30** por padrão (a
planilha não tinha essa coluna) — edite cada um pelo painel para corrigir.

## Estrutura do projeto

```
painel-nfe/
├── server.js        → API (login, alunos, dashboard)
├── db.js             → leitura/escrita do banco (arquivo data/db.json)
├── validacao.js       → validações (CPF, nome, idade, enums)
├── seed.js             → importa dados iniciais (já usado uma vez)
├── package.json
└── public/
    ├── index.html      → tela de login + painel
    ├── styles.css
    └── app.js          → toda a lógica do front-end
```

## Limitações para você ter consciência

- A senha do "cliente" tem o mesmo nível de visão que a "matriz" hoje (você
  pediu assim). Se um dia quiser restringir o que o cliente vê, é uma mudança
  pequena no código.
- Hoje só existe 1 conjunto de dados (1 cliente seu/1 academia). Se no futuro
  você quiser usar esse mesmo painel para vários clientes diferentes (cada um
  com sua própria lista de alunos), isso exige uma adaptação maior
  (multi-empresa) — me avise se for o caso.
- Não há envio de e-mail/recuperação de senha automática. Se esquecer as duas
  senhas, me chame ou eu te ensino a redefinir direto no arquivo `data/db.json`.
