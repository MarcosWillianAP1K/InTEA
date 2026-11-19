-- ==============================================================================
-- InTEA: Script Manual de Sincronizacao e Reset de Auditoria (Dev / Homologacao)
-- ==============================================================================
-- Objetivo:
--   1. Garantir que exista ao menos uma clinica ativa em `public.clinica` e
--      preencher `clinica_id` nos terapeutas e pacientes legados que estavam NULL.
--   2. Vincular pacientes orfaos (sem registro em `terapeuta_paciente`) ao
--      SuperAdmin ativo para nao quebrar consultas RN04.
--   3. Limpar os 5 eventos sinteticos antigos da sessao 44444444-... e sincronizar
--      `public.auditoria_evento` com TODAS as sessoes reais existentes em
--      `public.sessao` (com terapeuta_id, paciente_id e clinica_id reais).
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    v_clinica_id UUID;
    v_super_admin_id UUID;
    v_has_auditoria_sessao BOOLEAN;
    v_has_auditoria_evento BOOLEAN;
BEGIN
    -- 1. Garante clinica institucional ativa para terapeutas e pacientes legados
    SELECT id INTO v_clinica_id
    FROM public.clinica
    WHERE status_ativo = TRUE
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_clinica_id IS NULL THEN
        INSERT INTO public.clinica (nome, cnpj, status_ativo)
        VALUES ('InTEA Saúde & Neurodesenvolvimento', '12.345.678/0001-90', TRUE)
        RETURNING id INTO v_clinica_id;
    END IF;

    UPDATE public.terapeuta
    SET clinica_id = v_clinica_id
    WHERE clinica_id IS NULL;

    UPDATE public.paciente
    SET clinica_id = v_clinica_id
    WHERE clinica_id IS NULL;

    -- 2. Garante vinculo em terapeuta_paciente para pacientes antigos sem nenhum terapeuta
    SELECT id INTO v_super_admin_id
    FROM public.terapeuta
    WHERE is_super_admin = TRUE AND status_ativo = TRUE
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_super_admin_id IS NOT NULL THEN
        INSERT INTO public.terapeuta_paciente (terapeuta_id, paciente_id)
        SELECT v_super_admin_id, p.id
        FROM public.paciente p
        WHERE NOT EXISTS (
            SELECT 1 FROM public.terapeuta_paciente tp
            WHERE tp.paciente_id = p.id
        )
        ON CONFLICT DO NOTHING;
    END IF;

    -- 3. Limpa os 5 eventos antigos de demonstracao sem IP/paciente e sincroniza sessoes reais
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'auditoria_sessao'
    ) INTO v_has_auditoria_sessao;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'auditoria_evento'
    ) INTO v_has_auditoria_evento;

    IF v_has_auditoria_sessao THEN
        ALTER TABLE public.auditoria_sessao DISABLE TRIGGER trg_bloqueio_mutacao_auditoria;
        DELETE FROM public.auditoria_sessao
        WHERE sessao_id = '44444444-4444-4444-8444-444444444444';
        ALTER TABLE public.auditoria_sessao ENABLE TRIGGER trg_bloqueio_mutacao_auditoria;
    END IF;

    IF v_has_auditoria_evento THEN
        ALTER TABLE public.auditoria_evento DISABLE TRIGGER trg_bloqueio_mutacao_auditoria_evento;
        DELETE FROM public.auditoria_evento
        WHERE sessao_id = '44444444-4444-4444-8444-444444444444'
           OR clinica_id IS NULL;
        ALTER TABLE public.auditoria_evento ENABLE TRIGGER trg_bloqueio_mutacao_auditoria_evento;

        -- Re-executa backfill de acessos a prontuario e vinculos ja com clinica_id preenchida
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'auditoria_acesso_prontuario'
        ) THEN
            INSERT INTO public.auditoria_evento (
                id, entidade, acao, origem, terapeuta_id, paciente_id, sessao_id, clinica_id,
                recurso_id, descricao, detalhes_json, ip, user_agent, created_at
            )
            SELECT
                ap.id,
                'paciente',
                CASE
                    WHEN ap.operacao = 'visualizacao' THEN 'acesso_prontuario'
                    WHEN ap.operacao = 'alteracao' THEN 'paciente_atualizado'
                    WHEN ap.operacao = 'exclusao_logica' THEN 'paciente_desativado'
                    ELSE COALESCE(NULLIF(ap.operacao, ''), 'acesso_prontuario')
                END,
                'terapeuta_web',
                t.id,
                p.id,
                NULL::uuid,
                COALESCE(p.clinica_id, t.clinica_id, v_clinica_id),
                p.id,
                ap.recurso_acessado,
                COALESCE(ap.detalhes_json, '{}'::jsonb) || jsonb_build_object(
                    'operacao', ap.operacao,
                    'recurso_acessado', ap.recurso_acessado
                ),
                ap.ip,
                ap.user_agent,
                ap.created_at
            FROM public.auditoria_acesso_prontuario ap
            LEFT JOIN public.terapeuta t ON t.id = ap.terapeuta_id
            LEFT JOIN public.paciente p ON p.id = ap.paciente_id
            ON CONFLICT (id) DO NOTHING;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'auditoria_vinculo_acesso'
        ) THEN
            INSERT INTO public.auditoria_evento (
                id, entidade, acao, origem, terapeuta_id, paciente_id, sessao_id, clinica_id,
                recurso_id, descricao, detalhes_json, ip, user_agent, created_at
            )
            SELECT
                av.id,
                'vinculo',
                av.acao,
                'terapeuta_web',
                t_autor.id,
                p.id,
                NULL::uuid,
                COALESCE(p.clinica_id, t_autor.clinica_id, v_clinica_id),
                av.terapeuta_alvo_id,
                CASE
                    WHEN av.acao = 'vinculo_equipe_criado' THEN 'Especialista vinculado à equipe do paciente.'
                    ELSE 'Especialista desvinculado da equipe do paciente.'
                END,
                jsonb_build_object(
                    'paciente_id', av.paciente_id,
                    'terapeuta_autor_id', av.terapeuta_autor_id,
                    'terapeuta_alvo_id', av.terapeuta_alvo_id,
                    'terapeuta_alvo_nome', t_alvo.nome
                ),
                av.ip,
                av.user_agent,
                av.created_at
            FROM public.auditoria_vinculo_acesso av
            LEFT JOIN public.terapeuta t_autor ON t_autor.id = av.terapeuta_autor_id
            LEFT JOIN public.terapeuta t_alvo ON t_alvo.id = av.terapeuta_alvo_id
            LEFT JOIN public.paciente p ON p.id = av.paciente_id
            ON CONFLICT (id) DO NOTHING;
        END IF;

        -- Gera evento 'sessao_criada' para todas as sessoes reais do banco
        INSERT INTO public.auditoria_evento (
            entidade, acao, origem, terapeuta_id, paciente_id, sessao_id, clinica_id,
            recurso_id, descricao, detalhes_json, created_at
        )
        SELECT
            'sessao',
            'sessao_criada',
            'terapeuta_web',
            s.terapeuta_id,
            s.paciente_id,
            s.id,
            COALESCE(p.clinica_id, t.clinica_id, v_clinica_id),
            s.id,
            'Sessão clínica iniciada (' || COALESCE(j.nome, 'Jogo Terapêutico') || ').',
            jsonb_build_object(
                'session_token', s.session_token,
                'modo_sessao', s.modo_sessao,
                'jogo_id', s.jogo_id,
                'jogo_nome', j.nome
            ),
            COALESCE(s.data_hora_inicio, s.created_at)
        FROM public.sessao s
        LEFT JOIN public.paciente p ON p.id = s.paciente_id
        LEFT JOIN public.terapeuta t ON t.id = s.terapeuta_id
        LEFT JOIN public.jogo j ON j.id = s.jogo_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.auditoria_evento ae
            WHERE ae.sessao_id = s.id AND ae.acao = 'sessao_criada'
        );

        -- Gera evento correspondente ao estado atual de cada sessao real (finalizada, cancelada ou pausada)
        INSERT INTO public.auditoria_evento (
            entidade, acao, origem, terapeuta_id, paciente_id, sessao_id, clinica_id,
            recurso_id, descricao, detalhes_json, created_at
        )
        SELECT
            'sessao',
            CASE
                WHEN s.status_sessao = 'finalizada' THEN 'sessao_finalizada'
                WHEN s.status_sessao = 'cancelada' THEN 'sessao_cancelada'
                WHEN s.status_sessao = 'pausada' THEN 'sessao_pausada'
                ELSE 'dispositivo_pareado'
            END,
            'terapeuta_web',
            s.terapeuta_id,
            s.paciente_id,
            s.id,
            COALESCE(p.clinica_id, t.clinica_id, v_clinica_id),
            s.id,
            CASE
                WHEN s.status_sessao = 'finalizada' THEN 'Sessão clínica finalizada com persistência no prontuário.'
                WHEN s.status_sessao = 'cancelada' THEN 'Sessão clínica cancelada.'
                WHEN s.status_sessao = 'pausada' THEN 'Sessão clínica pausada durante atendimento.'
                ELSE 'Sessão clínica em andamento.'
            END,
            jsonb_build_object(
                'status_sessao', s.status_sessao,
                'session_token', s.session_token,
                'jogo_id', s.jogo_id,
                'jogo_nome', j.nome
            ),
            COALESCE(s.data_hora_fim, s.updated_at, s.created_at + INTERVAL '5 minutes')
        FROM public.sessao s
        LEFT JOIN public.paciente p ON p.id = s.paciente_id
        LEFT JOIN public.terapeuta t ON t.id = s.terapeuta_id
        LEFT JOIN public.jogo j ON j.id = s.jogo_id
        WHERE s.status_sessao IN ('finalizada', 'cancelada', 'pausada')
          AND NOT EXISTS (
              SELECT 1 FROM public.auditoria_evento ae
              WHERE ae.sessao_id = s.id
                AND ae.acao IN ('sessao_finalizada', 'sessao_cancelada', 'sessao_pausada')
          );
    END IF;
END $$;

COMMIT;
