-- ==============================================================================
-- PROJETO InTEA: SEED DE DEMONSTRAÇÃO - SESSÃO CLÍNICA EM ANDAMENTO (RF12, RF16, RN03, RN04)
-- Terapeuta ID: a9849163-613f-4492-90cf-89985902d16e (Dr. Marcos Willian)
-- Paciente ID:  164a2d30-2ca1-464f-9b55-9070f06b2058 (Raildom da Rocha Silva)
-- Jogo ID:      11111111-1111-4111-8111-111111111111 (Aventura das Cores)
-- Sessão ID:    44444444-4444-4444-8444-444444444444
-- ==============================================================================

-- 1. Garante Vínculo Institucional do Terapeuta com o Paciente (RN04)
INSERT INTO public.terapeuta_paciente (terapeuta_id, paciente_id, created_at)
VALUES (
    'a9849163-613f-4492-90cf-89985902d16e',
    '164a2d30-2ca1-464f-9b55-9070f06b2058',
    TIMEZONE('utc', NOW())
)
ON CONFLICT (terapeuta_id, paciente_id) DO NOTHING;

-- 2. Insere ou Atualiza a Sessão Clínica como 'em_andamento' (Cockpit Ativo)
-- (Compatível com o schema de 02_seed_demonstracao_clinica.sql)
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
    'em_andamento',
    '{
        "estresse_inicial": 2,
        "tolerancia_frustracao": "moderada",
        "nivel_dificuldade_inicial": 2,
        "gatilhos_a_evitar": ["Sons Repentinos e Ruídos Agudos", "Luzes Estroboscópicas"],
        "objetivo_clinico": "Atenção Compartilhada",
        "sensibilidade_sensorial": "moderada"
    }'::jsonb,
    TIMEZONE('utc', NOW()) - INTERVAL '14 minutes',
    NULL,
    TIMEZONE('utc', NOW()) + INTERVAL '46 minutes',
    TIMEZONE('utc', NOW()) - INTERVAL '15 minutes',
    TIMEZONE('utc', NOW())
)
ON CONFLICT (id) DO UPDATE
SET
    status_sessao = 'em_andamento',
    data_hora_inicio = TIMEZONE('utc', NOW()) - INTERVAL '14 minutes',
    data_hora_fim = NULL,
    expira_em = TIMEZONE('utc', NOW()) + INTERVAL '46 minutes',
    contexto_dda_json = EXCLUDED.contexto_dda_json,
    updated_at = TIMEZONE('utc', NOW());

-- 3. Telemetria Contínua da Sessão Ativa (Eventos de streaming)
INSERT INTO public.telemetria_evento (sessao_id, tipo_evento, dados, data_hora)
VALUES 
    (
        '44444444-4444-4444-8444-444444444444',
        'interacao_paciente',
        '{"id_metrica": "tempo_resposta", "tipo_metrica": "numerica", "valor": 2.4, "acerto": true}'::jsonb,
        TIMEZONE('utc', NOW()) - INTERVAL '10 minutes'
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        'modulacao_dda',
        '{"acao": "manter_dificuldade", "nivel": 2, "motivo": "estabilidade_atencional"}'::jsonb,
        TIMEZONE('utc', NOW()) - INTERVAL '6 minutes'
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        'interacao_paciente',
        '{"id_metrica": "tempo_resposta", "tipo_metrica": "numerica", "valor": 1.9, "acerto": true}'::jsonb,
        TIMEZONE('utc', NOW()) - INTERVAL '1 minute'
    );

-- 4. Registro de Auditoria do Pareamento e Início
INSERT INTO public.auditoria_sessao (sessao_id, terapeuta_id, origem, acao, detalhes_json, created_at)
VALUES 
    (
        '44444444-4444-4444-8444-444444444444',
        'a9849163-613f-4492-90cf-89985902d16e',
        'terapeuta_web',
        'sessao_iniciada',
        '{"modo": "sessao_clinica", "jogo_id": "11111111-1111-4111-8111-111111111111", "paciente_id": "164a2d30-2ca1-464f-9b55-9070f06b2058"}'::jsonb,
        TIMEZONE('utc', NOW()) - INTERVAL '14 minutes'
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        'a9849163-613f-4492-90cf-89985902d16e',
        'dispositivo_jogo',
        'dispositivo_pareado',
        '{"token": "849-291", "dispositivo": "Tablet Samsung Galaxy Tab S9 FE"}'::jsonb,
        TIMEZONE('utc', NOW()) - INTERVAL '13 minutes'
    );
