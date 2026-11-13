# Paraguai Academy — área do aluno

Plataforma do curso de importação do Paraguai: área do aluno com 8 etapas,
ferramentas (calculadora, fornecedores, freteiros, envio), página pública de
vendas e painel de admin. HTML + JavaScript em módulos ES (sem build) +
Supabase (login, dados, RLS) + funções serverless no Vercel.

## Planos do aluno

| | Standard | Pro |
|---|---|---|
| Preço | R$ 49,90 (pagamento único) | R$ 500 de entrada + R$ 49/trimestre |
| Trilha, calculadora, freteiros, envio | sim | sim |
| Fornecedores | só os abertos | todos, inclusive os premium |
| Compras coletivas, mentoria com chamadas, acompanhamento | — | sim |

O plano fica em `perfis.plano` e o admin troca em **Alunos → Virar Pro**. O que
é do Pro aparece com cadeado para o Standard e leva a `#/app/plano`. Os valores
ficam em **Configurações** (`plano_standard_valor`, `plano_pro_valor`,
`plano_pro_recorrencia`, `url_checkout`, `url_checkout_pro`).

Quem protege de verdade é a RLS: a view `fornecedores_lista` apaga o contato das
lojas premium e as chaves marcadas `so_pro` em `configuracoes` (link do grupo de
compras coletivas, contato da mentoria) nem são enviadas ao Standard.

Nicho: existe só o **Geral**. Nenhuma tela filtra por nicho.

## Estrutura

```
index.html            Área do aluno (SPA, módulos ES) + página pública
admin.html            Painel do admin
app/                  Código da área do aluno
  main.js             Roteador e orquestração
  auth.js             Login (número + senha), contexto e plano do aluno
  config.js           Constantes (Supabase, planos, rotas)
  content/trilha.js   Conteúdo das 8 etapas (texto editável)
  components/         VideoSlot, MensagemPronta, Checklist, Upgrade
  tools/              Fornecedores, Freteiros, Envio, Calculadora
  pages/              inicio, trilha, etapa, plano, comprasColetivas,
                      mentoria, publica, suporte, certificado...
  lib/                supabase, dados, calculadora, cotacao, format, icons, dom
  styles/             tokens.css, app.css, componentes.css
admin/                Painel do admin (sb.js, app.js, admin.css)
api/                  Funções serverless (Vercel)
  cotacao.js          Cotação USD-BRL (cache 1h)
  admin/              criar-aluno, resetar-senha (usam a service role)
supabase/             Migrações SQL (rode 0001..0008 em ordem)
test/                 Testes da calculadora (node --test)
scripts/              criar-aluno.mjs (atalho de terminal; o admin faz isso pela tela)
```

## Rodar localmente

Precisa de um servidor estático (não abra por file://):

```
cd paraguai-expresso
python -m http.server 5500
```

Abra http://localhost:5500 . As funções em `api/` NÃO rodam no servidor
estático local (cotação cai no fallback público; criar/resetar aluno só
funcionam publicado no Vercel). Testes: `npm test` (ou `node --test test/calculadora.test.js`).

## Banco de dados (Supabase)

1. No Supabase: SQL Editor → cole e rode `supabase/APLICAR-TUDO.sql`
   (junta as migrações 0001–0009 na ordem; em banco que já existe, rode só os
   arquivos que faltam, de `supabase/migrations/`).
2. Authentication → Providers → ative **Phone** (não precisa de SMS).
3. Crie o usuário admin (Authentication → Users, por e-mail) e promova:
   `update public.perfis set papel='admin' where id=(select id from auth.users where lower(email)='SEU_EMAIL');`

## Publicar no Vercel

- Raiz do projeto: `paraguai-expresso/`.
- Variável de ambiente (Settings → Environment Variables):
  `SUPABASE_SERVICE_ROLE_KEY` = a service role (secret) do projeto Supabase.
  É usada só pelas funções em `api/admin/` (criar/resetar aluno). Nunca vai
  para o navegador.
- A chave pública (publishable) fica em `app/config.js` e `admin/sb.js` — é
  pública por design; a RLS do banco é quem protege os dados.

## Admin

Acesse `/admin`, entre com o e-mail/senha de uma conta com `papel='admin'`.
Seções: Alunos (criar conta, mudar o plano, liberar/revogar acesso, resetar
senha), Vídeos (colar URL), Fornecedores (marcar **Premium** = só Pro),
Freteiros, Nota fiscal, Lojas, Produtos (importar CSV) e Configurações.
```
CSV de produtos — colunas: loja, nome, marca, sku, nicho, preco_usd, imagem_url, url, em_estoque
```
