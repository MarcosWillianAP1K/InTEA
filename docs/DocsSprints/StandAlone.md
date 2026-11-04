# Backlog de Tarefas Stand-Alone — InTEA (Escopo Futuro / Projeto Separado)

> **Diretório:** `docs/DocsSprints/StandAlone.md`  
> **Status:** Desacoplado do fluxo de Sprints do núcleo do InTEA  
> **Documento Mestre do Projeto:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf)  
> **Diretrizes e Regras Arquiteturais:** [AGENTS.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/AGENTS.md)  
> **Hub de Sprints:** [visao_geral.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/DocsSprints/visao_geral.md)  

---

## 1. Contexto e Motivação do Desacoplamento

Este arquivo armazena funcionalidades e tarefas técnicas que foram deliberadamente **segregadas das Sprints regulares** do ecossistema InTEA.

O objetivo do isolamento destas tarefas é:
1. **Preservar o Escopo do MVP Clínico:** Manter o foco da equipe principal na entrega dos fluxos clínicos essenciais (gestão de pacientes, prontuário longitudinal, injeção de contexto DDA, supervisão via cockpit em tempo real e conformidade institucional multi-terapeuta).
2. **Viabilidade Técnica Especializada:** Funcionalidades que demandam hardware específico (headsets de Realidade Virtual/VR) ou regras de acesso externas ao consultório (aplicativo doméstico com controle parental de tempo de tela) poderão ser implementadas posteriormente ou desenvolvidas em repositórios/projetos satélites dedicados.

---

## 2. Cards de Tarefas Stand-Alone

---

### Docs/Back: Suporte a Jogos em Realidade Virtual VR (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Projeto Separado / Stand-Alone)
* **Fronteira de Arquivos:** `docs/api-pacientes-jogos.md`, `docs/manifesto-vr-spec.md`, `Backend/core/contracts/manifesto.schema.ts`, `Backend/core/websocket/telemetria.types.ts`
* **Ordem de Execução / Dependência:** Independente / Execução futura em projeto ou módulo de Realidade Virtual (VR/XR)
* **Requisitos:** RNF02 (Modularidade por Contrato), RNF03 (Segurança e Desempenho em Tempo Real)
* **Referência Documentação:** Orientação Terapeuta & Marcos, RNF02, Seção 4 (Arquitetura de Jogos e Manifesto)
* **Descrição:** Adequar a arquitetura de contratos do manifesto e o fluxo de pareamento para permitir integração com jogos executados em dispositivos de Realidade Virtual (VR/XR / Meta Quest / SteamVR). Inclui a extensão da especificação JSON do manifesto do jogo para declarar capacidades imersivas (6DoF, rastreamento de cabeça/olhar, gatilhos de conforto visual), validação tipada de métricas tridimensionais sem fallback automático (**RN02**) e protocolo de pareamento remoto via `session_token` adaptado à interface imersiva.
* **Critérios de Aceite:**
  * [ ] Manifesto do jogo suporta especificação formal de plataforma VR/XR e requisitos de hardware.
  * [ ] Contrato documentado com exemplos de métricas imersivas (orientação espacial, taxa de fixação ocular, amplitude de movimento).
  * [ ] Fluxo de pareamento via token compatível com entrada de dados sem teclado físico em headsets VR.
  * [ ] Validação estrita de telemetria imersiva rejeitando tipos não mapeados com código `422 Unprocessable Entity` (**RN02**).

---

### Back/Front: Perfil Família com Limite de Tempo e Modo Livre (Tipo: Feature)

* **Tipo:** Feature
* **Responsável:** Não atribuído (Projeto Separado / Stand-Alone)
* **Fronteira de Arquivos:** `Backend/api/auth/`, `Backend/api/sessao/`, `Frontend/src/features/familia/`, `Frontend/src/features/jogos/`
* **Ordem de Execução / Dependência:** Independente / Execução futura em portal familiar ou aplicativo complementar
* **Requisitos:** RF11 (Modo Livre), RNF06 (LGPD e Privacidade de Dados Clínicos), RN01 (Modo Livre sem Persistência), RN04 (Isolamento de Acesso)
* **Referência Documentação:** Orientação Terapeuta & Marcos, RF11, RNF06
* **Descrição:** Criar perfil de acesso dedicado para a família/responsáveis que permite navegar e executar o catálogo de jogos exclusivamente em Modo Livre (`paciente_id = NULL`), sem persistência de prontuário, sem telemetria clínica e sem acionamento de DDA (**RN01**). Implementar painel com temporizador e limite de tempo de tela configurável pelos pais para prevenir sobrecarga sensorial e fadiga digital, além de blindagem completa contra visualização de diagnósticos, hipóteses e notas clínicas confidenciais do terapeuta (**RN04** / **RNF06**).
* **Critérios de Aceite:**
  * [ ] Perfil de autenticação familiar com escopo restrito, sem permissão para listar ou consultar prontuários, laudos e anotações clínicas (**403 Forbidden** - **RN04**).
  * [ ] Biblioteca executa unicamente partidas em Modo Livre (`modo_livre = true`, `paciente_id = null`), sem gravar telemetria ou gerar relatórios (**RN01**).
  * [ ] Interface com controle de tempo de tela configurável pelos responsáveis (ex.: 15, 30 ou 45 minutos).
  * [ ] Bloqueio automático e amigável da sessão de jogo ao expirar o tempo limite estipulado, com aviso visual acolhedor para a criança.
