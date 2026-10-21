-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 013 - ÍNDICES OTIMIZADOS PARA HISTÓRICO LONGITUDINAL
-- ==============================================================================
-- TASK: BD/Back: Modelagem e Índices para Histórico de Engajamento Global e Séries por Jogo
-- RESPONSÁVEL: Marcos Willian (@MarcosWillianAP1K)
-- REQUISITOS: RF15 (Prontuário Longitudinal), RNF05 (Performance e Tempo de Resposta),
--             RN01 (Expurgo de Telemetria de Modo Livre), RN04 (Vínculo), RN05 (Imutabilidade)
-- ==============================================================================
-- OBJETIVO:
-- 1. Otimizar as consultas de agregação de engajamento clínico transversal (taxa de
--    conclusão, sessões finalizadas vs desistências, tempo acumulado).
-- 2. Acelerar a recuperação temporal das séries de métricas clínicas por jogo específico
--    através de índice parcial composto com predicado de filtro.
-- 3. Habilitar busca indexada e rápida no payload semiestruturado JSONB dos relatórios
--    de IA via índice invertido generalizado (GIN).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Índice B-Tree Parcial para Engajamento Geral do Paciente (Transversal)
-- Cobre: paciente_id, status_sessao e data_hora_fim DESC
-- Predicado: WHERE paciente_id IS NOT NULL (Expurga completamente Modo Livre - RN01)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessao_paciente_engajamento
    ON public.sessao (paciente_id, status_sessao, data_hora_fim DESC)
    WHERE paciente_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. Índice B-Tree Parcial Composto para Séries Clínicas por Jogo
-- Cobre: paciente_id, jogo_id e data_hora_fim DESC
-- Predicado: WHERE status_sessao = 'finalizada' AND paciente_id IS NOT NULL
-- (Acelera séries temporais evolutivas por jogo de intervenções concluídas)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessao_paciente_jogo_fim
    ON public.sessao (paciente_id, jogo_id, data_hora_fim DESC)
    WHERE status_sessao = 'finalizada' AND paciente_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. Índice GIN sobre o Payload Analítico da IA no Relatório de Sessão
-- Cobre: dados_ia_json JSONB (Contrato 4: metricas_agregadas, resumo, DDA)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_relatorio_dados_ia_gin
    ON public.relatorio_sessao
    USING gin (dados_ia_json);
