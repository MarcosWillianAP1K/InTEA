# Anotações Técnicas e Alinhamento de Modelagem Clínica

> **Data:** 13/10/2026  
> **Módulo:** Banco de Dados / Sessão / Relatório Clínico  
> **Destinatários:** Equipe InTEA, com destaque para `@Raildom` (Documentação LaTeX, OpenAPI e Casos de Teste) e `@MarcosWillianAP1K` (Back-end 1 / BD)

---

## 1. Diretriz Mandatória sobre Modo Livre (RN01)

### O Princípio Clínico e Operacional
* **Partidas em Modo Livre NÃO geram, NÃO processam e NÃO persistem relatórios clínicos nem telemetria.**
* **Justificativa Clínica:** O Modo Livre (`modo_sessao = 'modo_livre'`) existe para uso desvinculado de prontuário (calibração de jogo, demonstração institucional, ambientação do paciente ou jogo recreativo avulso). Nessas partidas, `paciente_id` é estritamente `NULL`.
* **Sem Violação de Prontuário:** Um relatório clínico no InTEA é um documento médico/terapêutico com valor formal. Não faz sentido clínico ou jurídico emitir parecer ou laudo de IA para uma entidade sem paciente.
* **Comportamento da API:** No encerramento de sessão em Modo Livre (`PATCH /api/sessao/:id/finalizar`), a sessão transiciona para `finalizada`, mas o campo `relatorio` é retornado como `undefined`/`null`, e nenhuma linha é inserida na tabela `public.relatorio_sessao`.

---

## 2. Normalização 3FN da Tabela `public.relatorio_sessao`

### Decisão Arquitetural e Chave Primária Compartilhada
1. **Relação Existencial de 1:1:** Uma sessão clínica finalizada possui no máximo um relatório. Portanto, a chave primária da tabela `relatorio_sessao` é a própria chave estrangeira da sessão pai:
   $$\text{PK} = \text{FK} = \text{sessao\_id UUID PRIMARY KEY REFERENCES public.sessao(id) ON DELETE RESTRICT}$$
2. **Eliminação do ID Artificial:** A coluna substituta `id UUID` foi eliminada da modelagem de banco, simplificando a integridade referencial e removendo índices únicos redundantes.
3. **Remoção das Colunas Redundantes (3FN Pura):**
   * As colunas `paciente_id` e `terapeuta_id` foram **definitivamente removidas** da tabela `relatorio_sessao`.
   * Toda consulta ao paciente, terapeuta ou clínica responsável pelo relatório deve ser resolvida via `JOIN` natural com a tabela pai `public.sessao`.
4. **Estrutura Final Saneada:**
   * `sessao_id UUID PRIMARY KEY REFERENCES public.sessao(id)`
   * `conteudo TEXT` (parecer técnico e anotações do terapeuta)
   * `dados_ia_json JSONB` (Contrato 4 oficial da IA)
   * `soft_delete BOOLEAN DEFAULT FALSE NOT NULL` (RN05)
   * `created_at TIMESTAMPTZ`
   * `updated_at TIMESTAMPTZ`

---

## 3. Segurança e Políticas RLS (Row Level Security)

* **Delegação via Subquery `EXISTS`:**
  As políticas de `SELECT`, `INSERT` e `UPDATE` de `relatorio_sessao` agora consultam a tabela pai `sessao` de forma determinística:
  ```sql
  EXISTS (
      SELECT 1 FROM public.sessao s
      WHERE s.id = relatorio_sessao.sessao_id
        AND (
            s.terapeuta_id = auth.uid() OR 
            (s.paciente_id IS NOT NULL AND public.terapeuta_tem_acesso_paciente(s.paciente_id)) OR
            public.check_is_super_admin()
        )
  )
  ```
* **Bypass de Inserção:** Permite que o terapeuta responsável pela sessão (ou SuperAdmin) insira ou edite o parecer consolidado.

---

## 4. Ações Requeridas para o Responsável de Documentação (`@Raildom`)

1. **Especificação OpenAPI / Swagger (`docs/api-pacientes-jogos.md`):**
   * Assegurar que o esquema de dados do relatório identifique o relatório por `sessao_id` como âncora principal.
   * Documentar no endpoint `GET /api/sessao/:id/resultado` e `PATCH /api/sessao/:id/finalizar` que o retorno para Modo Livre possui `paciente: null` e omite `relatorio`.
2. **Roteiro de Testes Manuais (`docs/roteiro-testes.md`):**
   * Nos casos de teste de Modo Livre (ex: `CT-S05` / `CT-S16`), explicitar que o resultado esperado é a ausência de persistência na tabela `relatorio_sessao`.
3. **Capítulo LaTeX Oficial (`docs/*.tex`):**
   * No DER (Diagrama Entidade-Relacionamento) e no Dicionário de Dados, atualizar a tabela `relatorio_sessao` com `sessao_id` como PK compartilhada (relação 1:1) e sem as colunas redundantes `paciente_id` e `terapeuta_id`.
