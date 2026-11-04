-- ==============================================================================
-- PROJETO InTEA: MIGRAÇÃO 009 - TRIGGER DE PROTEÇÃO E IMUTABILIDADE DO RELATÓRIO CLÍNICO (RN05 / RNF06)
-- ==============================================================================
-- Garante a inalterabilidade do histórico clínico do paciente em public.relatorio_sessao:
-- 1. Impede terminantemente qualquer instrução física de DELETE (RN05).
-- 2. Impede alteração do vínculo da sessão (sessao_id) e dados brutos da IA (dados_ia_json) após a consolidação (RNF06).
-- 3. Permite atualizações controladas no parecer técnico (conteudo) e flag de exclusão lógica (soft_delete).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.impedir_modificacao_relatorio_sessao()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Bloqueio absoluto de DELETE físico (RN05)
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Operacao proibida: Exclusao fisica de relatorio clinico e terminantemente vedada (RN05). O prontuario e inalteravel; utilize soft_delete = true.'
            USING ERRCODE = '23505';
    END IF;

    -- 2. Bloqueio de mutações não autorizadas em UPDATE (RN05 / RNF06)
    IF TG_OP = 'UPDATE' THEN
        -- Bloqueio de alteração do sessao_id (chave primária e integridade 1:1)
        IF NEW.sessao_id IS DISTINCT FROM OLD.sessao_id THEN
            RAISE EXCEPTION 'Operacao proibida: O identificador da sessao (sessao_id) em relatorio_sessao e imutavel (RN05 / RNF06).'
                USING ERRCODE = '23505';
        END IF;

        -- Bloqueio de alteração dos dados brutos consolidados da síntese de IA
        IF NEW.dados_ia_json IS DISTINCT FROM OLD.dados_ia_json THEN
            RAISE EXCEPTION 'Operacao proibida: Os dados consolidados da IA (dados_ia_json) sao estritamente imutaveis apos a criacao do relatorio (RN05 / RNF06).'
                USING ERRCODE = '23505';
        END IF;

        -- Atualiza automaticamente o timestamp de modificação caso campos permitidos sejam alterados
        NEW.updated_at := TIMEZONE('utc', NOW());
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove triggers legados ou pré-existentes para garantir idempotência
DROP TRIGGER IF EXISTS trg_bloqueio_delete_relatorio ON public.relatorio_sessao;
DROP TRIGGER IF EXISTS trg_bloqueio_relatorio_sessao ON public.relatorio_sessao;

-- Cria o trigger de proteção estrita em relatorio_sessao
CREATE TRIGGER trg_bloqueio_relatorio_sessao
    BEFORE UPDATE OR DELETE ON public.relatorio_sessao
    FOR EACH ROW
    EXECUTE FUNCTION public.impedir_modificacao_relatorio_sessao();

COMMENT ON FUNCTION public.impedir_modificacao_relatorio_sessao() IS 
    'Função de gatilho para rejeição de DELETE físico e proteção de integridade em sessao_id e dados_ia_json em relatorio_sessao (RN05, RNF06).';

COMMENT ON TRIGGER trg_bloqueio_relatorio_sessao ON public.relatorio_sessao IS 
    'Trigger de conformidade clínica que bloqueia exclusão física e modificações nos dados de IA em relatorio_sessao.';
