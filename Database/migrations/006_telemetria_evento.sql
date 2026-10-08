-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 006 - INGESTÃO E PERSISTÊNCIA DE TELEMETRIA (SPRINT 9)
-- ==============================================================================
-- TASK: BD/Back: Ingestão e Persistência de Eventos de Telemetria (Tipo: Feature)
-- RESPONSÁVEL: Marcos Willian (@MarcosWillianAP1K)
--
-- ESPECIFICAÇÃO DO CONTRATO 3 (docs/ModelosDeContratos/telemetria.json):
-- {
--   "token_sessao": "a1b2c3d4-token",
--   "data_hora": "2026-09-01T15:30:22Z",
--   "tipo_evento": "interacao_paciente",
--   "dados": {
--     "id_metrica": "tempo_resposta",
--     "valor": 3.5
--   }
-- }
--
-- MODELAGEM MINIMALISTA E POLIMÓRFICA:
-- - A telemetria vincula-se unicamente a sessao_id (o paciente já está na sessão).
-- - Os valores da métrica residem dentro de dados (JSONB), suportando qualquer tipo
--   (numérico, categórico, array, etc.) validado contra o manifesto do jogo (RN02).
-- - Tabela append-only (sem soft delete ou created_at redundante).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: Criação da Tabela public.telemetria_evento (se não existir)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telemetria_evento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID NOT NULL REFERENCES public.sessao(id) ON DELETE RESTRICT,
    tipo_evento VARCHAR(50) NOT NULL, -- Ex: 'interacao_paciente', 'metrica_jogo', 'sistema_tablet'
    dados JSONB DEFAULT '{}'::jsonb NOT NULL, -- Contrato 3: { "id_metrica": "...", "valor": ... }
    data_hora TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- PASSO 2: Limpeza Prévia de Políticas, Triggers e Índices Dependentes
-- (Necessário executar ANTES do DROP COLUMN para evitar erro de dependência 2BP01)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Consulta de telemetria clinica da sessao" ON public.telemetria_evento;
DROP POLICY IF EXISTS "Consulta de telemetria da sessao" ON public.telemetria_evento;
DROP POLICY IF EXISTS "Insercao de telemetria clinica autorizada" ON public.telemetria_evento;
DROP POLICY IF EXISTS "Insercao de telemetria autorizada" ON public.telemetria_evento;

DROP TRIGGER IF EXISTS trg_bloqueio_delete_telemetria ON public.telemetria_evento;
DROP INDEX IF EXISTS public.idx_telemetria_paciente;
DROP INDEX IF EXISTS public.idx_telemetria_sessao_metrica;

-- ------------------------------------------------------------------------------
-- PASSO 3: Limpeza Idempotente de Colunas Desnecessárias
-- ------------------------------------------------------------------------------
ALTER TABLE public.telemetria_evento
    DROP COLUMN IF EXISTS paciente_id CASCADE,
    DROP COLUMN IF EXISTS id_metrica CASCADE,
    DROP COLUMN IF EXISTS valor_numerico CASCADE,
    DROP COLUMN IF EXISTS valor_texto CASCADE,
    DROP COLUMN IF EXISTS soft_delete CASCADE,
    DROP COLUMN IF EXISTS created_at CASCADE;

-- ------------------------------------------------------------------------------
-- PASSO 4: Comentários Semânticos de Documentação
-- ------------------------------------------------------------------------------
COMMENT ON TABLE public.telemetria_evento IS 'Stream append-only de telemetria clínica das sessões terapêuticas (RF12, RN01, RN02).';
COMMENT ON COLUMN public.telemetria_evento.id IS 'Identificador único do evento de telemetria (UUID).';
COMMENT ON COLUMN public.telemetria_evento.sessao_id IS 'Chave estrangeira da sessão ativa à qual o evento pertence.';
COMMENT ON COLUMN public.telemetria_evento.tipo_evento IS 'Categoria do evento de telemetria emitido pelo tablet ou jogo.';
COMMENT ON COLUMN public.telemetria_evento.dados IS 'Payload JSONB bruto com id_metrica e valor polimórfico (Contrato 3).';
COMMENT ON COLUMN public.telemetria_evento.data_hora IS 'Timestamp oficial da ocorrência do evento de telemetria.';

-- ------------------------------------------------------------------------------
-- PASSO 5: Índices de Otimização e Performance (RNF05 / Consultas Rápidas)
-- ------------------------------------------------------------------------------
-- 1. Busca temporal por sessão (leitura ordenada para o Cockpit do terapeuta)
CREATE INDEX IF NOT EXISTS idx_telemetria_sessao_data_hora 
    ON public.telemetria_evento(sessao_id, data_hora DESC);

-- 2. Filtro rápido por tipo de evento
CREATE INDEX IF NOT EXISTS idx_telemetria_tipo_evento 
    ON public.telemetria_evento(tipo_evento);

-- 3. Índice de expressão em dados->>'id_metrica' (pesquisa imediata de métricas sem coluna física)
CREATE INDEX IF NOT EXISTS idx_telemetria_id_metrica 
    ON public.telemetria_evento ((dados->>'id_metrica'));

-- 4. Índice GIN sobre o payload JSONB (suporte a consultas arbitrárias e agregações)
CREATE INDEX IF NOT EXISTS idx_telemetria_dados_gin 
    ON public.telemetria_evento USING gin (dados);

-- ------------------------------------------------------------------------------
-- PASSO 6: Habilitação de RLS e Políticas de Acesso Seguro (Row Level Security)
-- ------------------------------------------------------------------------------
ALTER TABLE public.telemetria_evento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consulta de telemetria da sessao"
ON public.telemetria_evento FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sessao s
        WHERE s.id = telemetria_evento.sessao_id
          AND (
              s.terapeuta_id = auth.uid() OR 
              (s.paciente_id IS NOT NULL AND public.terapeuta_tem_acesso_paciente(s.paciente_id)) OR
              public.check_is_super_admin()
          )
    )
);

CREATE POLICY "Insercao de telemetria autorizada"
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
