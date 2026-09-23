# InTEA — Regras de Arquitetura e Organização

> **Documento de referência obrigatório para todos os integrantes da equipe e agentes de IA que contribuírem com este projeto.**
> Toda nova funcionalidade, migração ou refatoração deve seguir rigorosamente as convenções descritas aqui.

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Banco de Dados (Database)](#2-banco-de-dados-database)
3. [Back-end (Backend)](#3-back-end-backend)
4. [Front-end (Frontend)](#4-front-end-frontend)
5. [Convenções de Nomenclatura](#5-convenções-de-nomenclatura)
6. [Regras de Git e Branches](#6-regras-de-git-e-branches)
7. [CI/CD e Testes Automatizados](#7-cicd-e-testes-automatizados)
8. [Segurança e Variáveis de Ambiente](#8-segurança-e-variáveis-de-ambiente)

---

## 1. Visão Geral da Arquitetura

O InTEA é uma aplicação **monorepo** com três camadas independentes:

``` Pastes
InTEA/
├── Backend/        # API RESTful — Node.js + Express + TypeScript
├── Frontend/       # SPA — React 19 + Vite + TypeScript + Tailwind v4
├── Database/       # Schema e Migrações SQL — PostgreSQL via Supabase
├── docs/           # Documentação técnica e sprints
└── docker-compose.yml
```

```mermaid
flowchart LR
    FE["Frontend\n(React + Vite)"]
    BE["Backend\n(Express + TypeScript)"]
    SB["Supabase\n(PostgreSQL + Auth + Storage)"]

    FE -- "HTTP REST /api" --> BE
    FE -- "Supabase SDK (Auth, Storage)" --> SB
    BE -- "Supabase JS Client" --> SB
```

### Regras Fundamentais

- **Sem monólito:** cada camada tem responsabilidade única e deve ser deployável de forma independente.
- **TypeScript estrito em toda a stack.** Tipos `any` são proibidos.
- **Nenhum segredo** (chaves de API, senhas, connection strings) jamais deve ser commitado. Utilize sempre `.env` e `.env.example`.
- **Supabase é o banco de dados, o serviço de autenticação e o storage de arquivos.** Não implemente autenticação manual.

---

## 2. Banco de Dados (Database)

### 2.1 Estrutura de Diretórios

``` Pastes
Database/
├── database.sql          # ← Schema mestre (Single Source of Truth para fresh deploy)
└── migrations/
    ├── 001_*.sql         # ← Migração 001: Pacientes, UUID
    ├── 002_*.sql         # ← Migração 002: Terapeutas, Áreas de Foco
    └── NNN_descricao.sql # ← Próximas migrações
```

### 2.2 Regras de Schema

| Regra | Detalhe |
| :--- | :--- |
| **PKs sempre UUID** | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`. Nunca usar `BIGSERIAL` ou `INT`. |
| **FKs sempre UUID** | Toda chave estrangeira deve referenciar um `UUID`. |
| **Timestamps padrão** | Toda tabela deve ter `created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL` e `updated_at` quando aplicável. |
| **Soft Delete** | Tabelas clínicas (`anotacao_clinica`, `relatorio_sessao`) usam `soft_delete BOOLEAN DEFAULT FALSE`. Hard DELETE é bloqueado por trigger (`impedir_hard_delete_clinico`). |
| **RLS obrigatório** | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` deve ser aplicado a **todas** as tabelas. Nunca deixar tabela sem política. |
| **Sem dados sensíveis sem restrição** | Colunas como `cpf` devem ter `UNIQUE` + índice (`idx_paciente_cpf`). |
| **Sem colunas BLOB** | Arquivos (PDF, DOCX) **nunca** são armazenados no banco. Use o **Supabase Storage** com bucket privado e signed URLs. |

### 2.3 Regras de Migração

1. **Nunca editar** uma migration já executada no Supabase. Crie sempre uma nova.
2. O nome do arquivo segue o padrão: `NNN_descricao_snake_case.sql` (ex: `003_add_sessao_status.sql`).
3. Toda migração deve ser **idempotente**: use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, blocos `DO $$ ... END $$` com verificações antes de alterar tipos.
4. O arquivo `database.sql` é atualizado sincronamente com cada migration executada (é o schema para novos projetos do zero).
5. Scripts de migração devem ter **comentários explicativos** em cada bloco (`PASSO 1`, `PASSO 2`...).

### 2.4 Tabelas Existentes

| Tabela | Responsabilidade |
| :--- | :--- |
| `clinica` | Clínica/instituição de saúde |
| `terapeuta` | Perfil do terapeuta (espelha `auth.users`) |
| `areas_foco` | Catálogo de áreas de especialização do terapeuta |
| `terapeuta_area_foco` | Vínculo N:N terapeuta ↔ área |
| `paciente` | Dados sociodemográficos do paciente |
| `responsavel` | Responsável legal do paciente |
| `paciente_responsavel` | Vínculo N:N paciente ↔ responsável (`principal` ou `extra`) |
| `dados_clinicos` | Dados clínicos 1:1 com paciente |
| `gatilhos` | Catálogo de gatilhos sensoriais |
| `paciente_gatilho` | Vínculo N:N paciente ↔ gatilho (com severidade) |
| `laudo_clinico` | Metadados de laudos no Supabase Storage |
| `terapeuta_paciente` | Vínculo N:N terapeuta ↔ paciente |
| `jogo` | Catálogo de jogos terapêuticos |
| `sessao` | Sessão de jogo (clínica ou modo livre) |
| `anotacao_clinica` | Anotações de prontuário (soft delete, RN05) |
| `relatorio_sessao` | Relatório consolidado de sessão (soft delete, RN05) |

### 2.5 Funções e Helpers de RLS

- `public.check_is_super_admin()` → Verifica se o usuário autenticado é super admin.
- `public.terapeuta_tem_acesso_paciente(p_paciente_id UUID)` → Verifica vínculo ativo em `terapeuta_paciente`.

> [!CAUTION]
> Nunca remova ou altere a assinatura dessas funções sem atualizar **todas** as políticas que as referenciam.

---

## 3. Back-end (Backend)

### 3.1 Stack

| Tecnologia | Versão | Uso |
| :--- | :--- | :--- |
| Node.js | LTS | Runtime |
| TypeScript | ^7.x | Linguagem (strict mode) |
| Express | ^4.x | Framework HTTP |
| Supabase JS | ^2.x | Cliente do banco/auth |
| Socket.IO | ^4.x | WebSocket (sessões em tempo real) |
| Vitest | ^5.x | Testes unitários |

### 3.2 Estrutura de Diretórios

``` Pastes
Backend/
├── src/
│   └── server.ts             # Ponto de entrada: Express, CORS, Swagger UI e registro do apiRouter
├── api/
│   ├── index.ts              # apiRouter central — registra rotas das features (/paciente, /terapeuta, etc.)
│   └── {feature}/            # Ex: paciente/, terapeuta/, jogo/
│       ├── controllers/
│       │   └── {feature}.controller.ts
│       ├── models/
│       │   └── {feature}.model.ts
│       ├── routes/
│       │   └── {feature}.routes.ts  # Endpoints REST e anotações Swagger @swagger
│       ├── dtos/             # Data Transfer Objects
│       │   └── {feature}.dto.ts
│       └── test/
│           └── {feature}.test.ts
├── core/
│   ├── middlewares/
│   │   └── auth.middleware.ts  # Validação de token Bearer JWT via Supabase Auth
│   └── supabase/
│       └── supabase.client.ts  # Instância singleton do Supabase com SERVICE_ROLE_KEY
└── package.json
```

### 3.3 Padrão de Arquitetura: MVC

O Back-end segue estritamente o padrão **MVC (Model-View-Controller)**. No contexto de API REST, a "View" é a resposta JSON.

``` Paste
HTTP Request
    ↓
routes/{feature}.routes.ts      # Define verbos HTTP e mapeia para o Controller
    ↓
controllers/{feature}.controller.ts  # Extrai dados da req, chama o Model, devolve res
    ↓
models/{feature}.model.ts       # Contém toda a lógica de acesso ao banco (Supabase)
    ↓
core/supabase/supabase.client.ts # Singleton do cliente Supabase
```

#### Responsabilidades por camada

| Camada | Faz | Não Faz |
| :--- | :--- | :--- |
| **Route** | Define verbos HTTP (`GET`, `POST`, etc.) e registra middlewares | Contém lógica de negócio |
| **Controller** | Extrai e valida dados da `req`, chama o Model, formata o `res` | Acessa banco diretamente |
| **Model** | Executa queries no Supabase, trata erros de banco | Acessa `req` ou `res` |
| **DTO** | Define a interface TypeScript de entrada (body, params, query) | Contém lógica |

### 3.4 Regras de Controller

```typescript
// ✅ CORRETO
export class PacienteController {
  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const dto: CriarPacienteDTO = req.body;
      // Validação básica aqui (campos obrigatórios)
      const paciente = await PacienteModel.criar(dto);
      res.status(201).json({ data: paciente });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar paciente' });
    }
  }
}
```

- Todo método de controller deve ser `static async`.
- Sempre envolver em `try/catch`.
- Retornar sempre `{ data: ... }` para sucesso e `{ error: '...' }` para erro.
- Status HTTP corretos: `200` listagem/busca, `201` criação, `400` validação, `401` sem auth, `403` sem permissão, `404` não encontrado, `500` erro interno.

### 3.5 Regras de Model

```typescript
// ✅ CORRETO
export class PacienteModel {
  static async criar(dto: CriarPacienteDTO) {
    const { data, error } = await supabase
      .from('paciente')
      .insert(dto)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async desativar(id: string) {
    // Soft Delete: NUNCA usa .delete() em entidade clínica
    const { data, error } = await supabase
      .from('paciente')
      .update({ status_ativo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
```

- Toda query ao Supabase verifica `error` e lança exceção em caso de falha.
- **Soft Delete:** Tabelas clínicas nunca usam `.delete()`. Use `.update({ status_ativo: false })` ou `.update({ soft_delete: true })`.
- Métodos de listagem sempre filtram `status_ativo: true` por padrão.

### 3.6 Regras de DTO

```typescript
// dtos/paciente.dto.ts
export interface CriarPacienteDTO {
  nome: string;
  data_nascimento: string;     // ISO 8601: "YYYY-MM-DD"
  clinica_id: string;          // UUID
  cpf?: string;
  telefone?: string;
  // ...
}

export interface AtualizarPacienteDTO {
  nome?: string;
  telefone?: string;
  // Nunca inclua id, created_at, clinica_id em update DTO
}
```

- DTOs de criação (`Criar...DTO`) têm campos obrigatórios sem `?`.
- DTOs de atualização (`Atualizar...DTO`) têm todos os campos como opcionais (`?`), pois PATCH parcial é padrão.
- DTOs nunca incluem `id`, `created_at`, `updated_at` — esses são gerados pelo banco.
- Para datas: sempre `string` no formato ISO 8601 (`YYYY-MM-DD` ou `YYYY-MM-DDTHH:mm:ssZ`).

### 3.7 Registrar uma Nova Feature

1. Criar pasta `api/{feature}/` com as subcamadas (`controllers`, `models`, `routes`, `test`).
2. Exportar as rotas em `api/{feature}/routes/{feature}.routes.ts` com anotações `@swagger`.
3. **Importar e registrar** em `api/index.ts` usando o nome do recurso no **singular**:

   ```typescript
   apiRouter.use('/auth', authRoutes);
   apiRouter.use('/paciente', pacienteRoutes);
   apiRouter.use('/terapeuta', terapeutaRoutes);
   ```

### 3.8 Testes Automatizados

- Framework: **Vitest**.
- Todo Model deve ter seu arquivo de teste em `api/{feature}/test/{feature}.test.ts`.
- Testes unitários validam lógica de CRUD, soft delete, hard delete e auth de forma isolada.
- Executar com: `npm test` no diretório `Backend/`.

### 3.9 Documentação Interativa com Swagger UI / OpenAPI

O projeto utiliza **Swagger UI** (`swagger-ui-express` + `swagger-jsdoc`) para documentação viva e testes de endpoints.

- **URL de Acesso:** `http://localhost:3000/api/docs`
- **Regras de Documentação:**
  - A documentação de cada rota vive **exclusivamente** em cima do método no arquivo `{feature}.routes.ts` usando blocos `/** @swagger ... */`.
  - **Não poluir o `server.ts`** com definições manuais de schemas. O `server.ts` deve apenas carregar os arquivos via glob (`./dist/api/**/*.routes.js` e `./api/**/*.routes.ts`).
  - As requisições usam **exemplos JSON diretos** (`example: { ... }`) facilitando o teste via botão *"Try it out"*.
  - A seção de Schemas no rodapé do Swagger UI é ocultada via `defaultModelsExpandDepth: -1`.
- **Botão Authorize (JWT):**
  - O Swagger possui o botão **`Authorize 🔓`** habilitado no topo direito via `securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }`.
  - Basta fazer login em `POST /api/terapeuta/login`, copiar o `access_token` retornado e colar no botão Authorize para testar rotas protegidas.

### 3.10 Autenticação JWT e Middleware de Segurança

- O sistema utiliza **Tokens JWT** emitidos pelo Supabase Auth.
- Para proteger uma rota privada, utiliza-se o middleware `authMiddleware`:
  ```typescript
  import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';

  // Rota protegida por autenticação JWT:
  authRoutes.get('/me', authMiddleware, AuthController.me);
  ```
- O middleware:
  1. Extrai o token do cabeçalho `Authorization: Bearer <token>`.
  2. Valida o token com `supabase.auth.getUser(token)`.
  3. Injeta os dados do usuário autenticado em `req.user`.
  4. Retorna `401 Unauthorized` caso o token seja inválido, ausente ou expirado.

---

## 4. Front-end (Frontend)

### 4.1 Stack

| Tecnologia | Versão | Uso |
| :--- | :--- | :--- |
| React | ^19.x | UI Framework |
| TypeScript | ~5.9.x | Linguagem (strict mode) |
| Vite | ^7.x | Build tool e dev server |
| Tailwind CSS | ^4.x | Estilização utilitária com `@theme inline` |
| React Router DOM | ^7.x | Roteamento declarativo SPA |
| Zustand | ^5.x | Gerenciamento de estado global com middleware `persist` |
| Radix UI + shadcn | ^1.x | Componentes primitivos acessíveis |
| Lucide React | ^0.575.x | Biblioteca oficial de ícones |
| Vitest | ^5.x | Testes unitários de componentes e hooks |

### 4.2 Estrutura de Diretórios (Padrão Oficial)

``` Pastes
Frontend/src/
├── routes/                     # Central de Roteamento SPA
│   └── index.tsx               # Mapeamento declarativo de rotas com React Router DOM v7
├── layout/                     # Casca estrutural e cascas visuais da aplicação
│   ├── dashboardLayout.tsx     # Layout com SidebarProvider, AppSidebar, Header dinâmico e trigger
│   └── LayoutExample.tsx       # BaseLayout reutilizável com scroll protegido
├── features/                   # Módulos verticais por domínio de negócio
│   ├── dashboard/              # Painel inicial, métricas gerais e navegação
│   │   ├── components/         # app-sidebar.tsx, nav-header.tsx, nav-main.tsx, nav-button.tsx, nav-user.tsx
│   │   └── pages/              # dashboardPage.tsx
│   ├── patients/               # Gestão clínica e cadastral de pacientes
│   │   ├── components/         # patientsList.tsx, patientsContent.tsx, patientFormDialog.tsx, patientCreateContent.tsx
│   │   ├── pages/              # patientsPage.tsx
│   │   └── store/              # patients.store.ts (Zustand com tipagem Patient e PatientStatus)
│   ├── jogos/                  # Catálogo e Biblioteca de Jogos Terapêuticos
│   │   ├── components/         # JogoCard.tsx, JogosFiltros.tsx
│   │   ├── pages/              # BibliotecaJogosPage.tsx
│   │   ├── services/           # jogosService.ts
│   │   └── types.ts            # Interfaces de Jogos, Metadados e Manifestos
│   ├── settings/               # Configurações do usuário e preferências da aplicação
│   │   ├── pages/              # settingsPage.tsx
│   │   ├── sections/           # appearanceSetting.tsx
│   │   └── store/              # settingsStore.ts (Zustand com persistência em localStorage)
│   └── auth/                   # Autenticação e sessão do terapeuta
│       ├── hooks/              # useAuth.ts
│       ├── service/            # auth.service.ts
│       └── store/              # auth.store.ts
├── shared/                     # Código e utilitários compartilhados entre features
│   ├── components/
│   │   └── ui/                 # 17 componentes primitivos (avatar, badge, breadcrumb, button, dialog, etc.)
│   ├── hooks/                  # Hooks globais compartilhados (ex: use-mobile.ts)
│   ├── lib/                    # Utilitários puros (ex: utils.ts com cn() usando clsx e twMerge)
│   ├── providers/              # Provedores de contexto (ThemeProvider, etc.)
│   ├── types/                  # Tipagens globais da API e Autenticação
│   └── utils/
│       └── request.ts          # Cliente HTTP resiliente (HttpClient) com CSRF, retry, timeout e refresh JWT
├── assets/                     # SVGs, ícones e ilustrações da identidade visual do InTEA
├── styles/                     # Folha de estilos raiz (index.css com Tailwind v4 e tw-animate-css)
├── App.tsx                     # Ponto de montagem com ThemeProvider e Routes
└── main.tsx                    # Ponto de entrada do React 19
```

### 4.3 Cliente HTTP Resiliente (`shared/utils/request.ts`)

Todas as chamadas à API REST devem utilizar a infraestrutura corporativa do `HttpClient`, que encapsula resiliência e segurança:

1. **Instanciação Padronizada:**
   ```typescript
   import { createHttpClient } from "@/shared/utils/request";

   export const http = createHttpClient({
     baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
     requestTimeoutMs: 15_000,
     auth: {
       getAccessToken: () => localStorage.getItem("access_token") ?? undefined,
       refreshAccessToken: async () => {
         // Lógica de renovação com o endpoint /api/auth/refresh
       },
       onAuthFailure: () => {
         window.location.href = "/login";
       },
     },
   });
   ```

2. **Garantias de Resiliência:**
   - **Timeout Automático:** Aborta chamadas pendentes após 15 segundos (5 minutos para upload).
   - **Retries Exponenciais:** Re-execução automática apenas de métodos idempotentes (`GET` e `HEAD`) em falhas de rede transitórias.
   - **Fila de 401 (Token Refresh):** Quando múltiplos requests concorrentes recebem `401 Unauthorized`, apenas uma chamada de renovação de token é disparada; as demais requisições aguardam na fila e são re-executadas com o novo token sem deslogar o usuário.
   - **Proteção CSRF:** Suporte nativo a tokens CSRF via header customizado (`X-CSRF-Token`).

### 4.4 Padrão de Layout e Sidebar (`layout/dashboardLayout.tsx`)

O InTEA adota uma casca estrutural baseada no componente `Sidebar` do Radix UI / Shadcn:
- **`SidebarProvider`:** Controla a abertura, colapso para ícones e responsividade móvel (`use-mobile.ts`).
- **`AppSidebar`:** Centraliza a navegação primária (`Dashboard`, `Jogos`, `Meus Pacientes`, `Histórico`), o logo oficial do InTEA (`nav-header.tsx`), botão de ação rápida (`nav-button.tsx`) e o perfil do usuário logado (`nav-user.tsx`).
- **`Header Dinâmico`:** Contém o trigger de expansão da sidebar e a saudação contextual do terapeuta.
- **`BaseLayout`:** Contêiner com rolagem protegida (`overflow-x-hidden`) onde as páginas filhas são renderizadas.

### 4.5 Padrão de Estado com Zustand (`store/`)

- **Estado Global:** Gerenciado exclusivamente via Zustand.
- **Persistência Local:** Configurações de tema, idioma e preferências do usuário utilizam o middleware `persist` com armazenamento em `localStorage`.
- **Tipagem Estrita:** Toda store define rigorosamente o tipo de seu estado e os métodos de mutação sem o uso de `any`.

```typescript
// Exemplo: features/settings/store/settingsStore.ts
export const useSettingStore = create<SettingState>()(
  persist(
    (set) => ({
      settings: { theme: "Sistema", language: "pt", autoDelete: "Nunca" },
      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
    }),
    { name: "app:preferences" }
  )
);
```

### 4.6 Roteamento Centralizado (`routes/index.tsx`)

O roteamento da aplicação é desacoplado do `App.tsx`:
```tsx
export function Routes() {
  return (
    <RouterRoutes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/patients" element={<PatientsPage />} />
      <Route path="/games" element={<BibliotecaJogosPage />} />
    </RouterRoutes>
  );
}
```

### 4.7 Catálogo de Componentes Primitivos (`shared/components/ui/`)

O repositório possui 17 componentes de interface primitivos, acessíveis e customizados:
`avatar`, `badge`, `breadcrumb`, `button`, `card`, `collapsible`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `table` e `tooltip`.
Todo novo componente visual específico de uma tela deve compor esses blocos primitivos antes de criar estilos manuais.


---

## 5. Convenções de Nomenclatura

### Geral

| Tipo | Convenção | Exemplo |
| :--- | :--- | :--- |
| Arquivos TypeScript/TSX | `kebab-case` | `paciente.model.ts`, `PacienteCard.tsx` |
| Interfaces e Types | `PascalCase` | `CriarPacienteDTO`, `Paciente` |
| **Funções e Métodos de Classe** | **`camelCase` ("nomeNome")** | `deletarHard()`, `buscarPorId()`, `desativar()`, `reativar()` |
| Variáveis e instâncias | `camelCase` | `novoPaciente`, `isPacienteAtivo` |
| Constantes globais | `UPPER_SNAKE_CASE` | `MAX_UPLOAD_SIZE`, `PORT` |
| Componentes React | `PascalCase` | `PacienteCard`, `FormularioCadastro` |
| Tabelas SQL | `snake_case` | `paciente`, `terapeuta_paciente` |
| Colunas SQL / DTO payload | `snake_case` | `data_nascimento`, `status_ativo`, `clinica_id` |
| Endpoints REST (recursos) | `kebab-case` singular | `/api/paciente`, `/api/terapeuta`, `/api/jogo` |
| Sub-rotas de ação específica | Ação no final da URL | `DELETE /api/paciente/:id/hard`, `PATCH /api/paciente/:id/reativar` |

### Regra Estrita de `camelCase` no Código TypeScript

- **Métodos em Controllers, Models e Services**: devem usar **obrigatoriamente `camelCase`** (`"nomeNome"`).
  - ✅ **Correto:** `deletarHard()`, `buscarPorId()`, `desativar()`, `calcularMetricas()`
  - ❌ **Proibido:** `deletar_hard()`, `delete_hard()`, `buscar_por_id()`
- **Sub-rotas de ação**: quando um endpoint realiza uma ação secundária ou de exceção sobre um recurso (como reativação ou hard delete para testes), a ação vai no **final da URL após o `:id`**:
  - ✅ `DELETE /api/paciente/:id/hard`
  - ✅ `PATCH /api/paciente/:id/reativar`
  - ❌ `/api/paciente/hard/:id` (evitar inversão do padrão)

### Padrão de Arquivo por Camada (Backend)

| Camada | Padrão | Exemplo |
| :--- | :--- | :--- |
| Route | `{feature}.routes.ts` | `paciente.routes.ts` |
| Controller | `{feature}.controller.ts` | `paciente.controller.ts` |
| Model | `{feature}.model.ts` | `paciente.model.ts` |
| DTO | `{feature}.dto.ts` | `paciente.dto.ts` |
| Teste | `{feature}.test.ts` | `paciente.test.ts` |

---

## 6. Regras de Git e Branches

### Branches

| Branch | Finalidade |
| :--- | :--- |
| `main` | Produção. Código **testado e aprovado**. Só recebe via Pull Request. |
| `develop` | Integração. Base para novas features. |
| `{nome}-dev` | Branch pessoal de desenvolvimento. Ex: `marcos-dev`. |

### Convenção de Commit (Conventional Commits)

``` Tipo
<tipo>(<escopo>): <descrição curta em português>
```

| Tipo | Quando usar |
| :--- | :--- |
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudança de comportamento |
| `docs` | Documentação |
| `test` | Adição ou correção de testes |
| `chore` | Configuração, build, dependências |
| `db` | Mudanças de schema/migration |

**Exemplos:**

``` Padrão de commit
feat(pacientes): adiciona endpoint POST /api/pacientes
fix(auth): corrige refresh de token expirado
db(migration): cria tabela responsavel e paciente_responsavel
test(pacientes): adiciona testes unitários do PacienteModel
```

### Regras de Pull Request

- Todo PR para `main` exige aprovação de ao menos 1 revisor.
- PRs devem passar no CI/CD (build + testes) antes do merge.
- Título do PR segue o mesmo padrão de commit.
- O PR deve referenciar o card/task do GitHub Projects.

---

## 7. CI/CD e Testes Automatizados

O pipeline de CI/CD roda no **GitHub Actions** apenas para a branch `main`.

### Etapas do Pipeline

1. **Checkout** do código.
2. **Instalação de dependências** (`npm ci`) para Backend e Frontend.
3. **Typecheck** (`tsc --noEmit`) para ambos.
4. **Testes** (`vitest run`) para ambos.
5. **Build de produção** para Backend (`tsc`) e Frontend (`vite build`).
6. **Build Docker** via `docker compose build`.

### Comandos por camada

| Ação | Backend | Frontend |
| :--- | :--- | :--- |
| Instalar | `npm ci` | `npm ci` |
| Typecheck | `npm run typecheck` | `npm run typecheck` |
| Testes | `npm test` | `npm test` |
| Build | `npm run build` | `npm run build` |
| Dev | `npm run dev` | `npm run dev` |

> [!IMPORTANT]
> **Nunca faça commit de código que falhe no typecheck ou nos testes.** Valide localmente antes de abrir PR.

---

## 8. Segurança e Variáveis de Ambiente

### Back-end (`Backend/.env`)

```env
PORT=3000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Somente para operações admin
CORS_ORIGIN=http://localhost:5173
```

### Front-end (`Frontend/.env`)

```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Regras de Segurança e Arquitetura Híbrida

| Camada | Chave Utilizada | Papel e Segurança |
| :--- | :--- | :--- |
| **Back-end (Node.js)** | `SUPABASE_SERVICE_ROLE_KEY` | **Exclusiva do Backend.** O servidor é a autoridade de negócio; valida os dados via DTOs, aplica Soft Delete (RN05) e checa permissões via `authMiddleware` antes de persistir com poderes de servidor. Nunca expor ao Frontend. |
| **Front-end (React)** | `VITE_SUPABASE_ANON_KEY` | Chave pública embutida no bundle do navegador. Usada exclusivamente para login direto no Supabase Auth e upload/download de laudos no Supabase Storage (onde as políticas de RLS garantem a proteção do bucket). |

> [!IMPORTANT]
> **Por que o Backend usa a SERVICE_ROLE_KEY?**
> O Back-end é um ambiente seguro e privado. Se o Backend utilizasse a chave anônima (`anon_key`), o Supabase o enxergaria como um visitante anônimo não logado (`auth.uid() = NULL`) e o RLS bloquearia inserções no banco. A segurança do Backend é feita por seus próprios middlewares (`authMiddleware`) e validações de DTOs antes de persistir no banco.

### Supabase Storage (Laudos)

- Bucket `'laudos'` é **privado** (`public = false`).
- Acesso ao arquivo é feito exclusivamente via **Signed URL temporária** (60 segundos).
- O cliente **nunca** armazena a URL permanentemente — solicita uma nova a cada download.
- Tipos MIME permitidos: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- Tamanho máximo: **15 MB** por arquivo.
