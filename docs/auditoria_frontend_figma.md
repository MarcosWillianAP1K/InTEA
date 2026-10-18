# Relatório de Auditoria Técnica do Front-End vs Design do Figma (Sprint 11)

> **Data:** 17/10/2026  
> **Arquivo Figma:** [InTEA (Kzj0RmD9TS4ZLwYrEVOI8N)](https://www.figma.com/design/Kzj0RmD9TS4ZLwYrEVOI8N/InTEA?m=auto&t=bdSSf9cWfbIj4sNJ-6)  
> **Responsáveis:** Hermeson Alves (`@Hermeson69`), Luma Maiara (`@lumamaiara`), Raildom Silva (`@Raildom`)  
> **Status:** ✅ Auditoria Concluída / Plano de Refatoração em Execução  

---

## 1. Contexto e Objetivo da Auditoria

Após a estabilização da arquitetura modular do front-end em `Frontend/src/features/`, foi identificada uma assimetria entre as telas implementadas e os componentes e Auto Layouts definidos no Figma. Além disso, remanescentes de refatorações passadas deixaram arquivos duplicados com nomenclatura mista (inglês e português), wrappers obsoletos e páginas estáticas desconectadas dos serviços de dados.

A presente auditoria inspecionou diretamente os nós da árvore do Figma via API REST oficial e mapeou cada frame existente no código atual, delimitando o plano de limpeza e refatoração.

---

## 2. Mapeamento de Telas: Figma vs Código Atual

| Tela / Recurso | ID no Figma | Arquivo Atual no Front-End | Diagnóstico e Ação de Refatoração |
| :--- | :---: | :--- | :--- |
| **Login** | `23:108` | `Frontend/src/features/autenticacao/` | Telas e formulários existentes; manter escopo sem expandir novas rotas. |
| **Dashboard (Painel)** | `57:190` | `Frontend/src/pages/PainelPage.tsx` e `features/painel/pages/dashboardPage.tsx` | **Crítico:** Tela atual continha apenas 3 cards estáticos ("24", "8", "3") sem integração. Refatorar para o layout do Figma: `Sessao paciente sumario` (highlight do paciente Pedro Oliveira), bloco de `Sessões` com cards de timers e status, e tabela resumida de `Meus Pacientes` com botão "+ Nova Sessão". Conectar ao `dashboard.service.ts`. |
| **Meus Pacientes** | `67:1404` / `94:1176` | `Frontend/src/features/paciente/components/ConteudoPacientes.tsx` | Refatorar para a grade de cards do Figma: `Card paciente` com layout exato, avatar, status, diagnóstico e ações ("Ver Perfil", "Iniciar Sessão"), e o botão em destaque `Card add paciente` ("+ Adicionar Paciente"). |
| **Cadastro de Paciente** | `100:1561` | `Frontend/src/features/paciente/components/ConteudoCriarPaciente.tsx` | Alinhar campos e tipografia com o layout do Figma (Nome, Data Nasc, CPF, Responsável, Telefone, Observações). |
| **Modal Pré-Sessão** | `87:708` | `Frontend/src/features/sessao/components/ModalPreSessao.tsx` | **Crítico:** Refatorar para o formato do Frame `Overlay Card sessao` (502px de largura): Header com fechar, Seção A: Contexto DDA, Seção B: Pareamento Remoto com código formatado `849-291`, e Rodapé com "Confirmar e Iniciar Intervenção". |
| **Biblioteca de Jogos** | `65:971` | `Frontend/src/features/jogos/pages/BibliotecaJogosPage.tsx` | Refatorar para o padrão `Game Row` (id `67:1251`), pílulas de filtro (`Button filtro`) e barra de busca estilizada. |
| **Relatório / Resultado** | `83:804` | `Frontend/src/features/sessao/pages/ResultadoSessaoPage.tsx` | Alinhar com o `Relatorio- InTEA` do Figma: Metrics Bento de 4 cards (Atenção, Precisão, Tempo de Reação, Intervenções DDA), divisão em 2 colunas com `AI Insight` e `Chart Section` (gráfico SVG), e editor de prontuário com anotações e autoria. |

> [!NOTE]
> **Invariante de Escopo:** Telas presentes no Figma que ainda não foram desenvolvidas ou planejadas para sprints vigentes (ex: telas avançadas de configurações institucionais ou relatórios de faturamento) **NÃO serão criadas nesta sprint**, respeitando o cronograma acadêmico oficial do InTEA.

---

## 3. Identificação de Arquivos Inúteis e Redundantes para Expurgo

Durante a auditoria, foram identificados os seguintes arquivos com duplicidade ou obsolescência:

1. **Wrappers em Inglês no Módulo de Pacientes (`Frontend/src/features/paciente/`):**
   * `components/patientCreateContent.tsx` *(duplica `ConteudoCriarPaciente.tsx`)*
   * `components/patientFormDialog.tsx` *(duplica `DialogFormularioPaciente.tsx`)*
   * `components/patientsContent.tsx` *(duplica `ConteudoPacientes.tsx`)*
   * `components/patientsList.tsx` *(duplica `ListaPacientes.tsx`)*
   * `store/patients.store.ts` *(duplica `paciente.store.ts`)*
   * `pages/patientsPage.tsx` *(duplica `PacientesPage.tsx`)*
2. **Duplicidade de Serviços de Autenticação (`Frontend/src/features/autenticacao/`):**
   * `service/auth.service.ts` *(duplica `services/auth.service.ts`)*
3. **Duplicidade de Componentes da Barra Lateral em Painel (`Frontend/src/features/painel/components/`):**
   * `app-sidebar.tsx`, `nav-button.tsx`, `nav-header.tsx`, `nav-main.tsx`, `nav-projects.tsx`, `nav-user.tsx` *(todos são re-exports vazios de `@/layout/components/`)*
4. **Duplicidade de Overlays Soltos em `Frontend/src/overlays/`:**
   * `DialogFormularioPaciente.tsx`, `ModalFinalizarSessao.tsx`, `ModalPreSessao.tsx` *(devem ser consumidos diretamente dos seus respectivos domínios em `features/sessao` e `features/paciente`)*

---

## 4. Auditoria de Variáveis de Ambiente e Mecanismo de Mock

### 4.1. Diagnóstico do `.env` Atual
* **`Frontend/.env`:**
  * Apresentava URLs e chaves de placeholder (`https://your-project.supabase.co`, `your-anon-key`).
  * Não possuía variável para habilitar/desabilitar dados simulados (`VITE_USE_MOCK_DATA`).
  * Não possuía declaração explícita de `VITE_WS_URL` para o WebSocket de telemetria.
* **`Backend/.env`:**
  * Devidamente configurado com porta 3000, CORS 5173, credenciais do Supabase e JWT_SECRET.

### 4.2. Ajustes Aplicados
Foram adicionadas ao `Frontend/.env` e `Frontend/.env.example`:
* `VITE_USE_MOCK_DATA=true`: Quando `true`, os serviços utilizam as fixtures estáticas de `bdmock.ts`. Quando `false`, chamam a API REST real do Backend.
* `VITE_WS_URL=http://localhost:3000`: URL do gateway WebSocket para conexão do Cockpit.
* `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` sincronizadas com as chaves reais do projeto.
