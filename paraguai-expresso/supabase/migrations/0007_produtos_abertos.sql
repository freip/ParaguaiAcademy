-- =====================================================================
-- Paraguai Academy — 0007_produtos_abertos.sql
-- A calculadora mostra TODOS os produtos (sem filtrar pelo nicho do aluno).
-- Libera a leitura de produtos para qualquer aluno logado.
-- Rode no SQL Editor do Supabase.
-- =====================================================================

drop policy if exists "aluno le produtos" on public.produtos;
create policy "aluno le produtos" on public.produtos
  for select to authenticated using (true);
