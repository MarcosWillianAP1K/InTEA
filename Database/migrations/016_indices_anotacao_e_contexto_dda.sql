-- ==============================================================================
-- InTEA: Migration 016 - Índices Otimizados para Anotações Clínicas e Contexto DDA
-- Conformidade: RF16 (Prontuário e Anotações), RF21 (Autoria JWT), RN04, RN05
-- Idempotente e segura para rollback
-- ==============================================================================

-- 1. Índice composto para filtragem de anotações ativas por paciente, autor e cronologia
CREATE INDEX IF NOT EXISTS idx_anotacao_paciente_autor_data 
ON public.anotacao_clinica(paciente_id, terapeuta_id, created_at DESC) 
WHERE soft_delete = false;

-- 2. Índice para recuperação de anotações ativas associadas a sessões
CREATE INDEX IF NOT EXISTS idx_anotacao_sessao_soft_delete 
ON public.anotacao_clinica(sessao_id, created_at DESC) 
WHERE soft_delete = false;
