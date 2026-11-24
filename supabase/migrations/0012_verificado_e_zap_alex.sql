-- =====================================================================
-- Paraguai Academy — 0012_verificado_e_zap_alex.sql
-- Dois ajustes nos fornecedores, decididos depois do 0011:
--   1) O nono dígito no WhatsApp do Alex Iphone Swap.
--   2) O selo "Verificado" ligado em todas as lojas ativas.
--
-- Por que um arquivo novo em vez de editar o 0011: o insert de lá tem guarda
-- `where not exists`, então rodar o 0011 de novo NÃO corrige linha que já
-- existe. Este arquivo usa `update` e funciona nos dois casos — banco que já
-- rodou o 0011 e banco novo (onde ele só confirma o que o 0011 já gravou).
-- Rode no SQL Editor do Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) WhatsApp do Alex Iphone Swap
-- ---------------------------------------------------------------------
-- Veio como +55 45 9861-9254 (8 dígitos depois do DDD); celular no Brasil tem
-- 9 e começa com 9. Fica (45) 99861-9254 → 5545998619254.
-- Ainda vale mandar uma mensagem para confirmar que é o número certo antes de
-- o primeiro aluno mandar.
update public.fornecedores
   set whatsapp = '5545998619254'
 where nome = 'Alex Iphone Swap'
   and whatsapp <> '5545998619254';

-- ---------------------------------------------------------------------
-- 2) Selo "Verificado" em todas as lojas ativas
-- ---------------------------------------------------------------------
-- Alinha o que o aluno vê com o que a página de vendas promete ("as lojas já
-- verificadas"). Só as ativas: os cadastros [EXEMPLO] que o 0011 desativou não
-- levam selo, senão voltariam com ele se alguém os reativasse.
update public.fornecedores
   set verificado = true
 where ativo
   and not verificado;

-- Confira como ficou (espera-se 0 linhas sem selo):
--   select nome, verificado, whatsapp from public.fornecedores
--    where ativo and not verificado;
--
--   select nome, whatsapp from public.fornecedores
--    where nome = 'Alex Iphone Swap';
