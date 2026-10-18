-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 012 - STATUS 'interrompida_por_queda' NA SESSÃO
-- ==============================================================================
-- REQUISITOS ATENDIDOS:
-- - RNF04 (Tolerância a Falhas e Resiliência de Conexão WebSocket)
-- - Card 2.3 (Janela de Tolerância de 60s e Interrupção por Queda Persistida)
-- ==============================================================================

-- Atualiza a constraint de máquina de estados da sessão para incluir 'interrompida_por_queda'
ALTER TABLE public.sessao DROP CONSTRAINT IF EXISTS chk_status_sessao;
ALTER TABLE public.sessao
    ADD CONSTRAINT chk_status_sessao CHECK (
        status_sessao IN (
            'aguardando_pareamento',
            'conectado',
            'em_andamento',
            'finalizada',
            'expirada',
            'cancelada',
            'interrompida_por_queda'
        )
    );
