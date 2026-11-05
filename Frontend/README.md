# InTEA — Frontend SPA Clínica

Interface web do ecossistema InTEA desenvolvida com **React 19**, **Vite**, **TypeScript**, **Tailwind CSS v4**, **Zustand** e **Socket.IO Client**, estruturada em arquitetura modular orientada a features (**Feature-Driven Architecture** em `src/features/`) com foco na usabilidade clínica, governança multidisciplinar e streaming de telemetria em tempo real.

---

## Stack Tecnológica

| Tecnologia | Versão | Finalidade |
| :--- | :--- | :--- |
| **React** | ^19.x | UI Framework reativo baseado em componentes funcionais |
| **TypeScript** | ~5.9.x | Tipagem estrita de ponta a ponta (`strict: true`, zero `any`) |
| **Vite** | ^7.x | Bundler de ultra-alta velocidade e servidor de desenvolvimento |
| **Tailwind CSS** | ^4.x | Estilização utilitária moderna com `@tailwindcss/vite` |
| **React Router DOM** | ^7.x | Roteamento declarativo com layouts aninhados e guards de autenticação |
| **Zustand** | ^5.x | Gerenciamento de estado global desacoplado com suporte a persistência |
| **Socket.IO Client** | ^4.x | Comunicação bidirecional em tempo real para telemetria e comandos DDA |
| **Radix UI + shadcn** | ^1.x | Componentes primitivos acessíveis (diálogos, menus, seletores, tabelas) |
| **Vitest + RTL** | ^5.x | Suíte de testes unitários e de integração de componentes (51 suítes) |
| **@react-pdf/renderer**| ^4.x | Geração e exportação client-side de relatórios e laudos clínicos em PDF |

---

## Como Executar o Frontend

### Pré-requisitos

- Node.js (versão 20 LTS ou superior)
- npm
- Backend InTEA em execução em `http://localhost:3000` (veja [`../Backend/README.md`](../Backend/README.md))

### Instalação de Dependências

```bash
npm install
```

### Configuração de Variáveis de Ambiente (`Frontend/.env`)

Crie um arquivo `.env` na raiz de `Frontend/` baseado no `.env.example`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
VITE_USE_MOCK_DATA=false
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-publica
```

> **Modos de Operação (`VITE_USE_MOCK_DATA`):**
> - `false`: consome a API REST e o Gateway WebSocket reais do Backend.
> - `true`: aciona fixtures determinísticas locais (`bdmock.ts`) através do adaptador `withFallback()`, permitindo desenvolvimento offline e testes isolados.

### Comandos Disponíveis

```bash
# Servidor de desenvolvimento com HMR (http://localhost:5173)
npm run dev

# Verificação estrita de tipos TypeScript (tsc -p tsconfig.app.json --noEmit)
npm run typecheck

# Suíte completa de testes automatizados (Vitest — 51 suítes de testes)
npm test

# Build de produção otimizado para dist/
npm run build

# Pré-visualização do bundle compilado localmente
npm run preview
```

---

## Estrutura de Diretórios (`Frontend/src/`)

```text
Frontend/src/
├── main.tsx                              # Inicialização do React 19
├── App.tsx                               # Provedores globais (Tema, Roteador, Toaster)
├── routes/
│   ├── index.tsx                         # Definição declarativa de rotas públicas e privadas
│   └── admin.routes.tsx                  # SuperAdminGuard para proteção de rotas restritas
├── layout/
│   ├── SidebarLayout.tsx                 # Layout administrativo com AppSidebar (/painel, /pacientes, /jogos)
│   ├── FocusLayout.tsx                   # Layout imersivo em tela cheia para intervenção clínica
│   └── components/                       # app-sidebar.tsx, nav-header.tsx, nav-main.tsx, nav-user.tsx
├── core/                                 # Comunicação e infraestrutura de rede
│   ├── api/
│   │   ├── endpoints.ts                  # Mapeamento centralizado de endpoints da API REST
│   │   └── http-client.ts                # Cliente HTTP com injeção automática de Bearer JWT e refresh 401
│   └── web.socket.ts                     # Singleton SessionSocketManager (Socket.IO Client) e conexões
├── features/                             # MÓDULOS DE NEGÓCIO VERTICAIS
│   ├── autenticacao/                     # Login, cadastro, recuperação e persistência de credenciais
│   │   ├── pages/                        # LoginPage.tsx, CadastroPage.tsx, RedefinirSenhaPage.tsx
│   │   ├── hooks/                        # useAuth.ts
│   │   ├── services/                     # auth.service.ts
│   │   └── store/                        # authStore.ts (sessão, tokens JWT, permissões)
│   ├── paciente/                         # Gestão cadastral, equipe multidisciplinar e prontuário
│   │   ├── pages/                        # PacientesPage.tsx, TodosPacientesPage.tsx, PerfilPacientePage.tsx, HistoricoPacientePage.tsx
│   │   ├── components/
│   │   │   ├── PainelEquipeMultidisciplinar.tsx # Gestão de equipe, avatares e proteção contra órfão
│   │   │   ├── ModalVincularEspecialista.tsx    # Modal de inclusão de terapeuta com busca em tempo real
│   │   │   ├── BadgeAutoriaMultidisciplinar.tsx # Distinção visual entre autoria própria e equipe
│   │   │   ├── LinhaDoTempoSessoes.tsx          # Timeline cronológica com filtros de especialista
│   │   │   ├── FiltrosHistoricoAvancado.tsx     # Filtros avançados por data, jogo e terapeuta
│   │   │   ├── GraficoPolimorficoMetrica.tsx    # Renderização dinâmica por tipo de métrica
│   │   │   ├── GraficoEvolucaoJogo.tsx          # Séries temporais de desempenho clínico
│   │   │   ├── ModalCompararSessoes.tsx         # Comparador lado a lado de intervenções
│   │   │   └── ListaPacientes.tsx, CardPacienteGrid.tsx, DialogFormularioPaciente.tsx
│   │   ├── services/                     # paciente.service.ts (CRUD, vínculos de equipe, histórico, métricas)
│   │   └── store/                        # paciente.store.ts
│   ├── sessao/                           # Ciclo de vida da intervenção clínica e pareamento remoto
│   │   ├── pages/
│   │   │   ├── CockpitSessaoPage.tsx     # Cockpit em tempo real (Modo Condutor vs Modo Observador da Equipe)
│   │   │   ├── ResultadoSessaoPage.tsx   # Dashboard analítico pós-sessão, síntese IA e exportação
│   │   │   └── HistoricoSessoesPage.tsx  # Histórico geral de intervenções conduzidas
│   │   ├── components/
│   │   │   ├── ModalPreSessao.tsx        # Início de sessão, seleção de jogo e pareamento PIN
│   │   │   ├── FormularioContextoDDA.tsx # Injeção dinâmica de parâmetros DDA pré-sessão
│   │   │   ├── ModalAnotacaoSessaoAtiva.tsx # Registro rápido de anotação clínica durante o atendimento
│   │   │   ├── ModalFinalizarSessao.tsx  # Encerramento formal com anotações e feedback
│   │   │   ├── ControlesClinicos.tsx     # Botões de intervenção (pausar, retomar, DDA, encerrar)
│   │   │   ├── telemetria/               # Componentes de streaming: frequência cardíaca, engajamento, etc.
│   │   │   └── resultado/                # Gráficos de dispersão, timeline de eventos e síntese clínica
│   │   ├── hooks/                        # useLiveTelemetry.ts, useSessionPersistence.ts, useClinicalTimer.ts, useSessionSync.ts
│   │   ├── services/                     # sessao.service.ts
│   │   └── store/                        # sessionStore.ts (máquina de estados da sessão e telemetria)
│   ├── anotacao/                         # Anotações clínicas longitudinais
│   │   ├── components/                   # GerenciadorAnotacoesProntuario.tsx, CardAnotacaoClinica.tsx, FiltrosAnotacoesClinicas.tsx
│   │   ├── hooks/                        # useAnotacoes.ts
│   │   └── services/                     # anotacao.service.ts (criação, edição e exclusão por autoria)
│   ├── admin/                            # Painel administrativo institucional e governança (SuperAdmin)
│   │   ├── pages/                        # AuditoriaAdminPage.tsx
│   │   ├── components/                   # TabelaAuditoria.tsx (filtros forenses, paginação e exportação)
│   │   └── services/                     # admin.service.ts
│   ├── jogos/                            # Catálogo e biblioteca de jogos terapêuticos
│   │   ├── pages/                        # BibliotecaJogosPage.tsx
│   │   ├── components/                   # JogoCard.tsx, JogosFiltros.tsx
│   │   └── services/                     # jogos.service.ts
│   ├── painel/                           # Dashboard clínico inicial do terapeuta
│   │   ├── pages/                        # PainelPage.tsx (KPIs, próximos atendimentos, alertas)
│   │   └── services/                     # dashboard.service.ts
│   ├── terapeuta/                        # Perfil profissional e credenciais do terapeuta
│   │   └── services/                     # terapeuta.service.ts
│   └── configuracoes/                    # Preferências de acessibilidade, tema e privacidade
│       ├── pages/                        # settingsPage.tsx
│       ├── sections/                     # appearanceSetting.tsx
│       └── store/                        # settingsStore.ts
└── shared/                               # Componentes e utilitários compartilhados
    ├── components/ui/                    # Componentes primitivos Radix UI / shadcn (Button, Dialog, Card, etc.)
    ├── hooks/                            # use-mobile.ts
    ├── lib/                              # utils.ts (cn()), mock-adapter.ts (withFallback)
    ├── providers/                        # theme-provider.tsx (Dark/Light mode)
    └── utils/                            # request.ts (motor HTTP resiliente)
```

---

## Mapeamento de Rotas da Aplicação

### Rotas Públicas
- `/login` — Autenticação do terapeuta via e-mail e senha.
- `/cadastro` — Registro de novo especialista com dados de conselho profissional.
- `/redefinir-senha` — Validação de token efêmero de recuperação e definição de nova senha.

### Rotas Autenticadas — Gestão Clínica (`SidebarLayout`)
- `/painel` — Dashboard com visão geral dos atendimentos, atalhos rápidos e alertas.
- `/pacientes` — Catálogo de pacientes da clínica com busca rápida e filtros.
- `/pacientes/todos` — Visão tabular completa de pacientes para triagem administrativa.
- `/pacientes/:id` — Prontuário detalhado com histórico, anotações e painel da equipe multidisciplinar.
- `/pacientes/:id/historico` — Histórico longitudinal comparativo com gráficos polimórficos de métricas.
- `/jogos` — Catálogo de jogos terapêuticos com visualização de manifestos clínicos.
- `/historico` — Histórico consolidado de todas as sessões realizadas pelo terapeuta.
- `/configuracoes` — Preferências visuais (tema claro/escuro) e perfil.

### Rotas Exclusivas de Governança (`SuperAdminGuard`)
- `/admin/auditoria` — Painel de auditoria institucional com visualização da trilha imutável de eventos e filtros por paciente/ação.

### Rotas de Intervenção Clínica em Tela Cheia (`FocusLayout`)
- `/sessao/:id/monitoramento` — Cockpit de sessão ativa com telemetria contínua em tempo real:
  - **Modo Condutor:** Acesso total aos controles clínicos (pausa, retomada, injeção DDA, anotação em tempo real e finalização).
  - **Modo Observador da Equipe:** Banner informativo, telemetria passiva em tempo real e controles de intervenção bloqueados.
- `/sessao/:id/resultado` — Apresentação consolidada de resultados pós-sessão, telemetria, síntese automatizada por IA e exportação de relatório.

---

## Invariantes de Negócio e Comportamento na UI

1. **Equipe Multidisciplinar e Visibilidade Compartilhada:**
   - Especialistas vinculados ao mesmo paciente têm acesso de leitura total ao prontuário, anotações e histórico.
   - Tentativa de desvincular o último especialista ativo é bloqueada na UI com mensagem de proteção contra abandono de paciente (`409 Conflict`).
2. **Escrita Isolada por Autoria:**
   - Anotações de outros colegas exibem o badge `"Equipe • Somente Leitura"` e ocultam botões de edição e inativação.
   - No Cockpit de sessão em andamento conduzida por outro colega, o especialista entra automaticamente no *Modo Observador*, sem permissão para enviar comandos clínicos ao jogo.
3. **Resiliência a Falhas e Persistência da Sessão:**
   - O hook `useSessionPersistence` armazena o estado ativo no `sessionStorage` e monitora eventos `beforeunload`, impedindo a perda acidental de dados durante a sessão clínica em recarregamentos de página (`F5`).
