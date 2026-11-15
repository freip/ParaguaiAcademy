-- Aulas postadas pelo admin. Rode uma vez em: Supabase > SQL Editor > New query > Run.
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id text not null,
  step int not null default 0,
  title text not null check (char_length(title) between 1 and 120),
  video text not null check (video ~ '^[A-Za-z0-9_-]{11}$'),
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.lessons enable row level security;

grant select on public.lessons to anon, authenticated;
grant insert, update, delete on public.lessons to authenticated;

drop policy if exists "alunos leem" on public.lessons;
create policy "alunos leem" on public.lessons
  for select to anon, authenticated using (true);

drop policy if exists "admin insere" on public.lessons;
create policy "admin insere" on public.lessons
  for insert to authenticated
  with check (lower(auth.jwt() ->> 'email') = 'assessoriacedroo@gmail.com');

drop policy if exists "admin altera" on public.lessons;
create policy "admin altera" on public.lessons
  for update to authenticated
  using (lower(auth.jwt() ->> 'email') = 'assessoriacedroo@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'assessoriacedroo@gmail.com');

drop policy if exists "admin apaga" on public.lessons;
create policy "admin apaga" on public.lessons
  for delete to authenticated
  using (lower(auth.jwt() ->> 'email') = 'assessoriacedroo@gmail.com');
