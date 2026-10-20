# InTEA — Backend API RESTful & Gateway WebSocket

API RESTful e Gateway WebSocket em tempo real do ecossistema InTEA desenvolvidos com **Node.js**, **Express**, **Socket.IO**, **TypeScript** e **PostgreSQL (Supabase)**, seguindo arquitetura em camadas limpas (**Clean MVC**) com tipagem estrita e validação das regras clínicas (**RN01 a RN05**).

---

## Documentação e Especificação Técnica

- **[Arquitetura Completa do Ecossistema (`../docs/architecture.md`)](../docs/architecture.md)**
- **[Especificação Técnica da API RESTful (`../docs/api-pacientes-jogos.md`)](../docs/api-pacientes-jogos.md)**
- **Swagger UI Interativo:** `http://localhost:3000/api/docs` (com o servidor em execução).

---

## Como Executar o Backend

### Pré-requisitos

- Node.js (versão 20 LTS ou superior)
- npm
- Projeto configurado no Supabase com o schema aplicado (`Database/database.sql`)

### Instalação de Dependências

```bash
npm install
```

### Configuração de Variáveis de Ambiente (`Backend/.env`)

Crie um arquivo `.env` na raiz de `Backend/` baseado no `.env.example`:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-secreta
SUPABASE_ANON_KEY=sua-anon-key-publica
CORS_ORIGIN=http://localhost:5173
```

### Comandos Disponíveis

```bash
# Servidor em modo desenvolvimento com hot-reload (http://localhost:3000)
npm run dev

# Verificação estrita de tipos TypeScript (tsc --noEmit)
npm run typecheck

# Suíte de testes automatizados (Vitest — 32 suítes / 579 testes)
npm test

# Build de produção
npm run build
```

---

## Rotas Principais da API REST (`/api`)

### Autenticação (`/api/auth`)

- `POST /api/auth/login` — Autenticação de terapeuta e emissão de tokens JWT (`access_token`, `refresh_token`)
- `POST /api/auth/refresh` — Renovação silenciosa do `access_token` via `refresh_token`
- `POST /api/auth/logout` — Encerramento seguro da sessão autenticada
- `POST /api/auth/recuperar-senha` — Disparo de fluxo de recuperação de credenciais
- `GET /api/auth/me` — Dados do perfil profissional e vínculo institucional do terapeuta logado

### Terapeutas (`/api/terapeuta`)

- `POST /api/terapeuta/cadastro` — Registro de novo terapeuta e associação de áreas de foco
- `GET /api/terapeuta/:id` — Consulta de perfil profissional e especialidades
- `PUT /api/terapeuta/:id` — Atualização de dados cadastrais e conselho profissional (CRP/CRM/CREFITO)

### Pacientes (`/api/paciente`)

- `GET /api/paciente` — Listagem com busca textual, filtros de idade e paginação (**RF19**)
- `GET /api/paciente/:id` — Prontuário completo com validação estrita de vínculo institucional (**RN04**, **RF06**)
- `POST /api/paciente` — Cadastro de paciente, dados clínicos, gatilhos e responsável principal (**RF06**, **RF21**)
- `PUT /api/paciente/:id` — Atualização cadastral com validação de vínculo (**RN04**)
- `DELETE /api/paciente/:id` — Soft Delete / inativação sem perda de histórico (**RN05**)
- `PATCH /api/paciente/:id/reativar` — Reativação de paciente inativo
- `GET /api/paciente/:id/terapeutas` — Lista terapeutas da equipe multidisciplinar (**RF18**)
- `POST /api/paciente/:id/terapeutas` — Vínculo de terapeuta da mesma clínica (**RF18**, **RN04**)
- `DELETE /api/paciente/:id/terapeutas/:terapeutaId` — Revogação de vínculo de terapeuta (**RF18**)

### Catálogo e Biblioteca de Jogos (`/api/jogos`)

- `GET /api/jogos` — Catálogo geral com filtros por objetivo clínico e status operacional (**RF09**)
- `POST /api/jogos` — Cadastro de jogo no catálogo com geração automática de slug (`id_jogo`) (**RF09**)
- `GET /api/jogos/:id` — Detalhes completos do jogo, manifesto clínico unificado e laudo de conformidade (**RF09**, **RNF02**)
- `PUT /api/jogos/:id` / `PATCH /api/jogos/:id` — Atualização de metadados ou transição de status operacional (**RF09**)
- `DELETE /api/jogos/:id` — Exclusão permanente para desenvolvedores (bloqueada se houver sessões vinculadas) (**RF09**)
- `POST /api/jogos/validar-manifesto` — Validador formal de manifestos contra o Contrato 1 (**RNF02**)
- `POST /api/jogos/:id/validar-telemetria` — Validação estrita de telemetria contra métricas sem tipo (**RN02**)

### Sessão e Pareamento Remoto (`/api/sessao`)

- `GET /api/sessao/codigo-pareamento` — Emissão de código alfanumérico único de pareamento remoto (PIN) (**RF10**)
- `POST /api/sessao/iniciar` — Inicialização de sessão clínica ou modo livre com injeção de contexto DDA (**RF12**, **RN01**, **RN03**)
- `POST /api/sessao/parear` — Handshake do dispositivo externo conectando à sala WebSocket (**RF10**)
- `GET /api/sessao/:id` — Consulta de estado e metadados da sessão por UUID
- `GET /api/sessao/token/:token` — Consulta de dados da sessão através do `session_token`/PIN (**RF10**)
- `GET /api/sessao/:token/status` — Verificação de status e presença do dispositivo remoto (**RF10**)
- `PATCH /api/sessao/:id/finalizar` — Encerramento formal com consolidação analítica, síntese de IA e auditoria (**RF13**, **RF17**)
- `DELETE /api/sessao/:id/cancelar` — Cancelamento controlado de sessão pendente (**RF13**)
- `PATCH /api/sessao/:id/status` — Transição controlada da máquina de estados da sessão
- `GET /api/sessao/:id/resultado` — Consulta consolidada de telemetria, síntese da IA e anotações pós-sessão (**RF14**)
- `GET /api/sessao/:id/exportar` — Emissão de laudo clínico estruturado e anonimizado em conformidade com a LGPD (**RF20**)

### Anotações Clínicas (`/api/anotacao`)

- `POST /api/anotacao` — Registro de anotação clínica estruturada vinculada à sessão e ao paciente (**RF16**, **RN05**)
- `GET /api/anotacao/sessao/:sessaoId` — Listagem de anotações de uma sessão específica
- `GET /api/anotacao/paciente/:pacienteId` — Histórico longitudinal de anotações do prontuário (**RF15**)

---

## Gateway WebSocket em Tempo Real (`Backend/core/websocket/`)

- **`sessao.gateway.ts`:** gerencia salas isoladas (`sessao:{session_token}`), pareamento instantâneo (`dispositivo_conectado`), streaming de eventos de telemetria (`telemetria_amostra`), comandos clínicos em tempo real (`sessao:comando`: `pausar`, `retomar`, `ajustar_dda`, `encerrar`) e encerramento sincronizado (`finalizar_sessao`).
- **`sessao.reconnection.ts`:** preserva a sessão ativa com janela de tolerância de 60 segundos em quedas momentâneas de Wi-Fi do tablet/VR.
- **`socket.limiter.ts`:** aplica controle de taxa (*rate limiting*) por socket para prevenir sobrecarga por flooding de pacotes.
