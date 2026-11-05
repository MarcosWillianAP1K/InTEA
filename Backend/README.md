# InTEA — Backend API RESTful & Gateway WebSocket

API RESTful e Gateway WebSocket em tempo real do ecossistema InTEA desenvolvidos com **Node.js**, **Express**, **Socket.IO**, **TypeScript** e **PostgreSQL (Supabase)**, seguindo arquitetura em camadas limpas (**Clean MVC**) com tipagem estrita e validação integral das regras clínicas e diretrizes de integridade e segurança do ecossistema.

---

## Documentação e Especificação Técnica

- **[Arquitetura Completa do Ecossistema (`../docs/architecture.md`)](../docs/architecture.md)**
- **[Especificação Técnica da API RESTful (`../docs/api-pacientes-jogos.md`)](../docs/api-pacientes-jogos.md)**
- **[Roteiro de Testes e Homologação (`../docs/roteiro-testes.md`)](../docs/roteiro-testes.md)**
- **Swagger UI Interativo:** `http://localhost:3000/api/docs` (com o servidor em execução).

---

## Como Executar o Backend

### Pré-requisitos

- Node.js (versão 20 LTS ou superior)
- npm
- Projeto configurado no Supabase com o schema e migrações aplicados (`Database/database.sql` e `Database/migrations/`)

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

# Suíte de testes automatizados (Vitest — 56 suítes de testes cobrindo integração e regras de negócio)
npm test

# Build de produção (compilação TypeScript para dist/)
npm run build

# Seed de jogos terapêuticos e manifestos de teste no banco de dados
npm run seed
```

---

## Módulos e Rotas da API REST (`/api`)

### 1. Autenticação e Credenciais (`/api/auth`)

- `POST /api/auth/login` — Autenticação de terapeuta e emissão de tokens JWT (`access_token`, `refresh_token`).
- `POST /api/auth/refresh` — Renovação silenciosa do `access_token` via `refresh_token`.
- `POST /api/auth/logout` — Encerramento seguro da sessão autenticada.
- `POST /api/auth/recuperar-senha` — Disparo de email com token efêmero para recuperação de senha.
- `POST /api/auth/redefinir-senha` — Validação do token efêmero e redefinição de senha com expiração de 30 minutos.
- `GET /api/auth/me` — Consulta dos dados cadastrais, conselho e clínica vinculada do terapeuta logado.

### 2. Terapeutas (`/api/terapeuta`)

- `POST /api/terapeuta/cadastro` — Registro de novo terapeuta e especialidades clínicas.
- `GET /api/terapeuta/:id` — Consulta de perfil profissional com dados de conselho (CRP/CREFITO/CRM).
- `PUT /api/terapeuta/:id` — Atualização cadastral de dados profissionais e áreas de atuação clínica.

### 3. Administração Global e Institucional (`/api/admin`)

*Requer autenticação JWT e privilégio exclusivo de SuperAdmin.*

- `GET /api/admin/clinicas` / `POST /api/admin/clinicas` — Listagem com filtros e cadastro de clínicas.
- `GET /api/admin/clinicas/:id` / `PATCH /api/admin/clinicas/:id` — Consulta e atualização de clínica.
- `PATCH /api/admin/clinicas/:id/ativar` / `desativar` — Gestão do ciclo de ativação de instituição.
- `GET /api/admin/terapeutas` — Listagem multitenant de terapeutas por clínica com filtros de status.
- `GET /api/admin/terapeutas/:id` / `PATCH /api/admin/terapeutas/:id` — Consulta e atualização de terapeuta.
- `PATCH /api/admin/terapeutas/:id/ativar` / `desativar` — Moderação administrativa de terapeutas.
- `GET /api/admin/auditoria/estatisticas` — Indicadores consolidados de conformidade e segurança da plataforma.
- `GET /api/admin/auditoria/instituicao/:clinicaId` — Trilha completa de auditoria forense isolada por instituição.

### 4. Auditoria Forense e Governança Clínica (`/api/auditoria`)

- `GET /api/auditoria` — Listagem paginada de eventos imutáveis com filtros por `pacienteId`, `tipoAcao` e isolamento institucional.
- `GET /api/auditoria/prontuario` — Consulta dos registros de acesso a prontuários com filtros por período e profissional.
- `GET /api/auditoria/estatisticas` — Métricas agregadas de governança clínica e conformidade LGPD.
- `GET /api/auditoria/sessao/:sessaoId` — Linha do tempo cronológica imutável da intervenção clínica.
- `POST /api/auditoria` — Registro manual/sistêmico de evento forense com validação estrita de autoria via JWT.

### 5. Pacientes e Equipe Multidisciplinar (`/api/paciente`)

- `GET /api/paciente` — Listagem paginada com busca textual e filtros demográficos.
- `GET /api/paciente/:id` — Prontuário integral com verificação de vínculo institucional e registro de auditoria de acesso.
- `GET /api/paciente/:id/historico` — Histórico longitudinal com cálculo consolidado de engajamento clínico e métricas evolutivas.
- `GET /api/paciente/:id/historico/jogo/:jogoId` — Séries temporais e evolução longitudinal filtradas por jogo específico.
- `POST /api/paciente` — Cadastro de paciente, perfil clínico, gatilhos sensoriais e responsável legal com autoria vinculada.
- `PUT, PATCH /api/paciente/:id` — Atualização cadastral com validação de vínculo institucional.
- `DELETE /api/paciente/:id` — Inativação lógica (*Soft Delete*) preservando histórico clínico e sessões passadas.
- `PATCH /api/paciente/:id/reativar` — Reativação de prontuário inativo.
- `DELETE /api/paciente/:id/hard` — Exclusão permanente restrita a administradores.
- `GET /api/paciente/:id/terapeutas` — Lista os especialistas ativos vinculados à equipe multidisciplinar do paciente.
- `POST /api/paciente/:id/terapeutas` — Vincula profissional da mesma clínica (`201`), rejeitando clínicas distintas com **`403 Forbidden`** e duplicidades com **`409 Conflict`**.
- `DELETE /api/paciente/:id/terapeutas/:terapeutaId` — Desvinculação com proteção contra abandono técnico; retorna **`409 Conflict`** ao tentar remover o último terapeuta ativo do paciente.
- `GET /api/paciente/:id/prontuario/exportar` — Exportação estruturada e anonimizada do prontuário para laudo externo.

### 6. Catálogo e Biblioteca de Jogos (`/api/jogos`)

- `GET /api/jogos` — Catálogo unificado com filtros por objetivo terapêutico e status operacional.
- `POST /api/jogos` — Cadastro de jogo com geração de slug identificador (`id_jogo`) e validação de conformidade.
- `GET /api/jogos/:id` — Detalhes técnicos, manifesto clínico padronizado e laudo de conformidade.
- `PUT, PATCH /api/jogos/:id` — Atualização de metadados ou transição de ciclo operacional.
- `DELETE /api/jogos/:id` — Exclusão controlada de jogo (bloqueada se houver histórico de sessões associadas).
- `POST /api/jogos/validar-manifesto` — Validador formal de manifestos clínicos contra o schema contratual do ecossistema.
- `POST /api/jogos/:id/validar-telemetria` — Validação estrita de telemetria contra métricas sem tipagem cadastrada.

### 7. Sessão Clínica, Pareamento e Concorrência (`/api/sessao`)

- `GET /api/sessao/codigo-pareamento` — Emissão de PIN alfanumérico único e efêmero para pareamento remoto.
- `POST /api/sessao/parear` — Handshake do dispositivo externo conectando à sala WebSocket com limitação de taxa.
- `POST /api/sessao/iniciar` — Inicialização de sessão com injeção de contexto DDA e **bloqueio de concorrência**, retornando **`409 Conflict`** se o paciente já estiver em atendimento ativo.
- `GET /api/sessao` — Listagem com visibilidade compartilhada para toda a equipe multidisciplinar vinculada quando informado `pacienteId`.
- `GET /api/sessao/contexto-sugerido/:pacienteId` — Sugestão dinâmica de parâmetros DDA pré-sessão baseados nos gatilhos clínicos e histórico do prontuário.
- `GET /api/sessao/:id` — Detalhes completos da sessão, telemetria parcial e status atual da máquina de estados.
- `GET /api/sessao/token/:token` — Consulta de dados da intervenção através do `session_token`/PIN.
- `GET /api/sessao/:token/status` — Verificação de presença e conectividade do dispositivo externo.
- `PATCH /api/sessao/:id/finalizar` — Encerramento formal privativo do terapeuta condutor (**`403 Forbidden`** para observadores/colegas), acionando consolidação analítica e síntese de IA.
- `DELETE /api/sessao/:id/cancelar` — Cancelamento controlado de sessão pendente privativo do condutor (**`403 Forbidden`** para terceiros).
- `PATCH /api/sessao/:id/status` — Transição controlada da máquina de estados da sessão.
- `GET /api/sessao/:id/resultado` — Consulta consolidada pós-sessão com telemetria contínua, síntese da IA e anotações vinculadas.
- `GET /api/sessao/:id/exportar` — Emissão de laudo clínico estruturado e anonimizado em conformidade com a LGPD.

### 8. Anotações Clínicas Longitudinais (`/api/anotacao`)

- `POST /api/anotacao` — Registro unificado de anotação clínica vinculada à sessão ou diretamente ao prontuário.
- `GET /api/anotacao` — Listagem unificada com suporte a filtros combinados (`pacienteId`, `sessaoId`, `terapeutaId`, período e busca textual).
- `PATCH /api/anotacao/:id` — Edição de anotação estritamente privativa do autor original (**`403 Forbidden`** para demais especialistas da equipe).
- `PATCH /api/anotacao/:id/reativar` — Reativação de anotação clínica inativada.
- `DELETE /api/anotacao/:id` — Inativação lógica (*Soft Delete*) privativa do autor original (**`403 Forbidden`**).
- `DELETE /api/anotacao/:id/permanente` — Exclusão definitiva de anotação restrita a administradores.

---

## Gateway WebSocket em Tempo Real (`Backend/core/websocket/`)

O subsistema WebSocket opera sobre Socket.IO com autenticação via JWT ou `session_token`:

- **Isolamento de Salas (`sessao:{session_token}`):** Cada intervenção possui uma sala isolada onde trafegam eventos de telemetria e comandos de controle.
- **Modo Observador da Equipe Multidisciplinar (`role: 'observador_equipe'`):** Especialistas vinculados que acessam o Cockpit conectam-se como observadores passivos; o gateway entrega telemetria contínua em tempo real ($< 100$\,ms) e bloqueia qualquer envio de comando clínico com código `PERMISSAO_NEGADA`.
- **Presença da Equipe em Tempo Real (`equipe:presenca`):** Notifica os clientes conectados sobre a lista de especialistas acompanhando a intervenção ao vivo.
- **Streaming de Telemetria (`telemetria_amostra`):** Entrega de amostras de engajamento, desregulação sensorial e métricas em tempo real do jogo.
- **Comandos Clínicos DDA (`sessao:comando`):** Intervenções em tempo real disparadas privativamente pelo terapeuta condutor (`pausar`, `retomar`, `ajustar_dda`, `encerrar`).
- **Resiliência a Quedas Transitórias (`sessao.reconnection.ts`):** Janela de tolerância de 60 segundos com preservação de estado da sessão em quedas transitórias de rede Wi-Fi do tablet/VR.
- **Controle de Taxa (`socket.limiter.ts`):** Proteção contra *packet flooding* por socket conectado.
