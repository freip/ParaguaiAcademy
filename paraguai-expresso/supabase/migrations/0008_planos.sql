-- =====================================================================
-- Paraguai Academy — 0008_planos.sql
-- Duas mudanças grandes:
--  1) Nicho único "Geral" (sem filtro de nicho em nenhuma tela).
--  2) Dois níveis de aluno: Standard e Pro.
--     Standard: trilha, ferramentas e os fornecedores abertos.
--     Pro: todos os fornecedores + compras coletivas + mentoria exclusiva.
-- O cadeado da tela é só o aviso; quem protege de verdade é a RLS daqui.
-- Rode no SQL Editor do Supabase.
--
-- ATENÇÃO: este arquivo refaz a política de leitura de `configuracoes` e de
-- `fornecedores`. Se algum dia você rodar 0003_rls.sql de novo, rode 0008
-- depois dele.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Nicho único "Geral"
-- ---------------------------------------------------------------------
insert into public.nichos (slug, nome, peso_padrao_g, ordem)
  values ('geral', 'Geral', 500, 0)
on conflict (slug) do update set nome = 'Geral', ativo = true, ordem = 0;

-- Os nichos antigos saem das listas (ficam na tabela por causa das chaves
-- estrangeiras já gravadas em produtos, acessos e regras de freteiro).
update public.nichos set ativo = false where slug <> 'geral';

-- Todo aluno que já tinha algum nicho passa a ter o "geral".
insert into public.acessos (usuario_id, nicho)
  select distinct usuario_id, 'geral' from public.acessos
on conflict (usuario_id, nicho) do nothing;

update public.perfis set nicho_principal = 'geral'
  where id in (select usuario_id from public.acessos where nicho = 'geral');

-- Fornecedor sem "geral" na lista continuaria invisível em qualquer filtro
-- antigo; acrescenta o slug em todos.
update public.fornecedores
  set nichos = array_append(coalesce(nichos, '{}'), 'geral')
  where not ('geral' = any (coalesce(nichos, '{}')));

-- O checklist da etapa 1 não pede mais para escolher nicho.
update public.etapa_checklist
  set label = 'Escolhi o primeiro produto que vou trazer'
  where etapa = 1 and item_id = 'escolhi_nicho';

-- ---------------------------------------------------------------------
-- 2) Plano do aluno
-- ---------------------------------------------------------------------
alter table public.perfis add column if not exists plano text not null default 'standard';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'perfis_plano_check') then
    alter table public.perfis add constraint perfis_plano_check
      check (plano in ('standard', 'pro'));
  end if;
end $$;

-- Fornecedor premium: só o Pro vê o contato.
alter table public.fornecedores add column if not exists premium boolean not null default false;

-- É Pro? (o admin conta como Pro para conseguir conferir as telas.)
create or replace function public.sou_pro()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and (plano = 'pro' or papel = 'admin')
  );
$$;
grant execute on function public.sou_pro() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Fornecedores: lista aberta, contato só para quem pode
-- ---------------------------------------------------------------------
-- A tabela base passa a esconder as linhas premium do aluno Standard. Sem o
-- nicho no meio: a lista é a mesma para todos.
drop policy if exists "aluno le fornecedores" on public.fornecedores;
create policy "aluno le fornecedores" on public.fornecedores
  for select to authenticated using (ativo and (not premium or public.sou_pro()));

-- A vitrine mostra TODOS os fornecedores ativos, mas com o contato apagado
-- quando a linha é premium e o aluno não é Pro. A view roda com os direitos
-- do dono (sem security_invoker), então ela não cai na política acima — é
-- justamente aqui que a máscara é aplicada.
--
-- NOTA: o 0009 refaz esta view fechando o acesso de quem não tem login.
-- Se você está rodando os arquivos em ordem, rode o 0009 logo depois.
drop view if exists public.fornecedores_lista;
create view public.fornecedores_lista as
  select
    f.id, f.nome, f.pais, f.cidade, f.nichos, f.descricao,
    f.minimo_valor, f.minimo_moeda, f.verificado, f.destaque,
    f.loja_dos_socios, f.premium, f.atualizado_em,
    (f.premium and not public.sou_pro())             as bloqueado,
    case when f.premium and not public.sou_pro() then null else f.contato_nome end as contato_nome,
    case when f.premium and not public.sou_pro() then null else f.whatsapp     end as whatsapp,
    case when f.premium and not public.sou_pro() then null else f.pagamento    end as pagamento,
    case when f.premium and not public.sou_pro() then null else f.prazo        end as prazo
  from public.fornecedores f
  where f.ativo;

alter view public.fornecedores_lista set (security_invoker = false);
grant select on public.fornecedores_lista to authenticated;

-- ---------------------------------------------------------------------
-- 4) Configurações só do Pro (link do grupo, contato da mentoria...)
-- ---------------------------------------------------------------------
alter table public.configuracoes add column if not exists so_pro boolean not null default false;

-- Quem não é Pro não recebe nem o valor dessas chaves.
drop policy if exists "todos leem" on public.configuracoes;
create policy "todos leem" on public.configuracoes
  for select to anon, authenticated using (not so_pro or public.sou_pro());

insert into public.configuracoes (chave, valor, descricao) values
  ('plano_standard_valor', '49.90', 'Plano Standard: pagamento único, em reais'),
  ('plano_pro_valor',      '500',   'Plano Pro: valor de entrada, em reais'),
  ('plano_pro_recorrencia','49',    'Plano Pro: mensalidade trimestral, em reais'),
  ('url_checkout',         '',      'Link de pagamento do plano Standard'),
  ('url_checkout_pro',     '',      'Link de pagamento do plano Pro'),
  ('whatsapp_upgrade',     '',      'WhatsApp para tirar dúvidas e migrar de plano')
on conflict (chave) do nothing;

insert into public.configuracoes (chave, valor, descricao, so_pro) values
  ('grupo_compras_coletivas', '', 'PRO: link do grupo de compras coletivas', true),
  ('mentoria_pro_whatsapp',   '', 'PRO: WhatsApp da mentoria exclusiva', true),
  ('mentoria_pro_agenda',     '', 'PRO: link da agenda das chamadas de mentoria', true)
on conflict (chave) do update set so_pro = true;

-- =====================================================================
-- Para colocar um aluno no Pro (ou tirar), use o painel do admin em
-- Alunos → Plano. No SQL seria:
--   update public.perfis set plano = 'pro' where id = 'UUID-DO-ALUNO';
-- Para marcar um fornecedor como premium: Admin → Fornecedores → Premium.
-- =====================================================================
