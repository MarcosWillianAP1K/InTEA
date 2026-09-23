# InTEA — Frontend SPA

Interface do ecossistema InTEA desenvolvida com **React 19**, **Vite**, **TypeScript** e **Tailwind CSS v4**, estruturada em arquitetura modular por feature com estado global via Zustand e consumo da API RESTful do Backend.

---

## Stack Tecnológica

| Tecnologia | Versão | Finalidade |
| :--- | :--- | :--- |
| React | ^19.x | UI Framework (SPA) |
| TypeScript | ~5.9.x | Tipagem estrita em toda a aplicação |
| Vite | ^7.x | Build tool e servidor de desenvolvimento |
| Tailwind CSS | ^4.x | Estilização utilitária (sem CSS por componente) |
| React Router DOM | ^7.x | Roteamento client-side (SPA) |
| Zustand | ^5.x | Gerenciamento de estado global por feature |
| Supabase JS | ^2.x | Autenticação e Storage direto no cliente |
| Radix UI + shadcn | — | Componentes acessíveis e primitivos UI |
| Vitest | ^5.x | Testes unitários de componentes e hooks |

---

## Como Executar o Frontend

### Pré-requisitos
- Node.js (versão 20 LTS ou superior)
- npm ou pnpm
- Backend InTEA rodando em `http://localhost:3000` (veja [`../Backend/README.md`](../Backend/README.md))

### Instalação de Dependências
```bash
npm install
```

### Configuração de Variáveis de Ambiente
Crie um arquivo `.env` na raiz do diretório `Frontend/` baseado no `.env.example`:
```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-publica
```

### Executar em Desenvolvimento
```bash
npm run dev
```

A aplicação iniciará em `http://localhost:5173` e abrirá o navegador automaticamente.

### Executar Testes Automatizados
```bash
npm test
```

### Verificação de Tipagem (sem emitir build)
```bash
npm run typecheck
```

### Build de Produção
```bash
npm run build
```

---

## Estrutura de Diretórios

```
Frontend/src/
├── core/                       # Configuração global da aplicação
│   ├── endpoints.ts            # Constantes das URLs da API (/api/paciente, /api/jogos...)
│   ├── settings.ts             # Configurações globais (base URL, timeout)
│   └── web.socket.ts           # Configuração do WebSocket (Socket.IO client)
├── features/                   # Módulos por domínio de negócio
│   ├── auth/                   # Autenticação e sessão
│   │   ├── hooks/              # useAuth(), useSession()
│   │   ├── service/            # auth.service.ts (chamadas ao Supabase Auth)
│   │   └── store/              # authStore.ts (Zustand)
│   ├── pacientes/              # Módulo clínico de pacientes (Sprint 7)
│   │   ├── components/         # PacienteCard, PacienteForm, etc.
│   │   ├── hooks/              # usePacientes(), usePacienteDetalhe()
│   │   ├── pages/              # PacientesListPage, PacienteCadastroPage, PerfilPage
│   │   ├── service/            # paciente.service.ts (consome /api/paciente)
│   │   └── store/              # pacienteStore.ts (Zustand)
│   └── jogos/                  # Módulo de biblioteca de jogos terapêuticos (Sprint 7)
│       ├── components/         # JogoCard, FiltroObjetivo, etc.
│       ├── hooks/              # useJogos(), useJogoDetalhe()
│       ├── pages/              # BibliotecaJogosPage
│       ├── service/            # jogo.service.ts (consome /api/jogos)
│       └── store/              # jogoStore.ts (Zustand)
├── shared/                     # Recursos reutilizáveis entre features
│   ├── components/
│   │   └── ui/                 # Button, Input, Card, Modal, Table, Badge, SearchField
│   ├── lib/                    # Utilitários: formatters, validators, cn()
│   ├── providers/              # ThemeProvider (dark/light mode)
│   └── types/                  # Interfaces TypeScript globais
│       ├── api/                # Tipos de resposta da API (Paciente, Jogo, etc.)
│       └── auth/               # Tipos de autenticação e sessão
├── layout/                     # Estrutura de layout da aplicação (sidebar, header)
├── App.tsx                     # Configuração de rotas e providers raiz
├── main.tsx                    # Ponto de entrada do React
└── styles/                     # Estilos globais e tokens do Tailwind
```

---

## Convenções e Regras de Desenvolvimento

### Componentes
- **Exportação nomeada** em todos os componentes (não `export default`).
- Props sempre tipadas com `interface`.
- Estilização **exclusivamente** via Tailwind CSS — sem `style={{}}` inline nem arquivos `.css` por componente.
- Componentes reutilizáveis de UI ficam em `shared/components/ui/`.
- Componentes específicos de uma feature ficam em `features/{feature}/components/`.

### Services (Chamadas à API)
- URLs da API definidas como constantes em `core/endpoints.ts`.
- Services são **objetos com métodos**, não classes.
- Sempre verificar `res.ok` e lançar erro em caso de falha.
- Nunca colocar lógica de `fetch` diretamente em componentes ou hooks — encapsule no service.

### State Management (Zustand)
- Zustand para estado **global** (dados compartilhados entre páginas/features).
- `useState` do React para estado **local** (visibilidade de modal, form controlado).
- Nunca colocar lógica de fetch dentro da store — use hooks que chamam o service e atualizam a store.

### Hooks
- Hooks ficam em `features/{feature}/hooks/`.
- Todo hook de dados deve gerenciar os estados `isLoading` e `error`.

---

## Features Desenvolvidas (Sprint 7)

### Pacientes (`features/pacientes/`)
Módulo clínico completo para gestão do prontuário:
- Tela de seleção de pacientes com cards (foto, nome, idade, estado clínico).
- Listagem detalhada em tabela com busca rápida e filtros clínicos.
- Formulário de cadastro em 4 blocos: dados do paciente, responsável principal, responsável extra (opcional) e gatilhos/laudo — com máscara de CPF e CEP.
- Tela de perfil e prontuário consolidado do paciente.
- Integração com `GET`, `POST`, `PUT`, `DELETE /api/paciente` com tratamento de erros de permissão (403/404 — **RN04**).

### Biblioteca de Jogos (`features/jogos/`)
Catálogo visual de jogos terapêuticos:
- Grade responsiva de cards com nome, versão, descrição clínica e badge de status de instalação.
- Filtro por objetivo clínico (`foco_atencional`, `regulacao_emocional`, `desenvolvimento_linguagem`).
- Botões de ação **"Modo Livre"** (RF11) e **"Iniciar Sessão"** (fluxo clínico com paciente).
- Integração com `GET /api/jogos` consumindo manifesto e métricas do Backend.

### Componentes Compartilhados (`shared/components/ui/`)
Biblioteca de componentes base padronizados:
`Button`, `Input`, `Card`, `Badge`, `Modal`, `Table`, `SearchField`.

---

## Documentação da API

As rotas consumidas pelo Frontend estão documentadas em:

**[../docs/api-pacientes-jogos.md](../docs/api-pacientes-jogos.md)** — Especificação completa com exemplos de Request Body, Query Params e todos os códigos de status HTTP.

**`http://localhost:3000/api/docs`** — Swagger UI interativo (com o Backend em execução).
