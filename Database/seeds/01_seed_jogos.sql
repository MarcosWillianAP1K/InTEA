-- ==============================================================================
-- PROJETO InTEA: SEED DE JOGOS TERAPÊUTICOS (CARD 2.4 - SPRINT 7)
-- Popula os 3 jogos de demonstração clínica de forma idempotente com UUIDs fixos
-- ==============================================================================

-- Jogo 1: Aventura das Cores
INSERT INTO public.jogo (id, nome, descricao, versao, status_jogo, manifesto_json)
VALUES (
    '11111111-1111-4111-8111-111111111111',
    'Aventura das Cores',
    'Estimula atenção compartilhada e reconhecimento facial através de interação cromática e emparelhamento de cores.',
    '1.2.0',
    'ativo',
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
)
ON CONFLICT (id) DO UPDATE 
SET 
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    versao = EXCLUDED.versao,
    status_jogo = EXCLUDED.status_jogo,
    manifesto_json = EXCLUDED.manifesto_json,
    updated_at = TIMEZONE('utc', NOW());

-- Jogo 2: Formas Calmas
INSERT INTO public.jogo (id, nome, descricao, versao, status_jogo, manifesto_json)
VALUES (
    '22222222-2222-4222-8222-222222222222',
    'Formas Calmas',
    'Foco em pareamento visual e regulação sensorial em ambiente desacelerado.',
    '2.0.0',
    'ativo',
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
)
ON CONFLICT (id) DO UPDATE 
SET 
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    versao = EXCLUDED.versao,
    status_jogo = EXCLUDED.status_jogo,
    manifesto_json = EXCLUDED.manifesto_json,
    updated_at = TIMEZONE('utc', NOW());

-- Jogo 3: Som dos Animais
INSERT INTO public.jogo (id, nome, descricao, versao, status_jogo, manifesto_json)
VALUES (
    '33333333-3333-4333-8333-333333333333',
    'Som dos Animais',
    'Associação auditivo-visual para desenvolvimento de linguagem e reconhecimento sonoro.',
    '1.0.0',
    'ativo',
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
)
ON CONFLICT (id) DO UPDATE 
SET 
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    versao = EXCLUDED.versao,
    status_jogo = EXCLUDED.status_jogo,
    manifesto_json = EXCLUDED.manifesto_json,
    updated_at = TIMEZONE('utc', NOW());

-- Jogo 4: Visita ao Dentista (Atividades de Vida Diária - AVD / Simulação de Rotina)
INSERT INTO public.jogo (id, nome, descricao, versao, status_jogo, manifesto_json)
VALUES (
    '44444444-4444-4444-8444-444444444444',
    'Visita ao Dentista',
    'Simulação de rotina prática para dessensibilização sensorial odontológica, estimulando previsibilidade e autorregulação em consultas reais.',
    '1.0.0',
    'ativo',
    '{
        "id_jogo": "visita-ao-dentista",
        "nome": "Visita ao Dentista",
        "versao": "1.0.0",
        "objetivo_clinico": "simulacao_rotina",
        "foco_pedagogico": "atividades_vida_diaria",
        "cooperativo": true,
        "adaptativo": true,
        "mecanicas": ["dessensibilizacao_sistematica", "estimulo_positivo", "adaptativo"],
        "metricas_suportadas": [
            {
                "id_metrica": "tempo_tolerancia",
                "tipo_metrica": "numerica",
                "unidade": "segundos"
            },
            {
                "id_metrica": "nivel_ansiedade",
                "tipo_metrica": "categorica",
                "valores": ["baixo", "moderado", "alto"]
            },
            {
                "id_metrica": "conclusao_etapas",
                "tipo_metrica": "numerica",
                "unidade": "etapas"
            }
        ]
    }'::jsonb
)
ON CONFLICT (id) DO UPDATE 
SET 
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    versao = EXCLUDED.versao,
    status_jogo = EXCLUDED.status_jogo,
    manifesto_json = EXCLUDED.manifesto_json,
    updated_at = TIMEZONE('utc', NOW());

-- Jogo 5: Ida ao Supermercado / Atacadão (Atividades de Vida Diária - AVD / Simulação de Rotina)
INSERT INTO public.jogo (id, nome, descricao, versao, status_jogo, manifesto_json)
VALUES (
    '55555555-5555-4555-8555-555555555555',
    'Ida ao Supermercado / Atacadão',
    'Treino prático de compras e interação em ambientes de grande porte, promovendo autonomia, planejamento de lista e tolerância a estímulos cotidianos.',
    '1.0.0',
    'ativo',
    '{
        "id_jogo": "ida-ao-supermercado",
        "nome": "Ida ao Supermercado / Atacadão",
        "versao": "1.0.0",
        "objetivo_clinico": "simulacao_rotina",
        "foco_pedagogico": "atividades_vida_diaria",
        "cooperativo": true,
        "adaptativo": true,
        "mecanicas": ["planejamento_executivo", "estimulo_positivo", "adaptativo"],
        "metricas_suportadas": [
            {
                "id_metrica": "itens_coletados",
                "tipo_metrica": "numerica",
                "unidade": "itens"
            },
            {
                "id_metrica": "tolerancia_estimulos",
                "tipo_metrica": "categorica",
                "valores": ["baixa", "moderada", "alta"]
            },
            {
                "id_metrica": "tempo_fila_espera",
                "tipo_metrica": "numerica",
                "unidade": "segundos"
            }
        ]
    }'::jsonb
)
ON CONFLICT (id) DO UPDATE 
SET 
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    versao = EXCLUDED.versao,
    status_jogo = EXCLUDED.status_jogo,
    manifesto_json = EXCLUDED.manifesto_json,
    updated_at = TIMEZONE('utc', NOW());

