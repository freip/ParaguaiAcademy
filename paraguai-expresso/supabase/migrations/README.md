# Banco de dados — Paraguai Academy (Fase 2)

Estrutura do banco no Supabase: tabelas, regras de acesso (RLS), funções de
progresso e o conteúdo inicial. Substitui o antigo `schema.sql` (tabela `lessons`),
que deixa de ser usado — os vídeos agora ficam na tabela `videos`.

## Como aplicar

No Supabase do projeto: **SQL Editor > New query**, cole e rode **em ordem**:

1. `0001_schema.sql` — cria as tabelas e os índices.
2. `0002_functions.sql` — funções de progresso e gatilhos.
3. `0003_rls.sql` — regras de acesso (quem lê/escreve o quê).
4. `0004_seed.sql` — conteúdo inicial (nichos, 8 etapas, 18 vídeos sem URL, freteira Evelin, canais, exemplos, configurações).

Pode rodar de novo quando quiser: os arquivos são idempotentes e **não apagam**
o que o admin já cadastrou.

## Login de aluno (número + senha)

No painel do Supabase, em **Authentication > Providers**, ative o provedor
**Phone**. Não é preciso configurar envio de SMS: as contas são criadas pelo
admin com a senha já confirmada (feito por uma função no servidor, na Fase 10),
e o aluno entra com número + senha. No primeiro acesso ele troca a senha
(controlado pela coluna `perfis.deve_trocar_senha`).

## Criar o admin

1. **Authentication > Users > Add user**: crie o usuário admin (e-mail + senha).
2. Rode no SQL Editor (troque o e-mail se preciso):

```sql
update public.perfis set papel = 'admin'
where id = (select id from auth.users where lower(email) = 'assessoriacedroo@gmail.com');
```

## O que foi criado

- **Tabelas:** nichos, perfis, acessos, progresso_etapas, etapa_checklist,
  videos, videos_assistidos, fornecedores, freteiros, regras_freteiro,
  regras_nota, lojas, produtos, canais_venda, simulacoes, configuracoes, cotacoes.
- **Funções que o aluno chama (RPC):** `inicializar_meu_progresso`,
  `marcar_checklist`, `concluir_etapa`, `definir_caminho`,
  `escolher_nicho_principal`, `atualizar_meu_perfil`, `concluir_troca_senha`.
- **Bloqueio no servidor:** `concluir_etapa` só avança se a etapa for a atual e
  todos os itens obrigatórios do checklist estiverem marcados. O aluno não
  escreve direto em `perfis` nem em `progresso_etapas`.
