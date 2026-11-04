# Roteiro de Testes Manuais e Homologação Clínica — InTEA

> **Projeto:** InTEA — Interface do Terapeuta para Orquestração do Ecossistema de Games Terapêuticos  
> **Instituição:** Sistemas de Informação — Universidade Federal do Piauí (UFPI)  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf)  
> **Roteiro Completo de Casos:** [roteiro-testes.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/roteiro-testes.md)  
> **Hub de Navegação:** [Índice Geral](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/README.md)

---

## 1. Visão Geral e Protocolo de Execução

O **Roteiro de Testes Manuais** estabelece o protocolo de validação de ponta a ponta (E2E) e critérios de aceite clínicos formais do InTEA. Os casos cobrem fluxos positivos (caminho feliz) e negativos (segurança, bloqueios de regra de negócio e anti-IDOR).

> [!IMPORTANT]
> **Regra de Homologação Soberana:** Todas as caixas de verificação (`[ ]`) permanecem estritamente desmarcadas para validação manual exclusiva pelo testador ou usuário.

* **Base URL Padrão:** `http://localhost:3000/api`
* **Ambiente de Testes:** Postman, Insomnia ou interface Swagger UI (`http://localhost:3000/api/docs`).

---

## 2. Matriz Geral dos 61 Casos de Teste Formais

| Código | Módulo / Domínio | Título do Caso de Teste | Requisitos Validados | Status |
| :---: | :--- | :--- | :--- | :---: |
| **CT-P01** | Paciente | Cadastro de Paciente com Dados Completos | RF06 | `[ ]` |
| **CT-P02** | Paciente | Rejeição de CPF Inválido | RF06 | `[ ]` |
| **CT-P03** | Paciente | Conflito por CPF Já Cadastrado | RF06 | `[ ]` |
| **CT-P04** | Paciente | Listagem Padrão Exclui Pacientes Inativados | RF06, RN05 | `[ ]` |
| **CT-P05** | Paciente | Busca por Nome e Faixa Etária com Paginação | RF19 | `[ ]` |
| **CT-P06** | Paciente | Consulta de Prontuário com Vínculo Ativo | RN04 | `[ ]` |
| **CT-P07** | Paciente | Bloqueio de Acesso sem Vínculo Ativo | RN04 | `[ ]` |
| **CT-P08** | Paciente | Bloqueio por JWT Ausente ou Inválido | RF01, RNF06 | `[ ]` |
| **CT-P09** | Paciente | Soft Delete: Inativação sem Exclusão Física | RN05 | `[ ]` |
| **CT-P10** | Paciente | Reativação de Paciente Inativo | RF06 | `[ ]` |
| **CT-P11** | Paciente | Vínculo de Terapeuta ao Paciente | RF18 | `[ ]` |
| **CT-P12** | Paciente | Bloqueio de Vínculo entre Clínicas Distintas | RN04 | `[ ]` |
| **CT-P13** | Paciente | Bloqueio de Vínculo com Paciente Inativo | RN05 | `[ ]` |
| **CT-P14** | Paciente | Atualização Parcial de Dados do Paciente | RF06 | `[ ]` |
| **CT-P15** | Paciente | Rejeição de UUID Malformado na Rota | RNF06 | `[ ]` |
| **CT-J01** | Jogos | Listagem do Catálogo Completo de Jogos | RF09 | `[ ]` |
| **CT-J02** | Jogos | Filtro por Objetivo Clínico | RF09, RF19 | `[ ]` |
| **CT-J03** | Jogos | Filtro com Objetivo Inexistente | RF19 | `[ ]` |
| **CT-J04** | Jogos | Paginação da Biblioteca de Jogos | RF19 | `[ ]` |
| **CT-J05** | Jogos | Consulta de Detalhes com Manifesto JSON | RF09, Contrato 1 | `[ ]` |
| **CT-J06** | Jogos | Retorno 404 para Jogo Inexistente | RNF06 | `[ ]` |
| **CT-J07** | Jogos | Validação de Manifesto Conforme | RNF02 | `[ ]` |
| **CT-J08** | Jogos | Rejeição de Manifesto com Métrica sem Tipo | RN02 | `[ ]` |
| **CT-J09** | Jogos | Telemetria Aprovada para Gravação | RN02, Contrato 2 | `[ ]` |
| **CT-J10** | Jogos | Bloqueio de Telemetria com Tipo Incompatível (422) | RN02 | `[ ]` |
| **CT-J11** | Jogos | Bloqueio de Telemetria com Valor Fora do Domínio | RN02 | `[ ]` |
| **CT-J12** | Jogos | Manifesto com Laudo de Conformidade | RNF02 | `[ ]` |
| **CT-S01** | Sessão | Pareamento Remoto com Handshake e WebSocket | RF10, RNF01 | `[ ]` |
| **CT-S02** | Sessão | Normalização Automática de Token com Espaços | RF10 | `[ ]` |
| **CT-S03** | Sessão | Rejeição de Token com TTL Expirado (410 Gone) | RF10, RNF03 | `[ ]` |
| **CT-S04** | Sessão | Rejeição de Token Inexistente ou Incorreto | RF10 | `[ ]` |
| **CT-S05** | Sessão | Rejeição de Pareamento Concorrente | RF10 | `[ ]` |
| **CT-S06** | Sessão | Monitoramento de Queda de Conexão e Heartbeat | RNF04 | `[ ]` |
| **CT-S07** | Sessão | Início de Sessão Clínica com Injeção DDA | RF17, RN03 | `[ ]` |
| **CT-S08** | Sessão | Ingestão de Telemetria com Persistência | RF12, Contrato 2 | `[ ]` |
| **CT-S09** | Sessão | Ingestão em Lote de Telemetria (Batch Insert) | RNF01, RNF05 | `[ ]` |
| **CT-S10** | Sessão | Supressão de Telemetria em Modo Livre | RN01, RF11 | `[ ]` |
| **CT-S11** | Sessão | Canal de Comandos do Terapeuta no WebSocket | RF13, RF21 | `[ ]` |
| **CT-S12** | Sessão | Rate Limiting e Prevenção de Flood de Socket | RNF01, RNF03 | `[ ]` |
| **CT-S13** | Sessão | Janela de Tolerância de 60s em Queda Transitória | RNF03 | `[ ]` |
| **CT-S14** | Sessão | Encerramento Formal e Síntese de Auditoria | RF13, RF21, RN05 | `[ ]` |
| **CT-S15** | Sessão | Consulta Consolidada dos Resultados da Sessão | RF14, Contrato 4 | `[ ]` |
| **CT-S16** | Sessão | Supressão de Relatório Clínico em Modo Livre | RN01, RF11 | `[ ]` |
| **CT-S17** | Sessão | Bloqueio de Resultados por Falta de Vínculo | RN04 | `[ ]` |
| **CT-S18** | Sessão | Rejeição de Consulta para Sessão em Andamento | RF14 | `[ ]` |
| **CT-S19** | Sessão | Validação Estrutural da Modelagem 3FN | 3FN, RN05 | `[ ]` |
| **CT-S20** | Sessão | Registro de Parecer e Anotações Pós-Sessão | RF16, RF21 | `[ ]` |
| **CT-S21** | Sessão | Imutabilidade e Bloqueio de Hard Delete | RN05 | `[ ]` |
| **CT-S22** | Sessão | Exportação de Relatório Clínico em PDF | RF20 | `[ ]` |
| **CT-S23** | Histórico | Consulta do Histórico Longitudinal com Engajamento Geral | RF15, RNF04 | `[ ]` |
| **CT-S24** | Histórico | Troca do Seletor de Jogo Retorna Série Temporal Específica | RF15, RNF04 | `[ ]` |
| **CT-S25** | Histórico | Filtragem por Intervalo de Datas e Paginação | RF19 | `[ ]` |
| **CT-S26** | Histórico | Rejeição de Métrica sem Tipagem no Manifesto (422) | RN02 | `[ ]` |
| **CT-S27** | Histórico | Bloqueio de Acesso ao Histórico sem Vínculo Ativo (403) | RN04 | `[ ]` |
| **CT-S28** | Histórico | Supressão Comprovada de Sessões em Modo Livre | RN01, RF15 | `[ ]` |
| **CT-S29** | Anotações | Registro de Anotação Clínica com Autoria Indelével | RF16, RF21, RN04 | `[ ]` |
| **CT-S30** | Anotações | Bloqueio de Edição e Exclusão por Terapeuta não Autor | RF21, RN04 | `[ ]` |
| **CT-S31** | Anotações | Filtragem Longitudinal, Soft Delete e Reativação de Nota | RF19, RN05 | `[ ]` |
| **CT-S32** | Contexto DDA | Configuração Personalizada de Contexto Pré-Sessão | RF17, RN03, Contrato 2 | `[ ]` |
| **CT-S33** | Contexto DDA | Início de Sessão com Fallback Clínico Parametrizado | RF17, Figura 5 | `[ ]` |
| **CT-S34** | Modo Livre | Rejeição de Contexto Clínico ou Anotação em Modo Livre | RN01 | `[ ]` |

---

## 3. Detalhamento de Casos Críticos de Negócio

### CT-P06 — Consulta de Prontuário com Vínculo Ativo (RN04)
* **Objetivo:** Garantir que o terapeuta acesse o prontuário de paciente pertencente à mesma clínica com vínculo em `terapeuta_paciente`.
* **Entrada:** `GET /api/paciente/:id` com token JWT do terapeuta vinculado.
* **Resultado Esperado:** HTTP `200 OK`, retorno dos dados cadastrais, responsáveis e histórico de atendimentos.

### CT-P07 — Bloqueio de Acesso sem Vínculo Ativo (RN04)
* **Objetivo:** Impedir que terapeuta acesse prontuário de paciente com o qual não possui vínculo ativo.
* **Entrada:** `GET /api/paciente/:id` com token de terapeuta da mesma clínica sem vínculo no paciente alvo.
* **Resultado Esperado:** HTTP `403 Forbidden`, mensagem de erro de autorização sem vazamento de dados.

### CT-J08 — Rejeição de Manifesto com Métrica sem Tipo (RN02)
* **Objetivo:** Garantir a proibição absoluta de fallback automático para métricas sem tipo.
* **Entrada:** `POST /api/jogos` enviando manifesto omitindo `tipo_metrica`.
* **Resultado Esperado:** HTTP `422 Unprocessable Entity`, recusa formal da inclusão do jogo.

### CT-S10 — Supressão Mandatória de Telemetria em Modo Livre (RN01)
* **Objetivo:** Garantir que partidas recreativas não gravem dados em prontuários.
* **Entrada:** Envio de pacotes de telemetria em sessão com `modo_sessao = 'modo_livre'`.
* **Resultado Esperado:** Descarte silencioso pelo gateway ou confirmação de recepção em memória sem gravação no banco relacional (`paciente_id = NULL`).

### CT-S19 — Validação Estrutural da Modelagem 3FN da Tabela `relatorio_sessao`
* **Objetivo:** Comprovar a eliminação de dependências transitivas e redundâncias.
* **Entrada:** Inspeção DDL da tabela no banco PostgreSQL.
* **Resultado Esperado:** `sessao_id UUID PRIMARY KEY REFERENCES sessao(id)`, ausência de colunas duplicadas `paciente_id` e `terapeuta_id`.

### CT-S29 — Registro de Anotação Clínica com Autoria Indelével do Autor (RF16, RF21)
* **Objetivo:** Garantir que o nome, conselho profissional (CREFITO/CRP) e especialidade do terapeuta autor acompanhem a nota clínica, banindo UUIDs crus na interface.
* **Entrada:** `POST /api/anotacao` enviando `paciente_id`, `sessao_id` e `conteudo`.
* **Resultado Esperado:** HTTP `201 Created` e retorno do bloco `autor: { id, nome, registro_profissional, crefito, especialidade }`.

### CT-S30 — Bloqueio de Edição e Exclusão por Terapeuta não Autor (RF21, RN04)
* **Objetivo:** Impedir adulteração ou exclusão de anotações médicas por outros terapeutas da clínica.
* **Entrada:** `PATCH /api/anotacao/:id` ou `DELETE /api/anotacao/:id` acionado por terapeuta distinto do autor original.
* **Resultado Esperado:** HTTP `403 Forbidden` com preservação inalterada do texto e status no banco relacional.

### CT-S31 — Filtragem Longitudinal, Soft Delete e Reativação de Anotação (RF19, RN05)
* **Objetivo:** Validar o ciclo de vida completo: filtros combinados, inativação lógica segura e restauração com `soft_delete: false`.
* **Entrada:** `GET /api/anotacao/paciente/:id` com query params, seguido de `DELETE /:id` e `PATCH /:id/reativar`.
* **Resultado Esperado:** HTTP `200 OK` em todas as etapas, com o registro mantido no banco e reativado sob auditoria.

### CT-S32 — Configuração Personalizada do Contexto DDA Pré-Sessão (RF17, RN03, Contrato 2)
* **Objetivo:** Validar o envio de estresse (escala 1 a 5), gatilhos sensoriais e objetivo clínico, entregando o pacote ao socket antes do 1º evento de telemetria.
* **Entrada:** `POST /api/sessao/iniciar` com `contexto_dda_json` estruturado.
* **Resultado Esperado:** HTTP `201 Created`, mapeamento determinístico para escala canônica e transmissão prévia no handshake (RN03).

### CT-S33 — Início de Sessão com Fallback Clínico Parametrizado (RF17, Figura 5)
* **Objetivo:** Validar a herança automática de gatilhos do prontuário (`dados_clinicos` / `paciente_gatilho`) e estresse baixo quando o terapeuta aciona os parâmetros padrão.
* **Entrada:** `POST /api/sessao/iniciar` com `usar_fallback_padrao: true` ou parâmetros omitidos.
* **Resultado Esperado:** HTTP `201 Created`, calibração do Agente de IA com `nivel_estresse_inicial: "baixo"` e gatilhos da anamnese.

### CT-S34 — Rejeição de Injeção de Contexto ou Anotação em Modo Livre (RN01)
* **Objetivo:** Garantir que partidas recreativas não possam ser contaminadas com contexto clínico de pacientes ou registros em prontuário.
* **Entrada:** `POST /api/sessao/iniciar` ou `POST /api/anotacao` vinculados a sessões com `modo_sessao: "modo_livre"`.
* **Resultado Esperado:** HTTP `400 Bad Request` com recusa formal e proteção de privacidade dos prontuários.

---

## 4. Guia de Homologação Manual para o Usuário

Para o passo a passo completo de execução com exemplos de payloads JSON para cada um dos 61 casos, consulte o documento integral em [`docs/roteiro-testes.md`](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/roteiro-testes.md).
