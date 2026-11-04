-- ==============================================================================
-- PROJETO InTEA: MIGRATION 014
-- Adicionar status 'pausada' à máquina de estados da sessão (RF12, RF21)
-- Permite suspensão temporária e retomada da intervenção sem acúmulo de tempo ocioso
-- Idempotente e segura
-- ==============================================================================

ALTER TABLE public.sessao DROP CONSTRAINT IF EXISTS chk_status_sessao;

ALTER TABLE public.sessao
    ADD CONSTRAINT chk_status_sessao CHECK (
        status_sessao IN (
            'aguardando_pareamento',
            'conectado',
            'em_andamento',
            'pausada',
            'finalizada',
            'expirada',
            'cancelada',
            'interrompida_por_queda'
        )
    );
