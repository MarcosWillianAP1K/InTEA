# InTEA — Backend API RESTful

API RESTful do ecossistema InTEA desenvolvida com **Node.js**, **Express**, **TypeScript** e **PostgreSQL (Supabase)**, seguindo arquitetura MVC (Model-View-Controller) com tipagem estrita e validação de regras clínicas.

---

## Documentação das Rotas da API

Para uma especificação completa e detalhada de todas as rotas com exemplos práticos de Request Body, Query Params, Headers e Códigos de Status HTTP (200, 201, 400, 403, 404, 422, 500), consulte:

 **[Especificação Técnica das Rotas de Pacientes e Jogos (docs/api-pacientes-jogos.md)](../docs/api-pacientes-jogos.md)**

A documentação interativa Swagger UI pode ser acessada em:
 **`http://localhost:3000/api/docs`** (com o servidor em execução).

---

## Como Executar o Backend

### Pré-requisitos

- Node.js (versão 20 LTS ou superior)
- npm ou pnpm
- Projeto configurado no Supabase com as migrações aplicadas (`Database/database.sql`)

### Instalação de Dependências

```bash
npm install
```

### Configuração de Variáveis de Ambiente

Crie um arquivo `.env` na raiz do diretório `Backend/` baseado no `.env.example`:

```env
PORT=3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-secreta
SUPABASE_ANON_KEY=sua-anon-key-publica
CORS_ORIGIN=http://localhost:5173
```

### Executar em Desenvolvimento

```bash
npm run dev
```

O servidor iniciará em `http://localhost:3000`.

### Executar Testes Automatizados

```bash
npm test
```

---

## Rotas Principais Disponíveis

### Autenticação (`/api/auth`)

- `POST /api/auth/login` — Autenticação de terapeuta e emissão de token JWT

- `POST /api/auth/logout` — Encerramento de sessão
- `GET /api/auth/me` — Dados do usuário logado

### Pacientes (`/api/paciente`)

- `GET /api/paciente` — Listagem com busca, filtros de idade e paginação (**RF19**)

- `GET /api/paciente/:id` — Prontuário e dados do paciente com validação de vínculo (**RN04**, **RF06**)
- `POST /api/paciente` — Cadastro de paciente e responsável principal (**RF06**, **RF21**)
- `PUT /api/paciente/:id` — Atualização cadastral com validação de vínculo (**RN04**)
- `DELETE /api/paciente/:id` — Soft Delete / inativação sem perda de histórico (**RN05**)
- `PATCH /api/paciente/:id/reativar` — Reativação de paciente inativo
- `GET /api/paciente/:id/terapeutas` — Lista terapeutas da equipe multidisciplinar (**RF18**)
- `POST /api/paciente/:id/terapeutas` — Vínculo de terapeuta da mesma clínica (**RF18**)
- `DELETE /api/paciente/:id/terapeutas/:terapeutaId` — Remoção de vínculo do terapeuta (**RF18**)

### Catálogo e Biblioteca de Jogos (`/api/jogos`)

- `GET /api/jogos` — Catálogo geral de jogos com filtros por objetivo clínico e status operacional (`ativo`, `desativado`, `manutencao`, `em_breve`) (**RF09**)
- `POST /api/jogos` — Cadastro de novo jogo no catálogo com geração automática de slug técnico (`id_jogo`) e status inicial (**RF09**)
- `GET /api/jogos/:id` — Detalhes completos do jogo, manifesto clínico unificado e laudo de conformidade (**RF09**, **RNF02**)
- `PUT /api/jogos/:id` ou `PATCH /api/jogos/:id` — Atualização de metadados do jogo ou transição de status operacional (**RF09**)
- `DELETE /api/jogos/:id` — Exclusão permanente (hard delete para devs) com bloqueio relacional caso possua sessões vinculadas (**RF09**)
- `POST /api/jogos/validar-manifesto` — Validador formal de manifestos contra o Contrato 1 (**RNF02**)
- `POST /api/jogos/:id/validar-telemetria` — Validação estrita de telemetria com bloqueio de métricas sem tipo (**RN02**)

### Sessão e Pareamento Remoto (`/api/sessao`)

- `GET /api/sessao/codigo-pareamento` — Emissão de código alfanumérico único de pareamento remoto (PIN) (**RF10**)
- `POST /api/sessao/iniciar` — Inicialização de sessão clínica ou modo livre com injeção de contexto DDA (**RF12**, **RN03**)
- `POST /api/sessao/parear` — Handshake do dispositivo externo conectando à sala WebSocket (**RF10**)
- `GET /api/sessao/:id` — Consulta de estado e metadados da sessão por UUID
- `GET /api/sessao/token/:token` — Consulta de dados da sessão através do token/PIN (**RF10**)
- `GET /api/sessao/:token/status` — Polling de status e presença do dispositivo remoto (**RF10**)
- `PATCH /api/sessao/:id/finalizar` — Encerramento formal com geração de síntese de IA e auditoria (**RF13**, **RF17**)
- `DELETE /api/sessao/:id/cancelar` — Cancelamento controlado de sessão pendente (**RF13**)
- `PATCH /api/sessao/:id/status` — Transição manual de máquina de estados da sessão
- `GET /api/sessao/:id/resultado` — Consulta consolidada de telemetria, IA e anotações pós-sessão (**RF14**)
- `GET /api/sessao/:id/exportar` — Emissão de laudo clínico estruturado e anonimizado em formato LGPD (**RF20**)
