-- Terra3 Radar — estado compartilhado (rodar no SQL Editor do Supabase).
-- Demo: acesso liberado para a chave anon. Em produção, trocar por RLS ligada ao login do Terra3.

create extension if not exists pgcrypto;

create table if not exists foco_historico (
  id uuid primary key default gen_random_uuid(),
  foco text not null constraint foco_historico_foco_check check (foco in ('geral', 'share', 'base', 'pipeline')),
  autor text not null,
  vigencia_ate date,
  nota text,
  criado_em timestamptz not null default now()
);

-- Bases criadas antes do foco "Prioridade geral" ('geral'): atualiza a restrição.
alter table foco_historico drop constraint if exists foco_historico_foco_check;
alter table foco_historico add constraint foco_historico_foco_check check (foco in ('geral', 'share', 'base', 'pipeline'));

create table if not exists fixados (
  id uuid primary key default gen_random_uuid(),
  cliente_id integer not null,
  consultor text not null,
  gerente text not null,
  nota text,
  criado_em timestamptz not null default now(),
  removido_em timestamptz,
  removido_por text
);

create table if not exists registros (
  id uuid primary key default gen_random_uuid(),
  cliente_id integer not null,
  consultor text not null,
  autor text not null,
  resultado text not null check (resultado in ('contatado', 'agendado', 'sem_sucesso')),
  canal text,
  nota text,
  criado_em timestamptz not null default now()
);

create table if not exists auditoria (
  id uuid primary key default gen_random_uuid(),
  quem text not null,
  perfil text not null,
  acao text not null,
  detalhe text not null,
  criado_em timestamptz not null default now()
);

alter table foco_historico enable row level security;
alter table fixados enable row level security;
alter table registros enable row level security;
alter table auditoria enable row level security;

create policy "demo leitura" on foco_historico for select using (true);
create policy "demo escrita" on foco_historico for insert with check (true);
create policy "demo leitura" on fixados for select using (true);
create policy "demo escrita" on fixados for insert with check (true);
create policy "demo desafixar" on fixados for update using (true) with check (true);
create policy "demo leitura" on registros for select using (true);
create policy "demo escrita" on registros for insert with check (true);
create policy "demo leitura" on auditoria for select using (true);
create policy "demo escrita" on auditoria for insert with check (true);

-- Atualização ao vivo entre usuários (o app escuta inserções na auditoria).
alter publication supabase_realtime add table auditoria;
