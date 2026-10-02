# API de Sessão e Pareamento Remoto

> **Versão da API:** `v1.0.0` | **Base URL:** `http://localhost:3000/api` | **Swagger UI:** `http://localhost:3000/api/docs`

---

## 1. Visão Geral

O módulo de sessão gerencia o ciclo de vida do pareamento remoto entre o painel web do terapeuta e o dispositivo externo onde o jogo terapêutico é executado. A comunicação ocorre em duas camadas:

- **HTTP REST** — criação de sessão, handshake de pareamento e cancelamento.
- **WebSocket (Socket.IO)** — notificações em tempo real de conexão, heartbeat e perda de sinal.

### 1.1 Autenticação e Segurança

- **Endpoint de Criação (`POST /api/sessao/iniciar`):** Exige cabeçalho `Authorization: Bearer <TOKEN_JWT>`. O terapeuta autenticado precisa ter vínculo ativo com o paciente atendido (**RN04**).
- **Endpoint de Pareamento (`POST /api/sessao/parear`):** Consumido pelo dispositivo remoto (jogo). Não exige JWT — a autenticação é feita exclusivamente pelo `session_token` efêmero.
- **Endpoint de Cancelamento (`DELETE /api/sessao/:id`):** Exige JWT do terapeuta que criou a sessão.

### 1.2 Formato do Session Token

Código alfanumérico de **6 caracteres**, excluindo `O`, `0`, `I`, `1`, `l` para evitar ambiguidade visual. Expira em **15 minutos** e é revogado imediatamente após o primeiro pareamento bem-sucedido (**RNF03**).

Exemplo: `K9X2M4`

### 1.3 Diagrama de Sequência

```
[Terapeuta (Web)]                     [Servidor InTEA (API)]                    [Dispositivo Remoto (Jogo)]
        |                                       |                                           |
        |--- 1. POST /api/sessao/iniciar ------>|                                           |
        |<-- 2. Retorna PIN (ex: K9X2M4) -------|                                           |
        |                                       |                                           |
        |--- 3. Conecta WebSocket /sessao/PIN ->|                                           |
        |                                       |<-- 4. POST /api/sessao/parear (com PIN) --|
        |                                       |--- 5. Valida e retorna parâmetros ------->|
        |<-- 6. Emite 'dispositivo_conectado' --|                                           |
        |                                       |                                           |
        |<================= 7. Monitoramento Heartbeat (Ping/Pong) ========================>|
```

### 1.4 Status da Sessão

| Status | Descrição |
| :--- | :--- |
| `aguardando_pareamento` | Sessão criada, aguardando o dispositivo remoto conectar |
| `pareada` | Dispositivo conectado — intervenção clínica pode iniciar |
| `cancelada` | Terapeuta cancelou antes do pareamento |
| `encerrada` | Sessão finalizada normalmente |
| `conexao_perdida` | Heartbeat não recebido — dispositivo desconectado abruptamente |

### 1.5 Mapeamento de Códigos HTTP

| Código | Cenário |
| :--- | :--- |
| **`201 Created`** | Sessão criada com sucesso |
| **`200 OK`** | Pareamento realizado ou sessão cancelada |
| **`400 Bad Request`** | Payload inválido ou paciente/jogo inexistente |
| **`401 Unauthorized`** | JWT ausente ou expirado |
| **`403 Forbidden`** | Terapeuta sem vínculo ativo com o paciente (RN04) |
| **`404 Not Found`** | Session token não encontrado |
| **`410 Gone`** | Session token expirado ou já consumido |
| **`500 Internal Server Error`** | Falha interna do servidor |

---

## 2. Resumo dos Endpoints

| Método | Endpoint | Auth | Requisito | Finalidade |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/sessao/iniciar` | JWT | **RF10**, **RN04** | Cria sessão e gera o session token |
| `POST` | `/api/sessao/parear` | Token | **RF10** | Handshake do dispositivo remoto com a sessão |
| `DELETE` | `/api/sessao/:id` | JWT | **RF10**, **RF12** | Cancela sessão pendente |
| `GET` | `/api/sessao/:id` | JWT | **RF12** | Consulta status atual da sessão |

---

## 3. Detalhamento dos Endpoints

### 3.1 Criar Sessão e Emitir Token

- **Método:** `POST`
- **Rota:** `/api/sessao/iniciar`
- **Requisitos:** RF10, RN04
- **Auth:** `Authorization: Bearer <TOKEN_JWT>`

**Request Body:**

```json
{
  "paciente_id": "uuid-do-paciente",
  "jogo_id": 1
}
```

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `paciente_id` | `string (UUID)` | Sim | ID do paciente a ser atendido |
| `jogo_id` | `number` | Sim | ID do jogo selecionado na biblioteca |

**Resposta de Sucesso — `201 Created`:**

```json
{
  "data": {
    "sessao_id": "uuid-da-sessao",
    "session_token": "K9X2M4",
    "status": "aguardando_pareamento",
    "expires_at": "2026-10-02T12:00:00Z",
    "paciente": { "id": "uuid-do-paciente", "nome": "Lucas Gabriel Santos" },
    "jogo": { "id": 1, "nome": "Aventura das Cores" }
  },
  "message": "Sessão criada. Aguardando conexão do dispositivo remoto."
}
```

**Respostas de Erro:**

| Código | Motivo |
| :--- | :--- |
| `401` | JWT ausente ou inválido |
| `403` | Terapeuta sem vínculo ativo com o paciente (RN04) |
| `400` | `paciente_id` ou `jogo_id` ausentes ou inválidos |
| `404` | Paciente ou jogo não encontrado |

---

### 3.2 Handshake de Pareamento (Dispositivo Remoto)

- **Método:** `POST`
- **Rota:** `/api/sessao/parear`
- **Requisitos:** RF10
- **Auth:** Nenhuma (autenticado pelo `session_token`)

**Request Body:**

```json
{
  "session_token": "K9X2M4",
  "dispositivo": "tablet-android"
}
```

| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `session_token` | `string` | Sim | Token de 6 caracteres exibido pelo terapeuta |
| `dispositivo` | `string` | Não | Identificação do tipo/plataforma do dispositivo |

**Resposta de Sucesso — `200 OK`:**

```json
{
  "data": {
    "sessao_id": "uuid-da-sessao",
    "status": "pareada",
    "paciente_id": "uuid-do-paciente",
    "jogo": { "id": 1, "nome": "Aventura das Cores" },
    "paired_at": "2026-10-02T11:45:00Z"
  },
  "message": "Pareamento realizado com sucesso."
}
```

> Simultaneamente, o servidor emite o evento WebSocket `dispositivo_conectado` no canal `/sessao/K9X2M4` para o terapeuta.

**Respostas de Erro:**

| Código | Motivo |
| :--- | :--- |
| `400` | `session_token` ausente no body |
| `404` | Token não encontrado |
| `410` | Token expirado ou já consumido |

---

### 3.3 Cancelar Sessão Pendente

- **Método:** `DELETE`
- **Rota:** `/api/sessao/:id`
- **Requisitos:** RF10, RF12
- **Auth:** `Authorization: Bearer <TOKEN_JWT>`

**Resposta de Sucesso — `200 OK`:**

```json
{
  "data": { "sessao_id": "uuid-da-sessao", "status": "cancelada" },
  "message": "Sessão cancelada com sucesso."
}
```

**Respostas de Erro:**

| Código | Motivo |
| :--- | :--- |
| `401` | JWT ausente ou inválido |
| `403` | Terapeuta não é o dono da sessão |
| `404` | Sessão não encontrada |

---

### 3.4 Consultar Status da Sessão

- **Método:** `GET`
- **Rota:** `/api/sessao/:id`
- **Requisitos:** RF12
- **Auth:** `Authorization: Bearer <TOKEN_JWT>`

**Resposta de Sucesso — `200 OK`:**

```json
{
  "data": {
    "sessao_id": "uuid-da-sessao",
    "status": "pareada",
    "session_token": "K9X2M4",
    "expires_at": "2026-10-02T12:00:00Z",
    "paired_at": "2026-10-02T11:45:00Z",
    "paciente_id": "uuid-do-paciente",
    "jogo_id": 1,
    "terapeuta_id": "uuid-do-terapeuta"
  }
}
```

---

## 4. WebSocket — Eventos em Tempo Real

**Namespace:** `/sessao`
**Canal por sessão:** `/sessao/{session_token}`

### 4.1 Eventos Emitidos pelo Servidor

| Evento | Momento | Payload |
| :--- | :--- | :--- |
| `dispositivo_conectado` | Dispositivo faz pareamento com sucesso | `{ sessao_id, dispositivo, paired_at }` |
| `conexao_perdida` | Heartbeat não recebido em >= 10s | `{ sessao_id, motivo: "heartbeat_timeout" }` |
| `sessao_encerrada` | Sessão finalizada normalmente | `{ sessao_id, encerrada_em }` |

### 4.2 Heartbeat (Ping/Pong)

O dispositivo remoto deve responder ao evento `ping` com `pong` a cada **5 segundos**. Após **2 pings sem resposta** (>= 10s), o servidor emite `conexao_perdida` e reverte o status da sessão para `aguardando_pareamento` (**RNF04**).

---

## 5. DTOs e Schemas

### SessaoIniciarDTO

```typescript
interface SessaoIniciarDTO {
  paciente_id: string; // UUID
  jogo_id: number;
}
```

### SessaoPararDTO

```typescript
interface SessaoPararDTO {
  session_token: string; // 6 caracteres alfanuméricos
  dispositivo?: string;
}
```

### SessaoResponse

```typescript
interface SessaoResponse {
  sessao_id: string;
  session_token: string;
  status: 'aguardando_pareamento' | 'pareada' | 'cancelada' | 'encerrada' | 'conexao_perdida';
  expires_at: string; // ISO 8601
  paired_at?: string; // ISO 8601
  paciente_id: string;
  jogo_id: number;
  terapeuta_id: string;
}
```

---

## 6. Exemplos com cURL

**Criar sessão:**

```bash
curl -X POST http://localhost:3000/api/sessao/iniciar \
  -H "Authorization: Bearer <TOKEN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "paciente_id": "uuid-do-paciente", "jogo_id": 1 }'
```

**Parear dispositivo:**

```bash
curl -X POST http://localhost:3000/api/sessao/parear \
  -H "Content-Type: application/json" \
  -d '{ "session_token": "K9X2M4", "dispositivo": "tablet-android" }'
```

**Cancelar sessão:**

```bash
curl -X DELETE http://localhost:3000/api/sessao/uuid-da-sessao \
  -H "Authorization: Bearer <TOKEN_JWT>"
```
