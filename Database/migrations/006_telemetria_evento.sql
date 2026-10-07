-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 006 - INGESTÃO E PERSISTÊNCIA DE TELEMETRIA (SPRINT 9)
-- ==============================================================================
-- TASK: BD/Back: Ingestão e Persistência de Eventos de Telemetria (Tipo: Feature)
-- RESPONSÁVEL: Marcos Willian (@MarcosWillianAP1K)
--
-- REQUISITOS E INVARIANTES ATENDIDOS:
-- - RF12: Ingestão, monitoramento contínuo e persistência de telemetria do jogo.
-- - RN01: Modo Livre não grava telemetria em prontuário (paciente_id = NULL / sem gravação).
-- - RN02: Tipagem estrita de métricas (id_metrica, valor_numerico ou valor_texto).
-- - RN05: Inalterabilidade do Histórico Clínico (soft_delete obrigatório e trigger de bloqueio).
-- - RNF05: Índices temporais otimizados por sessao_id e timestamp para leituras e dashboards.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: Criação da Tabela public.telemetria_evento
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telemetria_evento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID NOT NULL REFERENCES public.sessao(id) ON DELETE RESTRICT,
    paciente_id UUID REFERENCES public.paciente(id) ON DELETE RESTRICT,
    tipo_evento VARCHAR(50) NOT NULL, -- Ex: 'interacao_paciente', 'fase_concluida', 'metrica_jogo', 'sistema_tablet'
    id_metrica VARCHAR(100), -- Identificador da métrica declarada no manifesto do jogo (ex: 'tempo_resposta')
    valor_numerico NUMERIC, -- Valor numérico extraído para computação e agregação estatística direta
    valor_texto TEXT, -- Valor categórico/texto extraído (ex: 'baixo', 'medio', 'alto')
    dados JSONB DEFAULT '{}'::jsonb NOT NULL, -- Contrato 3 (telemetria.json): payload completo recebido do jogo
    data_hora TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL, -- Timestamp informado pelo tablet/jogo
    soft_delete BOOLEAN DEFAULT FALSE NOT NULL, -- Inalterabilidade clínica (RN05)
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- PASSO 2: Comentários Semânticos para Documentação do Schema (Supabase/PostgreSQL)
-- ------------------------------------------------------------------------------
COMMENT ON TABLE public.telemetria_evento IS 'Registros imutáveis de telemetria contínua capturados durante sessões de jogos terapêuticos (RF12, RN01, RN02, RN05).';
COMMENT ON COLUMN public.telemetria_evento.id IS 'Identificador único do evento de telemetria (UUID).';
COMMENT ON COLUMN public.telemetria_evento.sessao_id IS 'Chave estrangeira da sessão ativa à qual o evento pertence.';
COMMENT ON COLUMN public.telemetria_evento.paciente_id IS 'Chave estrangeira do paciente clínico atendido (nulo em modo livre).';
COMMENT ON COLUMN public.telemetria_evento.tipo_evento IS 'Categoria do evento de telemetria recebido do jogo ou tablet.';
COMMENT ON COLUMN public.telemetria_evento.id_metrica IS 'Identificador da métrica validada conforme o manifesto do jogo (RN02).';
COMMENT ON COLUMN public.telemetria_evento.valor_numerico IS 'Valor numérico associado à métrica para cálculos analíticos rápidos.';
COMMENT ON COLUMN public.telemetria_evento.valor_texto IS 'Valor categórico/textual da métrica (ex: nivel de estresse percebido).';
COMMENT ON COLUMN public.telemetria_evento.dados IS 'Payload JSONB original em conformidade com o Contrato 3 (telemetria.json).';
COMMENT ON COLUMN public.telemetria_evento.data_hora IS 'Instante exato em que o evento ocorreu no tablet do paciente.';
COMMENT ON COLUMN public.telemetria_evento.soft_delete IS 'Flag de exclusão lógica para preservação de histórico clínico (RN05).';

-- ------------------------------------------------------------------------------
-- PASSO 3: Índices de Otimização e Performance (RNF05 / Critério de Aceite)
-- ------------------------------------------------------------------------------
-- Índice temporal composto principal: busca cronológica rápida de eventos por sessão
CREATE INDEX IF NOT EXISTS idx_telemetria_sessao_data_hora 
    ON public.telemetria_evento(sessao_id, data_hora DESC);

-- Índice por sessão e métrica: filtragem por tipo de dado clínico (ex: gráficos de tempo_resposta)
CREATE INDEX IF NOT EXISTS idx_telemetria_sessao_metrica 
    ON public.telemetria_evento(sessao_id, id_metrica);

-- Índice por paciente: consultas consolidadas na linha do tempo do prontuário
CREATE INDEX IF NOT EXISTS idx_telemetria_paciente 
    ON public.telemetria_evento(paciente_id);

-- Índice de ordenação global por data/hora
CREATE INDEX IF NOT EXISTS idx_telemetria_data_hora 
    ON public.telemetria_evento(data_hora DESC);

-- ------------------------------------------------------------------------------
-- PASSO 4: Bloqueio de Hard Delete (Conformidade Estrita com a RN05)
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_bloqueio_delete_telemetria ON public.telemetria_evento;

CREATE TRIGGER trg_bloqueio_delete_telemetria
BEFORE DELETE ON public.telemetria_evento
FOR EACH ROW EXECUTE FUNCTION public.impedir_hard_delete_clinico();

-- ------------------------------------------------------------------------------
-- PASSO 5: Habilitação de RLS e Políticas de Acesso Seguro (Row Level Security)
-- ------------------------------------------------------------------------------
ALTER TABLE public.telemetria_evento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Consulta de telemetria clinica da sessao" ON public.telemetria_evento;
CREATE POLICY "Consulta de telemetria clinica da sessao"
ON public.telemetria_evento FOR SELECT
TO authenticated
USING (
    soft_delete = FALSE AND (
        EXISTS (
            SELECT 1 FROM public.sessao s
            WHERE s.id = telemetria_evento.sessao_id
              AND (
                  s.terapeuta_id = auth.uid() OR 
                  (s.paciente_id IS NOT NULL AND public.terapeuta_tem_acesso_paciente(s.paciente_id)) OR
                  public.check_is_super_admin()
              )
        )
    )
);

DROP POLICY IF EXISTS "Insercao de telemetria clinica autorizada" ON public.telemetria_evento;
CREATE POLICY "Insercao de telemetria clinica autorizada"
ON public.telemetria_evento FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sessao s
        WHERE s.id = telemetria_evento.sessao_id
          AND (
              s.terapeuta_id = auth.uid() OR
              public.check_is_super_admin()
          )
    )
);
