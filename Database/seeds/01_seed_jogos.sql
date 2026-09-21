-- ==============================================================================
-- PROJETO InTEA: SEED DE JOGOS TERAPÊUTICOS (CARD 2.4 - SPRINT 7)
-- Popula os 3 jogos de demonstração de forma idempotente (sem duplicatas)
-- ==============================================================================

-- Jogo 1: Aventura das Cores
INSERT INTO public.jogo (nome, descricao, versao, status_instalacao, manifesto_json)
SELECT
    'Aventura das Cores',
    'Estimula atenção compartilhada e reconhecimento facial através de interação cromática e emparelhamento de cores.',
    '1.2.0',
    'instalado',
    '{
        "id_jogo": "aventura-das-cores",
        "nome": "Aventura das Cores",
        "versao": "1.2.0",
        "objetivo_clinico": "foco_atencional",
        "metricas_suportadas": [
            {
                "id_metrica": "tempo_resposta",
                "tipo_metrica": "numerica",
                "unidade": "segundos"
            },
            {
                "id_metrica": "nivel_frustracao",
                "tipo_metrica": "categorica",
                "valores": ["baixo", "medio", "alto"]
            }
        ]
    }'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.jogo WHERE nome = 'Aventura das Cores'
);

-- Jogo 2: Formas Calmas
INSERT INTO public.jogo (nome, descricao, versao, status_instalacao, manifesto_json)
SELECT
    'Formas Calmas',
    'Foco em pareamento visual e regulação sensorial em ambiente desacelerado.',
    '2.0.0',
    'instalado',
    '{
        "id_jogo": "formas-calmas",
        "nome": "Formas Calmas",
        "versao": "2.0.0",
        "objetivo_clinico": "regulacao_emocional",
        "metricas_suportadas": [
            {
                "id_metrica": "tempo_fixacao",
                "tipo_metrica": "numerica",
                "unidade": "segundos"
            },
            {
                "id_metrica": "estabilidade_toque",
                "tipo_metrica": "categorica",
                "valores": ["estavel", "instavel"]
            }
        ]
    }'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.jogo WHERE nome = 'Formas Calmas'
);

-- Jogo 3: Som dos Animais
INSERT INTO public.jogo (nome, descricao, versao, status_instalacao, manifesto_json)
SELECT
    'Som dos Animais',
    'Associação auditivo-visual para desenvolvimento de linguagem e reconhecimento sonoro.',
    '1.0.0',
    'instalado',
    '{
        "id_jogo": "som-dos-animais",
        "nome": "Som dos Animais",
        "versao": "1.0.0",
        "objetivo_clinico": "desenvolvimento_linguagem",
        "metricas_suportadas": [
            {
                "id_metrica": "precisao_auditiva",
                "tipo_metrica": "numerica",
                "unidade": "percentual"
            },
            {
                "id_metrica": "tolerancia_sonora",
                "tipo_metrica": "categorica",
                "valores": ["baixa", "moderada", "boa"]
            }
        ]
    }'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.jogo WHERE nome = 'Som dos Animais'
);
