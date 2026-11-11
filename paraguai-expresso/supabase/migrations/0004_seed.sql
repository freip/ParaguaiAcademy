-- =====================================================================
-- Paraguai Academy — Fase 2 (banco)  |  0004_seed.sql
-- Conteúdo inicial. Idempotente: pode rodar de novo sem duplicar nem
-- apagar o que o admin já cadastrou (usa ON CONFLICT DO NOTHING).
-- =====================================================================

-- ---------- Nichos (lista fixa, sem medicamentos) ----------
insert into public.nichos (slug, nome, peso_padrao_g, ordem) values
  ('perfumes',    'Perfumes',                 500, 1),
  ('apple',       'Apple (iPhone)',           300, 2),
  ('celulares',   'Celulares (Android/Xiaomi)',300, 3),
  ('eletronicos', 'Eletrônicos',              500, 4)
on conflict (slug) do nothing;

-- ---------- Checklist obrigatório por etapa ----------
insert into public.etapa_checklist (etapa, item_id, label, obrigatorio, automatico, ordem) values
  (1,'assisti_aulas','Assisti às aulas desta etapa',true,false,1),
  (1,'escolhi_nicho','Escolhi meu nicho',true,false,2),
  (1,'sinais_golpe','Sei reconhecer os 5 sinais de golpe',true,false,3),
  (2,'assisti_aulas','Assisti às aulas',true,false,1),
  (2,'escolhi_caminho','Escolhi meu caminho (Paraguai ou Brasil)',true,false,2),
  (2,'escolhi_fornecedor','Escolhi pelo menos um fornecedor para chamar',true,false,3),
  (3,'assisti_aulas','Assisti às aulas',true,false,1),
  (3,'salvou_simulacao','Fiz e salvei pelo menos uma simulação',true,true,2),
  (4,'assisti_aulas','Assisti às aulas',true,false,1),
  (4,'leu_checklist_pagar','Li o checklist "Antes de pagar"',true,false,2),
  (5,'assisti_aulas','Assisti às aulas',true,false,1),
  (5,'escolhi_freteiro','Escolhi meu freteiro',true,false,2),
  (5,'sei_enviar_freteiro','Sei o que enviar ao freteiro',true,false,3),
  (6,'assisti_aulas','Assisti à aula',true,false,1),
  (6,'sei_custo_nota','Sei quanto custa e como pedir a nota',true,false,2),
  (7,'assisti_aulas','Assisti às aulas',true,false,1),
  (7,'sei_preencher_etiqueta','Sei preencher a etiqueta',true,false,2),
  (7,'sei_conferir','Sei conferir a mercadoria ao receber',true,false,3),
  (8,'assisti_aulas','Assisti às aulas',true,false,1),
  (8,'defini_preco','Defini o preço de venda do meu primeiro lote',true,false,2)
on conflict (etapa, item_id) do nothing;

-- ---------- Vídeos (todos sem URL; roteiro serve de guia na gravação) ----------
insert into public.videos (id, etapa, ordem, titulo, duracao, roteiro) values
  ('V0',   0, 0, 'Vídeo de vendas', null,
    '["Vídeo de vendas da página pública (/aula-gratis)"]'::jsonb),
  ('V0.1', 0, 1, 'Boas-vindas', null,
    '["Vídeo de boas-vindas no Início, exibido até concluir a etapa 1"]'::jsonb),
  ('V1.1', 1, 1, 'Como funciona a Paraguai Academy', '2 min',
    '["Quem é o Mauro","Caminho completo: escolher fornecedor, fazer as contas, pedir e pagar, travessia, nota, envio, vender","Como usar a plataforma: etapas liberam em ordem; ferramentas no menu"]'::jsonb),
  ('V1.2', 1, 2, 'Golpes mais comuns', '2 min 30 s',
    '["Loja falsa de atacado em Ciudad del Este","Site de rastreio falso cobrando taxa de liberação","Preço bom demais","Pagamento para conta de pessoa diferente da loja","Pressão para pagar rápido","Regra: só comprar de quem está na lista ou validar com o suporte"]'::jsonb),
  ('V1.3', 1, 3, 'Cota de compras x revenda', '2 min',
    '["Diferença entre comprar para uso próprio e para revender","Por que formalizar ajuda (CNPJ, nota)","O que a plataforma ensina e o que não ensina"]'::jsonb),
  ('V2.1', 2, 1, 'Paraguai ou Brasil: qual escolher', '2 min',
    '["Paraguai: preço menor, pedido mínimo, travessia, prazo maior","Brasil: chega mais rápido, sem travessia, mínimo em reais, custo um pouco maior","Quando vale cada um"]'::jsonb),
  ('V2.2', 2, 2, 'Como abordar um fornecedor', '2 min',
    '["Primeira mensagem","O que perguntar: lista de preços, mínimo, formas de pagamento, prazo","Como identificar fornecedor sério"]'::jsonb),
  ('V3.1', 3, 1, 'O que entra no custo de importar', '2 min',
    '["Produto em dólar x cotação","Freteiro: percentual no perfume, valor fixo por aparelho no celular","Transporte até a transportadora","Nota fiscal","Frete até sua casa","Embalagem","Taxa do canal de venda"]'::jsonb),
  ('V3.2', 3, 2, 'Como usar a calculadora', '2 min',
    '["Buscar produto","Ajustar quantidade","Conferir os custos já preenchidos","Escolher a margem","Salvar e compartilhar"]'::jsonb),
  ('V4.1', 4, 1, 'Como fazer o pedido', '2 min',
    '["Pedir a lista e a cotação do dólar do dia","Pedido mínimo (por volta de US$ 200 no Paraguai)","Enviar seus dados para cadastro na loja","Pedir o envio para a transportadora"]'::jsonb),
  ('V4.2', 4, 2, 'Como pagar com segurança', '2 min',
    '["Formas de pagamento aceitas","Conferir se a conta é da loja","Guardar comprovante e recibo","Nunca pagar taxa de liberação"]'::jsonb),
  ('V5.1', 5, 1, 'Como funciona a travessia', '2 min 30 s',
    '["Loja envia para a transportadora (Paraná Express, Pedro Juan Caballero)","Você recebe o recibo e repassa ao freteiro","O freteiro atravessa e prepara o envio","Prazos médios"]'::jsonb),
  ('V5.2', 5, 2, 'Como combinar com o freteiro', '1 min 30 s',
    '["O que informar: produtos, quantidade, valor, recibo","Como é cobrado","O que confirmar antes"]'::jsonb),
  ('V6.1', 6, 1, 'Como pedir a nota fiscal', '2 min',
    '["Por que pedir antes da etiqueta","Como é cobrada","Documentos necessários","Como solicitar"]'::jsonb),
  ('V7.1', 7, 1, 'Como gerar a etiqueta na SuperFrete', '2 min 30 s',
    '["Criar conta","Preencher remetente e destinatário","Medidas e peso","Comparar modalidades","Pagar e baixar a etiqueta"]'::jsonb),
  ('V7.2', 7, 2, 'Conferência ao receber', '1 min 30 s',
    '["Filmar a abertura da caixa","Conferir quantidade e lacres","O que fazer se faltar algo"]'::jsonb),
  ('V8.1', 8, 1, 'Como definir o preço de venda', '2 min',
    '["Custo por unidade","Margem","Taxa de marketplace","Preço mínimo","Usar a calculadora no modo preço de venda"]'::jsonb),
  ('V8.2', 8, 2, 'Catálogo e atendimento', '2 min 30 s',
    '["Montar catálogo no WhatsApp","Fotos","Respostas rápidas","Pós-venda","Pedir avaliação"]'::jsonb)
on conflict (id) do nothing;

-- ---------- Regra da nota fiscal ----------
insert into public.regras_nota (id, ate_valor, valor_fixo, percentual_acima)
  values (1, 1650, 100, 7)
on conflict (id) do nothing;

-- ---------- Freteira Evelin + regras (sem medicamentos) ----------
insert into public.freteiros (nome, cidade, prazo, observacoes)
  select 'Evelin', 'Pedro Juan Caballero, Paraguai', 'Combinar no contato',
         'Consulte a tabela diretamente com a freteira antes de comprar.'
  where not exists (select 1 from public.freteiros where nome = 'Evelin');

insert into public.regras_freteiro (freteiro_id, nicho, faixa, tipo, valor, base, compra_minima_brl, ordem)
  select f.id, v.nicho, v.faixa, v.tipo, v.valor, v.base, v.compra_minima_brl, v.ordem
  from public.freteiros f
  join (values
    ('perfumes',   'Perfumes e cosméticos',   'percentual',   18,   'nota', 1500, 1),
    ('celulares',  'Xiaomi até R$ 3.000,00',  'fixo_unidade', 150,  null,   null, 1),
    ('apple',      'iPhone até o modelo 16',  'fixo_unidade', 180,  null,   null, 1),
    ('apple',      'iPhone 17 ou mais novo',  'fixo_unidade', 230,  null,   null, 2),
    ('eletronicos','Outros eletrônicos',      'consulta',     null, null,   null, 1)
  ) as v(nicho, faixa, tipo, valor, base, compra_minima_brl, ordem) on true
  where f.nome = 'Evelin'
    and not exists (
      select 1 from public.regras_freteiro r
      where r.freteiro_id = f.id and r.nicho = v.nicho and coalesce(r.faixa,'') = coalesce(v.faixa,'')
    );

-- ---------- Canais de venda (taxas são placeholder, edite no admin) ----------
insert into public.canais_venda (nome, taxa_percentual)
  select v.nome, v.taxa from (values
    ('Venda direta (WhatsApp/Instagram)', 0),
    ('Mercado Livre', 12),
    ('Shopee', 14)
  ) as v(nome, taxa)
  where not exists (select 1 from public.canais_venda c where c.nome = v.nome);

-- ---------- Loja parceira e fornecedores ----------
-- Rota Árabe: loja dos sócios (transparência obrigatória com o aluno).
insert into public.fornecedores (nome, pais, cidade, nichos, descricao, verificado, destaque, loja_dos_socios, ativo)
  select 'Rota Árabe', 'BR', 'Brasil', '{perfumes}',
         'Perfumaria árabe original, com atacado para alunos.', true, true, true, true
  where not exists (select 1 from public.fornecedores where nome = 'Rota Árabe');

-- Exemplos para testar as telas (marcados como [EXEMPLO]).
insert into public.fornecedores (nome, pais, cidade, nichos, descricao, minimo_valor, minimo_moeda, verificado, ativo)
  select 'Fornecedor Exemplo Paraguai [EXEMPLO]', 'PY', 'Ciudad del Este', '{perfumes}',
         'Cadastro de exemplo para testar a lista.', 200, 'USD', true, true
  where not exists (select 1 from public.fornecedores where nome = 'Fornecedor Exemplo Paraguai [EXEMPLO]');
insert into public.fornecedores (nome, pais, cidade, nichos, descricao, minimo_valor, minimo_moeda, verificado, ativo)
  select 'Fornecedor Exemplo Brasil [EXEMPLO]', 'BR', 'São Paulo', '{eletronicos}',
         'Cadastro de exemplo para testar a lista.', 500, 'BRL', false, true
  where not exists (select 1 from public.fornecedores where nome = 'Fornecedor Exemplo Brasil [EXEMPLO]');

-- Loja + produtos de exemplo para a calculadora.
insert into public.lojas (nome, cidade, minimo_usd)
  select 'Loja Exemplo Perfumes [EXEMPLO]', 'Ciudad del Este', 200
  where not exists (select 1 from public.lojas where nome = 'Loja Exemplo Perfumes [EXEMPLO]');

insert into public.produtos (loja_id, nome, marca, sku, nicho, preco_usd, em_estoque, fonte)
  select l.id, v.nome, v.marca, v.sku, v.nicho, v.preco, true, 'seed'
  from public.lojas l
  join (values
    ('Perfume Exemplo 100ml [EXEMPLO]', 'Exemplo', 'EXP-001', 'perfumes', 25),
    ('Perfume Exemplo 50ml [EXEMPLO]',  'Exemplo', 'EXP-002', 'perfumes', 18),
    ('Celular Exemplo [EXEMPLO]',       'Exemplo', 'EXP-010', 'celulares', 180)
  ) as v(nome, marca, sku, nicho, preco) on true
  where l.nome = 'Loja Exemplo Perfumes [EXEMPLO]'
    and not exists (select 1 from public.produtos p where p.sku = v.sku);

-- ---------- Configurações globais (links e textos) ----------
insert into public.configuracoes (chave, valor, descricao) values
  ('whatsapp_suporte',   '',  'WhatsApp do suporte, só números com país e DDD (ex.: 5599999999999)'),
  ('url_superfrete',     'https://www.superfrete.com', 'Link da SuperFrete (pode ser link de indicação)'),
  ('url_rota_arabe',     'https://www.rotaarabe.com.br/', 'Link da loja parceira Rota Árabe'),
  ('rota_arabe_cupom',   'ACADEMY', 'Cupom de atacado na Rota Árabe'),
  ('mentoria_titulo',    'Mentoria individual com o Mauro', 'Título do card de mentoria'),
  ('mentoria_valor',     '300', 'Valor da mentoria em reais'),
  ('mentoria_whatsapp',  '', 'WhatsApp para contratar a mentoria'),
  ('modelo_catalogo_url','', 'Link para baixar o modelo de catálogo'),
  ('preco_curso',        '49.90', 'Preço do curso por nicho, em reais')
on conflict (chave) do nothing;

-- =====================================================================
-- DEPOIS DE CRIAR O USUÁRIO ADMIN, promova-o (troque o e-mail se preciso):
--   update public.perfis set papel = 'admin'
--   where id = (select id from auth.users
--               where lower(email) = 'assessoriacedroo@gmail.com');
-- =====================================================================
