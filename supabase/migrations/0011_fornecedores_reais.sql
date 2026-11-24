-- =====================================================================
-- Paraguai Academy — 0011_fornecedores_reais.sql
-- A lista real de fornecedores (Ciudad del Este, Salto del Guairá e um no
-- Brasil). Entram todos ABERTOS (premium = false): o Standard também vê o
-- contato. O que separa o Pro continua sendo compras coletivas, mentoria e
-- acompanhamento. Para trancar uma loja depois: Admin → Fornecedores → Premium.
--
-- Idempotente: a chave é o `nome`. Rodar de novo não duplica e não sobrescreve
-- o que você já editou no painel.
-- Rode no SQL Editor do Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Os fornecedores
-- ---------------------------------------------------------------------
-- `descricao` guarda a categoria porque a busca da tela varre nome, descrição
-- e cidade — assim o aluno acha digitando "óculos" ou "eletrônicos".
-- `verificado` entra como false de propósito: o selo "Verificado" é uma
-- afirmação sua para o aluno, não nossa. Veja o passo 3 para ligar o selo.
-- Pedido mínimo, pagamento e prazo ficam nulos (não temos o dado); a tela
-- simplesmente não desenha a linha vazia.
insert into public.fornecedores
  (nome, pais, cidade, nichos, descricao, contato_nome, whatsapp,
   verificado, premium, ativo)
select v.nome, v.pais, v.cidade, '{geral}', v.descricao,
       nullif(v.contato, ''), v.zap, false, false, true
from (values
  -- ---------- Perfumes e cosméticos (Ciudad del Este) ----------
  ('H3 (Agatres)',                  'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Aya',              '595993513100'),
  ('Amadeus',                       'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Micaela Lunkes',   '595993514627'),
  ('Macedônia',                     'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Camila',           '595976909999'),
  ('Serena Group',                  'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Beatriz',          '595993014879'),
  ('Atacado Connect',               'PY', 'Ciudad del Este', 'Perfumes, cosméticos e eletrônicos.',           'Julia',            '595983610887'),
  ('Zomo Store',                    'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Letícia',          '595973548115'),
  ('Francia S.A',                   'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Magali',           '595983102128'),
  ('Charme Perfumaria',             'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Carmen Maria',     '595985335487'),
  ('Grupo ATN',                     'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Christian',        '595973108090'),
  ('ASM',                           'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Richard',          '595985236700'),
  ('Multipass',                     'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Maria',            '595994999008'),
  ('Elegância Company',             'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'William',          '595976530629'),
  ('Loja Roma',                     'PY', 'Ciudad del Este', 'Perfumes, cosméticos, eletrônicos e celulares.','Brahiam',          '595986799380'),
  ('Ponto.Com',                     'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Magali',           '595986885554'),
  ('Toku Importados',               'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Lucas',            '595994367305'),
  ('Madrid Center',                 'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Stella',           '595974906309'),
  ('Behuel Behuel By La Bendecida', 'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Lourdes',          '595986117526'),
  ('Epic Importados',               'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Jhoana',           '595985899969'),
  ('Alborada',                      'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Jonathan Carvalho','595981433888'),
  ('New Zone',                      'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        '',                 '595994376439'),
  ('Brands',                        'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        '',                 '595992979800'),
  ('Casa Nippon',                   'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Kawana',           '595983776789'),

  -- ---------- Eletrônicos e celulares ----------
  -- Atacado Connect e Loja Roma também vendem eletrônicos: não viram cadastro
  -- novo, a categoria entrou na descrição deles lá em cima.
  ('Alex Iphone Swap',              'BR', null,              'Eletrônicos e celulares — iPhone.',             'Alex',             '554598619254'),

  -- ---------- Acessórios e outros (Ciudad del Este) ----------
  ('Fátima (Óculos)',               'PY', 'Ciudad del Este', 'Óculos.',                                       'Fátima',           '595991787777'),
  ('Carol Shop',                    'PY', 'Ciudad del Este', 'Relógios.',                                     'Andréa',           '595983288287'),
  ('New Hengda',                    'PY', 'Ciudad del Este', 'Bolsas, copos, óculos e acessórios.',           '',                 '595995677778'),
  ('Mix Importados',                'PY', 'Ciudad del Este', 'Brinquedos.',                                   'Mirella',          '595976617802'),
  ('Prime Barber Supply',           'PY', 'Ciudad del Este', 'Material para barbearia.',                      '',                 '595984425370'),

  -- ---------- Salto del Guairá ----------
  ('Dalet Importados',              'PY', 'Salto del Guairá', null,                                           'Lety',             '595987406151')
) as v(nome, pais, cidade, descricao, contato, zap)
where not exists (select 1 from public.fornecedores f where f.nome = v.nome);

-- ---------------------------------------------------------------------
-- 2) Os cadastros de teste saem da lista
-- ---------------------------------------------------------------------
-- Ficam no banco (dá para reativar no painel), só param de aparecer para o
-- aluno agora que existem fornecedores de verdade.
update public.fornecedores set ativo = false
  where nome like '%[EXEMPLO]%';

-- ---------------------------------------------------------------------
-- 3) Dois pontos para você conferir depois
-- ---------------------------------------------------------------------
-- a) ALEX IPHONE SWAP — o número veio como +55 45 9861-9254, que tem 8 dígitos
--    depois do DDD. Celular no Brasil tem 9 (começa com 9), então salvamos
--    exatamente o que você mandou, sem inventar dígito. Se o número certo for
--    (45) 99861-9254, rode:
--
--      update public.fornecedores set whatsapp = '5545998619254'
--        where nome = 'Alex Iphone Swap';
--
--    A cidade dele ficou vazia por isso mesmo: DDD 45 cobre o oeste do Paraná
--    inteiro, não dá para afirmar Foz do Iguaçu. Preencha no painel.
--
-- b) SELO "VERIFICADO" — todos entraram sem o selo. Para ligar em todos os que
--    você já conferiu pessoalmente:
--
--      update public.fornecedores set verificado = true
--        where pais = 'PY' and ativo and nome <> 'Rota Árabe';
--
--    Ou marque loja por loja em Admin → Fornecedores.

-- Confira como ficou:
--   select nome, cidade, contato_nome, whatsapp, descricao
--     from public.fornecedores where ativo order by cidade, nome;
