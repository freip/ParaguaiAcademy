-- =====================================================================
-- Paraguai Academy — 0009_fecha_vitrine.sql
-- Correção de segurança da view criada em 0008.
--
-- O problema: o Supabase concede privilégio por padrão (ALTER DEFAULT
-- PRIVILEGES) a toda tabela/view nova no schema `public`, inclusive para o
-- papel `anon`. Como view não tem RLS própria — e esta roda com os direitos
-- do dono, de propósito, para poder mascarar o contato — o grant era a única
-- tranca, e ela estava aberta: qualquer pessoa sem login conseguia listar os
-- fornecedores pela API.
--
-- A correção tem duas camadas:
--   1) tira o privilégio de `anon` e de `public`;
--   2) a própria view só devolve linha se quem pergunta for aluno com acesso
--      liberado (ou admin) — então nem um grant acidental no futuro vaza.
-- Rode no SQL Editor do Supabase.
-- =====================================================================

-- Quem pergunta é aluno pagante (tem acesso liberado) ou admin?
create or replace function public.tem_acesso_aluno()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.acessos where usuario_id = auth.uid())
      or exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin');
$$;
grant execute on function public.tem_acesso_aluno() to anon, authenticated;

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
  where f.ativo
    and public.tem_acesso_aluno();   -- sem login/sem acesso, a lista vem vazia

-- A máscara do contato só funciona se a view ignorar a RLS da tabela base.
alter view public.fornecedores_lista set (security_invoker = false);

-- Só aluno logado. O `public` entra aqui porque é dele que `anon` herda.
revoke all on public.fornecedores_lista from anon;
revoke all on public.fornecedores_lista from public;
grant select on public.fornecedores_lista to authenticated;

-- =====================================================================
-- Toda view nova no schema public nasce com privilégio para `anon`. Se você
-- criar outra, repita o par:
--   revoke all on public.<view> from anon, public;
--   grant select on public.<view> to authenticated;
-- =====================================================================
