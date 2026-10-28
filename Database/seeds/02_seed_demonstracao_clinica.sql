-- ==============================================================================
-- PROJETO InTEA: SEED DE DEMONSTRAÇÃO CLÍNICA (VÍNCULO, SESSÃO FINALIZADA E TELEMETRIA)
-- Terapeuta ID: a9849163-613f-4492-90cf-89985902d16e (Dr. Marcos Willian)
-- Paciente ID:  164a2d30-2ca1-464f-9b55-9070f06b2058 (Raildom da Rocha Silva)
-- Jogo ID:      11111111-1111-4111-8111-111111111111 (Aventura das Cores)
-- Sessão ID:    44444444-4444-4444-8444-444444444444
-- ==============================================================================

-- 1. Garante Perfil do Terapeuta na Tabela terapeuta (caso já exista em auth.users)
INSERT INTO public.terapeuta (
    id,
    nome,
    email,
    registro_profissional,
    crefito,
    status_ativo
)
SELECT 
    'a9849163-613f-4492-90cf-89985902d16e'::uuid,
    'Dr. Marcos Willian',
    'marcos.terapeuta@intea.clinica',
    'CRP 11/09876',
    'CRP 11/09876',
    true
WHERE EXISTS (
    SELECT 1 FROM auth.users WHERE id = 'a9849163-613f-4492-90cf-89985902d16e'::uuid
)
ON CONFLICT (id) DO UPDATE
SET
    nome = EXCLUDED.nome,
    registro_profissional = EXCLUDED.registro_profissional,
    crefito = EXCLUDED.crefito;

-- 2. Vínculo Institucional do Terapeuta com o Paciente (RN04)
INSERT INTO public.terapeuta_paciente (terapeuta_id, paciente_id, created_at)
VALUES (
    'a9849163-613f-4492-90cf-89985902d16e',
    '164a2d30-2ca1-464f-9b55-9070f06b2058',
    TIMEZONE('utc', NOW())
)
ON CONFLICT (terapeuta_id, paciente_id) DO NOTHING;

-- 3. Sessão Clínica Finalizada (RF10, RF12, RF14, RN01, RN03)
INSERT INTO public.sessao (
    id,
    terapeuta_id,
    paciente_id,
    jogo_id,
    session_token,
    modo_sessao,
    status_sessao,
    contexto_dda_json,
    data_hora_inicio,
    data_hora_fim,
    expira_em,
    created_at,
    updated_at
)
VALUES (
    '44444444-4444-4444-8444-444444444444',
    'a9849163-613f-4492-90cf-89985902d16e',
    '164a2d30-2ca1-464f-9b55-9070f06b2058',
    '11111111-1111-4111-8111-111111111111',
    '849-291',
    'sessao_clinica',
    'finalizada',
    '{
        "foco_terapeutico": "foco_atencional",
        "tolerancia_frustracao": "moderada",
        "nivel_dificuldade_inicial": 2,
        "gatilhos_a_evitar": ["sons_agudos", "luzes_piscantes"]
    }'::jsonb,
    TIMEZONE('utc', NOW()) - INTERVAL '40 minutes',
    TIMEZONE('utc', NOW()) - INTERVAL '5 minutes',
    TIMEZONE('utc', NOW()) + INTERVAL '1 day',
    TIMEZONE('utc', NOW()) - INTERVAL '40 minutes',
    TIMEZONE('utc', NOW()) - INTERVAL '5 minutes'
)
ON CONFLICT (id) DO UPDATE
SET
    status_sessao = EXCLUDED.status_sessao,
    data_hora_inicio = EXCLUDED.data_hora_inicio,
    data_hora_fim = EXCLUDED.data_hora_fim,
    contexto_dda_json = EXCLUDED.contexto_dda_json,
    updated_at = TIMEZONE('utc', NOW());

-- 3. Relatório Clínico com Síntese do Agente de IA (Contrato 4 - RF20)
INSERT INTO public.relatorio_sessao (
    sessao_id,
    conteudo,
    dados_ia_json,
    soft_delete,
    created_at,
    updated_at
)
VALUES (
    '44444444-4444-4444-8444-444444444444',
    'Paciente Raildom apresentou excelente engajamento durante a atividade de emparelhamento de cores. Observou-se melhora na manutenção do foco atencional (média de 38s) e boa autorregulação emocional durante os ajustes automáticos pelo motor DDA. Recomendada manutenção do nível 2 na próxima sessão.',
    '{
        "taxa_conclusao_percentual": 92.5,
        "tempo_total_segundos": 2100,
        "intervencoes_dda": 3,
        "estabilidade_emocional_score": 8.6,
        "desempenho_geral": "superior",
        "metricas_consolidadas": {
            "tempo_resposta_medio_segundos": 2.8,
            "precisao_acertos_percentual": 89.0,
            "eventos_estresse": 1,
            "recuperacao_pos_frustracao_segundos": 14.2
        },
        "sugestoes_proxima_sessao": [
            "Incrementar gradualmente o número de elementos na tela",
            "Introduzir estímulos sonoros suaves para transição de fases"
        ]
    }'::jsonb,
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '5 minutes',
    TIMEZONE('utc', NOW()) - INTERVAL '5 minutes'
)
ON CONFLICT (sessao_id) DO UPDATE
SET
    conteudo = EXCLUDED.conteudo,
    dados_ia_json = EXCLUDED.dados_ia_json,
    updated_at = TIMEZONE('utc', NOW());

-- 4. Eventos de Telemetria Contínua (Contrato 3 - telemetria_evento)
INSERT INTO public.telemetria_evento (sessao_id, tipo_evento, dados, data_hora)
VALUES 
    (
        '44444444-4444-4444-8444-444444444444',
        'interacao_paciente',
        '{"id_metrica": "tempo_resposta", "tipo_metrica": "numerica", "valor": 2.8, "acerto": true}'::jsonb,
        TIMEZONE('utc', NOW()) - INTERVAL '35 minutes'
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        'modulacao_dda',
        '{"acao": "aumento_dificuldade", "nivel_anterior": 1, "novo_nivel": 2, "motivo": "acertos_consecutivos"}'::jsonb,
        TIMEZONE('utc', NOW()) - INTERVAL '28 minutes'
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        'metrica_jogo',
        '{"id_metrica": "nivel_frustracao", "tipo_metrica": "categorica", "valor": "baixo"}'::jsonb,
        TIMEZONE('utc', NOW()) - INTERVAL '20 minutes'
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        'interacao_paciente',
        '{"id_metrica": "tempo_resposta", "tipo_metrica": "numerica", "valor": 2.2, "acerto": true}'::jsonb,
        TIMEZONE('utc', NOW()) - INTERVAL '10 minutes'
    );

-- 5. Trilha de Auditoria Clínica de Sessão (RF13, RN04, RN05)
INSERT INTO public.auditoria_sessao (sessao_id, terapeuta_id, origem, acao, detalhes_json, created_at)
VALUES 
    (
        '44444444-4444-4444-8444-444444444444',
        'a9849163-613f-4492-90cf-89985902d16e',
        'terapeuta_web',
        'sessao_criada',
        '{"modo": "sessao_clinica", "jogo": "Aventura das Cores"}'::jsonb,
        TIMEZONE('utc', NOW()) - INTERVAL '40 minutes'
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        'a9849163-613f-4492-90cf-89985902d16e',
        'dispositivo_jogo',
        'dispositivo_pareado',
        '{"token": "849-291", "dispositivo": "Tablet Samsung Galaxy Tab S9 FE"}'::jsonb,
        TIMEZONE('utc', NOW()) - INTERVAL '38 minutes'
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        'a9849163-613f-4492-90cf-89985902d16e',
        'terapeuta_web',
        'sessao_finalizada',
        '{"motivo": "encerramento_regular", "duracao_minutos": 35}'::jsonb,
        TIMEZONE('utc', NOW()) - INTERVAL '5 minutes'
    );

-- 6. Anotação Clínica da Sessão (RF16)
INSERT INTO public.anotacao_clinica (
    terapeuta_id,
    paciente_id,
    sessao_id,
    conteudo,
    soft_delete,
    created_at,
    updated_at
)
VALUES (
    'a9849163-613f-4492-90cf-89985902d16e',
    '164a2d30-2ca1-464f-9b55-9070f06b2058',
    '44444444-4444-4444-8444-444444444444',
    'Paciente demonstrou excelente resposta aos estímulos visuais na Aventura das Cores. Raildom demonstrou cooperação e boa resposta ao reforço positivo.',
    FALSE,
    TIMEZONE('utc', NOW()) - INTERVAL '5 minutes',
    TIMEZONE('utc', NOW()) - INTERVAL '5 minutes'
);
