-- ==============================================================================
-- InTEA: Migration 011 - Remoção da coluna status_instalacao da tabela jogo
-- ==============================================================================
-- Motivo: A tabela jogo armazena o catálogo de jogos homologados pela clínica.
-- A existência do registro já atesta a disponibilidade do jogo no catálogo.
-- A verificação de execução/presença do jogo em dispositivo físico ocorre dinamicamente
-- durante o handshake de pareamento da sessão (RF10).
-- ==============================================================================

ALTER TABLE public.jogo DROP COLUMN IF EXISTS status_instalacao;
