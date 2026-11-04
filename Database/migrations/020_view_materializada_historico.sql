-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 014 - VIEW MATERIALIZADA PARA HISTÓRICO LONGITUDINAL
-- ==============================================================================
-- TASK: BD: View Materializada para Histórico Longitudinal (Tipo: Feature)
-- RESPONSÁVEL: Não atribuído (Backlog Arquitetural)
-- REQUISITOS: RF15 (Prontuário Longitudinal), RNF05 (SLA sub-50ms), RNF06 (Segurança),
--             RN01 (Expurgo de Modo Livre), RN04 (Isolamento Institucional),
--             RN05 (Inalterabilidade e Soft Delete)
-- ==============================================================================
-- OBJETIVO:
-- 1. Reduzir I/O e sobrecarga computacional de agregações em prontuários com dezenas
--    de atendimentos clínicos.
-- 2. Consolidar métricas de engajamento universal e catálogo de jogos por paciente.
-- 3. Excluir estritamente sessões em Modo Livre (s.paciente_id IS NOT NULL - RN01)
--    e relatórios clínicos marcados como soft delete (soft_delete = false - RN05).
-- 4. Viabilizar REFRESH MATERIALIZED VIEW CONCURRENTLY através do índice único
--    obrigatório idx_vw_resumo_paciente_id (paciente_id).
-- 5. Blindar acesso à View Materializada restringindo SELECT exclusivamente ao papel
--    interno service_role (revogando de authenticated/anon/public para garantir RN04).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Criação da View Materializada com Filtros Estritos (RN01, RN05)
-- ------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.vw_resumo_longitudinal_paciente AS
SELECT
    s.paciente_id,
    COUNT(CASE WHEN s.status_sessao != 'aguardando_pareamento' THEN 1 END)::INTEGER AS total_sessoes,
    COUNT(CASE WHEN s.status_sessao != 'aguardando_pareamento' THEN 1 END)::INTEGER AS total_iniciadas,
    COUNT(CASE WHEN s.status_sessao = 'finalizada' THEN 1 END)::INTEGER AS sessoes_finalizadas,
    COUNT(CASE WHEN s.status_sessao IN ('cancelada', 'interrompida_por_queda', 'expirada') THEN 1 END)::INTEGER AS sessoes_interrompidas,
    ROUND(
        COALESCE(
            (COUNT(CASE WHEN s.status_sessao = 'finalizada' THEN 1 END)::NUMERIC / 
             NULLIF(COUNT(CASE WHEN s.status_sessao != 'aguardando_pareamento' THEN 1 END), 0) * 100),
            0
        ), 1
    )::NUMERIC AS taxa_conclusao_porcentagem,
    ROUND(
        COALESCE(
            (COUNT(CASE WHEN s.status_sessao = 'finalizada' THEN 1 END)::NUMERIC / 
             NULLIF(COUNT(CASE WHEN s.status_sessao != 'aguardando_pareamento' THEN 1 END), 0) * 100),
            0
        ), 1
    )::NUMERIC AS taxa_conclusao,
    COALESCE(
        SUM(
            CASE 
                WHEN s.data_hora_inicio IS NOT NULL AND s.data_hora_fim IS NOT NULL AND s.data_hora_fim >= s.data_hora_inicio
                THEN EXTRACT(EPOCH FROM (s.data_hora_fim - s.data_hora_inicio))::INTEGER
                ELSE 0
            END
        ), 0
    )::INTEGER AS tempo_total_segundos,
    ROUND(
        COALESCE(
            SUM(
                CASE 
                    WHEN s.data_hora_inicio IS NOT NULL AND s.data_hora_fim IS NOT NULL AND s.data_hora_fim >= s.data_hora_inicio
                    THEN EXTRACT(EPOCH FROM (s.data_hora_fim - s.data_hora_inicio))::INTEGER
                    ELSE 0
                END
            ) / NULLIF(COUNT(CASE WHEN s.status_sessao = 'finalizada' THEN 1 END), 0),
            0
        )
    )::INTEGER AS tempo_medio_segundos,
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'jogo_id', sub.sub_jogo_id,
                    'nome', sub.jogo_nome,
                    'versao', sub.jogo_versao,
                    'total_sessoes', sub.total_jogo_sessoes,
                    'ultima_sessao', sub.max_fim
                ) ORDER BY sub.max_fim DESC
            )
            FROM (
                SELECT 
                    sj.jogo_id AS sub_jogo_id,
                    j.nome AS jogo_nome,
                    j.versao AS jogo_versao,
                    COUNT(*)::INTEGER AS total_jogo_sessoes,
                    TO_CHAR(MAX(sj.data_hora_fim), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS max_fim
                FROM public.sessao sj
                JOIN public.jogo j ON j.id = sj.jogo_id
                LEFT JOIN public.relatorio_sessao rj ON rj.sessao_id = sj.id
                WHERE sj.paciente_id = s.paciente_id
                  AND sj.modo_sessao = 'sessao_clinica'
                  AND sj.status_sessao = 'finalizada'
                  AND (rj.soft_delete IS NULL OR rj.soft_delete = FALSE)
                GROUP BY sj.jogo_id, j.nome, j.versao
            ) sub
        ),
        '[]'::jsonb
    ) AS jogos_resumo,
    TIMEZONE('utc', NOW()) AS atualizado_em
FROM public.sessao s
LEFT JOIN public.relatorio_sessao r ON r.sessao_id = s.id
WHERE s.paciente_id IS NOT NULL
  AND s.modo_sessao = 'sessao_clinica'
  AND (r.soft_delete IS NULL OR r.soft_delete = FALSE)
GROUP BY s.paciente_id
WITH DATA;

-- ------------------------------------------------------------------------------
-- 2. Índice Único Mandatório para Refresh Concorrente (REFRESH CONCURRENTLY)
-- ------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_vw_resumo_paciente_id
    ON public.vw_resumo_longitudinal_paciente (paciente_id);

-- ------------------------------------------------------------------------------
-- 3. Blindagem de Segurança e Autorização (RN04 / RNF06)
-- Views materializadas no PostgreSQL não oferecem suporte nativo a RLS.
-- Portanto, o acesso é revogado de papéis externos/públicos e concedido
-- estritamente à role interna `service_role` (consumida pelo backend autenticado).
-- ------------------------------------------------------------------------------
REVOKE ALL ON public.vw_resumo_longitudinal_paciente FROM PUBLIC;
REVOKE ALL ON public.vw_resumo_longitudinal_paciente FROM anon;
REVOKE ALL ON public.vw_resumo_longitudinal_paciente FROM authenticated;
GRANT SELECT ON public.vw_resumo_longitudinal_paciente TO service_role;

-- ------------------------------------------------------------------------------
-- 4. Função Segura para Invalidação e Atualização Concorrente da View
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_vw_resumo_longitudinal_paciente()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.vw_resumo_longitudinal_paciente;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON MATERIALIZED VIEW public.vw_resumo_longitudinal_paciente IS 
    'Agregação analítica transversal de engajamento do paciente com suporte a refresh concorrente (RF15, RNF05, RN01, RN04, RN05).';
