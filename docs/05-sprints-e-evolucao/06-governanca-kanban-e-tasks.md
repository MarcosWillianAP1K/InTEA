# Governança do Kanban, Protocolo de Cards e Quality Gate — InTEA

> **Projeto:** InTEA — Interface do Terapeuta para Orquestração do Ecossistema de Games Terapêuticos  
> **Instituição:** Sistemas de Informação — Universidade Federal do Piauí (UFPI)  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf)  
> **Diretrizes de Governança:** [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md) (Seções 5 e 6)  
> **Hub de Navegação:** [Índice Geral](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/README.md)

---

## 1. Visão Geral e Filosofia de Governança

Para assegurar entregas consistentes, rastreabilidade acadêmica e mitigar riscos de regressão no código, todo o fluxo de trabalho do InTEA no **GitHub Projects** é regido por um protocolo rigoroso de engenharia de software.

> [!CAUTION]
> **A Regra de Ouro Inviolável do Kanban (Soberania do Usuário):**  
> É terminantemente **PROIBIDO** a qualquer agente de inteligência artificial marcar caixas de seleção de critérios de aceite (`[x]`) em arquivos de tasks, sprints ou documentação.  
> Todos os critérios de aceite DEVEM permanecer **sempre desmarcados (`[ ]`)** para que o próprio usuário realize a conferência, teste e validação manual no Git e no GitHub Projects.

---

## 2. Nomenclatura e Tipagem Canônica dos Cards

O título de qualquer card no GitHub Projects e nos documentos de sprint DEVE seguir estritamente a sintaxe:  
`Área: [Título Claro e Conciso da Tarefa] (Tipo: [Tipo])`  
*(Para correções de débitos técnicos: `Área: (Fix) [Título Claro] (Tipo: Fix)`)*

### 2.1. Prefixos de Área Permitidos:
* **`Back:`** — Serviços, controllers, middlewares e rotas REST do backend (`Backend/api/...`, `Backend/core/...`).
* **`BD:`** — Migrações DDL/DML, triggers e schemas de banco (`Database/migrations/...`, `Database/seeds/...`).
* **`BD/Back:`** — Tarefas integradas onde o mesmo desenvolvedor cria a migração e o model/serviço correspondente.
* **`Front:`** — Interfaces visuais, páginas mestre, componentes, hooks e stores (`Frontend/src/...`).
* **`Docs:`** — Documentação acadêmica, especificação OpenAPI, roteiro de testes e governança do Kanban.

### 2.2. Tipos de Card Permitidos:
* **`Feature`** — Nova funcionalidade de negócio, endpoint, componente visual ou regra operacional.
* **`Validação`** — Testes automatizados (Vitest), testes de segurança, validação de esquemas/DTOs e auditoria.
* **`Docs`** — Documentação técnica, especificações de contratos e casos de teste manuais.
* **`Fix`** — Correção de vulnerabilidades, débitos técnicos de sprints anteriores ou violações de regras clínicas (**RN01 a RN05**).

---

## 3. Template Obrigatório de Estrutura de Card

Todo card elaborado DEVE conter impreterivelmente os 8 campos padronizados:

```markdown
### Área: [Título da Tarefa] (Tipo: [Tipo])

* **Tipo:** [Feature | Validação | Docs | Fix]
* **Responsável:** [Nome do Integrante (@usuario_github)] | [Não atribuído (Backlog Arquitetural)]
* **Fronteira de Arquivos:** `caminho/arquivo1.ts`, `caminho/arquivo2.tsx` (lista exata de arquivos)
* **Ordem de Execução / Dependência:** [Independente | DEVE FAZER PRIMEIRO (Dias X-Y) | FAZ DEPOIS DE (Tarefa Z)]
* **Requisitos:** [RFxx, RNxx, RNFxx rastreados formalmente do documento mestre]
* **Referência Documentação:** [Seção, Tabela, Contrato JSON ou Figura do Projeto_de_InTEA.pdf]
* **Descrição:** [Explicação técnica detalhada da mecânica real: o que será construído, em qual camada e por quê]
* **Critérios de Aceite:**
  * [ ] [Critério 1 mensurável e testável]
  * [ ] [Critério 2 com códigos HTTP, regras de validação ou comportamentos visuais esperados]
  * [ ] [Critério 3 de conformidade com RNs e qualidade de código]
```

---

## 4. Distribuição por Responsabilidades (20 Cards por Sprint)

Cada sprint formal possui exatamente **20 cards principais** (4 por integrante) distribuídos de forma equilibrada entre os 5 membros:

1. **Back-end 1 — Marcos Willian (`@MarcosWillianAP1K`):** Modelagem relacional, `database.sql`, Models, Services, Controllers centrais, controle de permissões (**RN04**), soft delete (**RN05**) e testes REST no Vitest.
2. **Back-end 2 — João Marcos (`@JM3L0`):** WebSocket/Socket.IO, gateways em tempo real, streaming de telemetria, resiliência (reconexão 60s), rate limiting e exportação estruturada (**RF20**).
3. **Front-end 1 — Hermeson Alves (`@Hermeson69`):** Páginas Mestre centralizadas (`Frontend/src/pages/`), casca e layouts visuais (`SidebarLayout`, `FocusLayout`, Cockpit, Tela de Resultados, Pacientes), roteamento e orquestração de transições.
4. **Front-end 2 — Luma Maiara (`@lumamaiara`):** Modais e Overlays centralizados (`Frontend/src/pages/modal/`), componentes atômicos e especializados (`Frontend/src/features/*/components/`), cards de telemetria, gráficos SVG e testes de UI.
5. **Documentação / Qualidade — Raildom Silva (`@Raildom`):** Redação técnica, especificação OpenAPI/Swagger, roteiro de testes manuais formais e governança operacional do GitHub Projects.

---

## 5. Protocolo Anti-Conflito e Algoritmo de Sequenciamento

Para extinguir conflitos de merge no Git e bloqueios mútuos, todo planejamento de sprint aplica quatro regras estritas:

### Regra 1: Dependência Vertical (Banco $\rightarrow$ Backend REST $\rightarrow$ Consumidor WebSocket / Front)
* Quem cria a migration SQL ou model de dados **DEVE FAZER PRIMEIRO (Dias 1 a 2)**.
* Serviços consumidores trabalham nos Dias 1 a 3 com stubs/mocks desacoplados em memória. No **Dia 4**, realizam a importação da função real entregue.

### Regra 2: Dependência Horizontal no Frontend (Componentes Atômicos $\rightarrow$ Página Mestre)
* O desenvolvedor de componentes atômicos constrói cards e gráficos isoladamente na pasta `components/` nos **Dias 1 a 3**.
* O desenvolvedor da página mestre constrói o layout na pasta `pages/` deixando slots visuais (placeholders).
* No **Dia 4/5**, o dono da página mestre importa os componentes prontos nos slots. **Somente o dono da página edita o arquivo da página**.

### Regra 3: Fronteira Exclusiva e Isolamento por Módulos
* Todo card declara sua fronteira de arquivos. É proibido comitar alterações em arquivos sob responsabilidade de outro desenvolvedor.
* Regras complementares devem ser criadas em arquivos novos e módulos irmãos (ex.: `socket.limiter.ts`, `sessao.reconnection.ts`).

### Regra 4: Linha do Tempo Semanal Padronizada
* **Dias 1 e 2 (Fundação):** Sincronização do Kanban, migrações de banco, DTOs e casca de páginas.
* **Dias 3 e 4 (Desenvolvimento e Integração):** Integração dos serviços com persistência e componentes nas telas.
* **Dia 5 (Hardening e Auditoria):** Rotinas de auditoria, exportação de laudos (RF20) e proteção de autorização (RN04 / 403).
* **Dia 6 (Qualidade e Fechamento):** Execução de testes Vitest (100% verde mandatório), compilação do relatório e PRs finais.

---

## 6. Checklist de Validação de Qualidade de Pré-Criação (Quality Gate)

Antes de aprovar ou cadastrar novos cards no repositório, verifique:
1. [ ] Há exatamente 4 cards para cada um dos 5 membros (total de 20 cards)?
2. [ ] Todos os cards seguem a nomenclatura `Área: [Título] (Tipo: [Tipo])`?
3. [ ] Cada card possui os 8 campos obrigatórios e critérios de aceite mensuráveis?
4. [ ] A fronteira de arquivos está estritamente delimitada sem sobreposição entre membros?
5. [ ] A ordem de execução indica claramente se o card é independente ou sua dependência sequencial?
6. [ ] Há rastreabilidade formal com os RFs, RNs e RNFs do Documento Mestre?
7. [ ] Cards extras do backlog arquitetural estão com `Responsável: Não atribuído`?
8. [ ] Todas as caixas de critérios de aceite permanecem desmarcadas (`[ ]`)?
