create extension if not exists "pgcrypto";

create table if not exists public.jogos (
  id_jogo text primary key,
  nome text not null,
  versao text not null,
  metricas_suportadas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sessoes (
  id uuid primary key default gen_random_uuid(),
  token_sessao text not null unique,
  id_terapeuta text not null,
  id_paciente text not null,
  contexto_paciente jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.telemetria_eventos (
  id bigserial primary key,
  sessao_id uuid not null references public.sessoes(id) on delete cascade,
  data_hora timestamptz not null,
  tipo_evento text not null,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.relatorios_sessao (
  id bigserial primary key,
  sessao_id uuid not null unique references public.sessoes(id) on delete cascade,
  duracao_segundos integer not null check (duracao_segundos >= 0),
  resumo jsonb not null default '{}'::jsonb,
  analises_ia jsonb not null default '[]'::jsonb,
  metricas_agregadas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_telemetria_eventos_sessao_data_hora
  on public.telemetria_eventos(sessao_id, data_hora desc);
