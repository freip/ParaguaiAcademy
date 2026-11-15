-- =====================================================================
-- Paraguai Academy — 0010_contatos_e_promo.sql
-- Contatos reais (suporte e mentoria) e o preço "de / por" da promoção.
-- Diferente das outras migrações, esta SOBRESCREVE valores: é configuração,
-- não estrutura. Se você já editou alguma chave no painel, confira depois.
-- Rode no SQL Editor do Supabase.
-- =====================================================================

-- Formato das chaves de WhatsApp: só números, com país e DDD.
update public.configuracoes set valor = '5515992451745'
  where chave in ('whatsapp_suporte', 'whatsapp_upgrade');

update public.configuracoes set valor = '5515992715185'
  where chave in ('mentoria_pro_whatsapp', 'mentoria_whatsapp');

-- Preço cheio, para ancorar a promoção (riscado na página de vendas).
insert into public.configuracoes (chave, valor, descricao) values
  ('plano_standard_de', '140', 'Plano Standard: preço cheio riscado na página de vendas'),
  ('promo_ativa',       '1',   'Promoção ligada na página de vendas (1 = sim, 0 = não)'),
  ('promo_chamada',     'Turma de lançamento', 'Texto do selo da promoção')
on conflict (chave) do nothing;

-- O preço do Standard continua 49,90 (plano_standard_valor). O checkout
-- entra depois, em url_checkout / url_checkout_pro.

-- Confirme como ficou:
--   select chave, valor from public.configuracoes order by chave;
