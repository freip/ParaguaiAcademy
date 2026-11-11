# Paraguai Academy — área do aluno

Plataforma do curso de importação do Paraguai: área do aluno com 8 etapas,
ferramentas (calculadora, fornecedores, freteiros, envio), página pública de
vendas e painel de admin. HTML + JavaScript em módulos ES (sem build) +
Supabase (login, dados, RLS) + funções serverless no Vercel.

## Estrutura

```
index.html            Área do aluno (SPA, módulos ES) + página pública
admin.html            Painel do admin
app/                  Código da área do aluno
  main.js             Roteador e orquestração
  auth.js             Login (número + senha) e contexto do aluno
  config.js           Constantes (URL/chave pública do Supabase, etc.)
  content/trilha.js   Conteúdo das 8 etapas (texto editável)
  components/          VideoSlot, MensagemPronta, Checklist
  tools/              Fornecedores, Freteiros, Envio, Calculadora
  pages/              inicio, trilha, etapa, publica, suporte, certificado...
  lib/                supabase, dados, calculadora, cotacao, format, icons, dom
  styles/             tokens.css, app.css, componentes.css
admin/                Painel do admin (sb.js, app.js, admin.css)
api/                  Funções serverless (Vercel)
  cotacao.js          Cotação USD-BRL (cache 1h)
  admin/              criar-aluno, resetar-senha (usam a service role)
supabase/             Migrações SQL (APLICAR-TUDO.sql = tudo junto)
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

1. No Supabase: SQL Editor → cole e rode `supabase/APLICAR-TUDO.sql`.
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
Seções: Alunos (criar conta, liberar/revogar nicho, resetar senha), Vídeos
(colar URL), Fornecedores, Freteiros, Nota fiscal, Lojas, Produtos (importar
CSV), Canais de venda e Configurações.
```
CSV de produtos — colunas: loja, nome, marca, sku, nicho, preco_usd, imagem_url, url, em_estoque
```
