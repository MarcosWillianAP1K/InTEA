# InTEA — Frontend SPA Clínica

Interface web do ecossistema InTEA desenvolvida com **React 19**, **Vite**, **TypeScript**, **Tailwind CSS v4**, **Zustand** e **Socket.IO Client**, estruturada em arquitetura modular orientada a features (**Feature-Driven Architecture** em `src/features/`).

---

## Stack Tecnológica

| Tecnologia | Versão | Finalidade |
| :--- | :--- | :--- |
| React | ^19.x | UI Framework (SPA) |
| TypeScript | ~5.9.x | Tipagem estrita em toda a aplicação (`strict: true`, zero `any`) |
| Vite | ^7.x | Bundler, servidor de desenvolvimento e proxy reverso local |
| Tailwind CSS | ^4.x | Estilização utilitária responsiva com `@theme inline` |
| React Router DOM | ^7.x | Roteamento declarativo SPA (`ProtectedRoute`, `SidebarLayout`, `FocusLayout`) |
| Zustand | ^5.x | Gerenciamento de estado global em memória e `localStorage` (`persist`) |
| Socket.IO Client | ^4.x | Streaming de telemetria em tempo real e comandos DDA (`SessionSocketManager`) |
| Radix UI + shadcn | ^1.x | 17 componentes primitivos acessíveis (`Dialog`, `Select`, `Table`, `Sidebar`, etc.) |
| Vitest | ^4.x | Testes unitários e de integração (34 suítes / 285 testes) |

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

> **Nota sobre `VITE_USE_MOCK_DATA`:**
> - `false`: consome diretamente a API REST e o WebSocket reais do Backend.
> - `true`: utiliza as fixtures determinísticas locais (`bdmock.ts`) via `withFallback()`, ideal para desenvolvimento desconectado e suítes de testes.

### Comandos Disponíveis

```bash
# Servidor de desenvolvimento (http://localhost:5173)
npm run dev

# Verificação estrita de tipos TypeScript (tsc --noEmit)
npm run typecheck

# Suíte de testes automatizados (Vitest — 34 suítes / 285 testes)
npm test

# Build de produção
npm run build
```

---

## Arquitetura de Diretórios (`Frontend/src/`)

```text
Frontend/src/
├── main.tsx                              # Ponto de entrada do React 19
├── App.tsx                               # Montagem global (ThemeProvider, BrowserRouter, AppRoutes, Toaster)
├── routes/
│   └── index.tsx                         # Rotas públicas/privadas, ProtectedRoute e associação de Layouts
├── layout/
│   ├── SidebarLayout.tsx                 # Layout administrativo com AppSidebar (/painel, /pacientes, /jogos)
│   ├── FocusLayout.tsx                   # Layout imersivo em tela cheia para sessões clínicas (RNF07)
│   └── components/                       # app-sidebar.tsx, nav-header.tsx, nav-main.tsx, nav-user.tsx
├── core/                                 # Infraestrutura de comunicação HTTP e WebSocket
│   ├── api/
│   │   ├── endpoints.ts                  # Constantes tipadas de todas as rotas REST (/auth, /paciente, /sessao, etc.)
│   │   └── http-client.ts                # Cliente HTTP com injeção automática de Bearer JWT e refresh de 401
│   └── web.socket.ts                     # Singleton SessionSocketManager (Socket.IO Client) e hooks reativos
├── features/                             # ★ MÓDULOS VERTICAIS POR DOMÍNIO DE NEGÓCIO
│   ├── autenticacao/                     # Autenticação, registro e sessão do terapeuta
│   │   ├── pages/                        # LoginPage.tsx
│   │   ├── hooks/                        # useAuth.ts
│   │   ├── services/                     # auth.service.ts
│   │   ├── store/                        # authStore.ts
│   │   └── types/                        # auth.types.ts e bdmock.ts
│   ├── terapeuta/                        # Gestão do perfil do terapeuta e equipe multidisciplinar
│   │   ├── services/                     # terapeuta.service.ts
│   │   └── types/                        # terapeuta.types.ts e bdmock.ts
│   ├── paciente/                         # Gestão cadastral e prontuários clínicos
│   │   ├── pages/                        # PacientesPage.tsx
│   │   ├── components/                   # ListaPacientes.tsx, CardPacienteGrid.tsx, DialogFormularioPaciente.tsx, DialogDetalhesPaciente.tsx
│   │   ├── services/                     # paciente.service.ts
│   │   ├── store/                        # paciente.store.ts
│   │   └── types/                        # paciente.types.ts e bdmock.ts
│   ├── jogos/                            # Catálogo e biblioteca de jogos terapêuticos
│   │   ├── pages/                        # BibliotecaJogosPage.tsx
│   │   ├── components/                   # JogoCard.tsx, JogosFiltros.tsx
│   │   ├── services/                     # jogos.service.ts
│   │   └── types/                        # jogos.types.ts e bdmock.ts
│   ├── sessao/                           # Orquestração de sessão, pareamento remoto, cockpit e resultados
│   │   ├── pages/                        # CockpitSessaoPage.tsx, ResultadoSessaoPage.tsx
│   │   ├── components/                   # ModalPreSessao.tsx, ModalFinalizarSessao.tsx, ControlesClinicos.tsx, telemetria/, resultado/
│   │   ├── hooks/                        # useLiveTelemetry.ts, useSessionPersistence.ts, useClinicalTimer.ts, useSessionSync.ts
│   │   ├── services/                     # sessao.service.ts
│   │   ├── store/                        # sessionStore.ts
│   │   └── types/                        # sessao.types.ts e bdmock.ts
│   ├── anotacao/                         # Registro e histórico de anotações clínicas
│   │   ├── services/                     # anotacao.service.ts
│   │   └── types/                        # anotacao.types.ts e bdmock.ts
│   ├── painel/                           # Dashboard clínico, KPIs, alertas de IA e início rápido
│   │   ├── pages/                        # PainelPage.tsx
│   │   ├── services/                     # dashboard.service.ts
│   │   └── types/                        # dashboard.types.ts e bdmock.ts
│   └── configuracoes/                    # Preferências visuais, tema e privacidade
│       ├── pages/                        # settingsPage.tsx
│       ├── sections/                     # appearanceSetting.tsx
│       ├── services/                     # settings.service.ts
│       ├── store/                        # settingsStore.ts
│       └── types/                        # settings.types.ts e bdmock.ts
└── shared/                               # Recursos compartilhados entre todas as features
    ├── components/ui/                    # 17 componentes primitivos Radix UI / shadcn
    ├── hooks/                            # use-mobile.ts
    ├── lib/                              # utils.ts (cn()) e mock-adapter.ts (withFallback / shouldUseMock)
    ├── providers/                        # theme-provider.tsx
    ├── types/                            # api.types.ts e bdmock.ts global
    └── utils/                            # request.ts (motor base do HttpClient resiliente)
```

---

## Como Funcionam as Camadas Internas

1. **Páginas Mestre (`features/*/pages/`) e Componentes (`features/*/components/`):**
   - As páginas orquestram a leitura de parâmetros de rota (`useParams`), acionamento de Custom Hooks, consumo das Stores do Zustand e chamadas aos Services, repassando dados via *props* para os componentes e modais de cada feature.
2. **Services (`features/*/services/`):**
   - Objetos com métodos assíncronos em `camelCase` que utilizam `http` (`core/api/http-client.ts`) e `ENDPOINTS` (`core/api/endpoints.ts`).
   - Normalizam na fronteira do cliente eventuais diferenças de formato da API (`snake_case` $\rightarrow$ `camelCase`) sem exigir chaves duplicadas no Backend.
3. **Stores Globais com Zustand (`features/*/store/`):**
   - `useAuthStore`: sessão autenticada do terapeuta e tokens JWT persistidos em `localStorage`.
   - `useSessionStore`: máquina de estados da sessão clínica (`ocioso` $\rightarrow$ `configurando` $\rightarrow$ `aguardando_dispositivo` $\rightarrow$ `em_andamento` $\rightarrow$ `pausado` $\rightarrow$ `finalizado`), parâmetros DDA e telemetria.
   - `usePacienteStore`: estado reativo dos pacientes da clínica sincronizado com `pacienteService`.
   - `useSettingStore`: preferências de tema e idioma persistidas em `localStorage`.
4. **Custom Hooks (`features/*/hooks/`):**
   - `useSessionPersistence`: salva e hidrata automaticamente a sessão ativa no `sessionStorage` contra recarregamentos involuntários (`F5`) e ativa proteção `beforeunload`.
   - `useLiveTelemetry`: processa o streaming de eventos de telemetria em tempo real sem causar re-renderizações desnecessárias na árvore inteira.
   - `useClinicalTimer`: cronômetro clínico sincronizado com pausas e retomadas da intervenção.

---

## Documentação Complementar

- **[Arquitetura Completa do Ecossistema (`../docs/architecture.md`)](../docs/architecture.md)**
- **[Especificação da API RESTful (`../docs/api-pacientes-jogos.md`)](../docs/api-pacientes-jogos.md)**
- **`http://localhost:3000/api/docs`** — Swagger UI interativo (com o Backend em execução).
