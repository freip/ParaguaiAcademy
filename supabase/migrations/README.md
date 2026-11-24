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
5. `0005_sync.sql` — colunas e tabela de apoio do robô da Mega.
6. `0006_abrir.sql` — tira os bloqueios: nada é obrigatório, só progresso.
7. `0007_produtos_abertos.sql` — a calculadora mostra todos os produtos.
8. `0008_planos.sql` — nicho único **Geral** e os dois planos (**Standard** e **Pro**).
9. `0009_fecha_vitrine.sql` — fecha a vitrine de fornecedores para quem não tem login.
10. `0010_contatos_e_promo.sql` — WhatsApp do suporte e da mentoria, preço cheio da promoção.
11. `0011_fornecedores_reais.sql` — a lista real de fornecedores (29 lojas) e os cadastros `[EXEMPLO]` desativados.
12. `0012_verificado_e_zap_alex.sql` — selo **Verificado** em todas as lojas ativas e o nono dígito no WhatsApp do Alex.

> `APLICAR-TUDO.sql` junta os 12 arquivos na ordem certa — é o atalho para um
> banco novo. Em banco que já existe, rode só os que faltam.

> O 0012 existe porque o insert do 0011 tem guarda `where not exists`: rodar o
> 0011 de novo não corrige linha que já está no banco. Correção de dado que já
> entrou vem sempre em arquivo novo, com `update`.

Pode rodar de novo quando quiser: os arquivos são idempotentes e **não apagam**
o que o admin já cadastrou. Rode sempre **em ordem**: 0006 solta bloqueios que
0002 cria, e 0008/0009 refazem políticas que 0003 cria.

## Cuidado com view nova no schema `public`

O Supabase tem `ALTER DEFAULT PRIVILEGES` no schema `public`: toda tabela ou
view nova nasce com `select` liberado para o papel `anon` (quem não fez login).
Em tabela isso não é problema, porque a RLS filtra depois. **Em view é**, porque
view não tem RLS própria — e as nossas rodam com os direitos do dono, de
propósito, para poder mascarar campo. Então, ao criar uma view:

```sql
revoke all on public.<view> from anon, public;
grant select on public.<view> to authenticated;
```

Foi exatamente esse o furo que o `0009` corrigiu na `fornecedores_lista`.

## Planos (a partir de 0008)

- `perfis.plano` = `standard` | `pro` (o admin troca em **Alunos → Virar Pro**).
- `fornecedores.premium` = loja só do Pro. A view `fornecedores_lista` mostra a
  loja na vitrine mas **apaga o contato** de quem não é Pro, e marca
  `bloqueado = true` — o cadeado da tela é só o aviso, o bloqueio é no banco.
- `configuracoes.so_pro` = chave que só o Pro lê (link do grupo de compras
  coletivas, WhatsApp e agenda da mentoria).
- `public.sou_pro()` responde se o usuário da requisição é Pro (admin conta
  como Pro, para conseguir conferir as telas).
- Nicho: existe só o `geral`; os antigos ficam na tabela com `ativo = false`
  por causa das chaves estrangeiras já gravadas.

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
