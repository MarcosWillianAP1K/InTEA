# API de Pacientes, Jogos, Sessão e Telemetria

> **Versão da API:** `v1.0.0` | **Base URL:** `http://localhost:3000/api` | **Swagger UI:** `http://localhost:3000/api/docs` | **WebSocket Gateway:** `ws://localhost:3000/sessao`

---

## 1. Visão Geral e Padrões de Comunicação

A API REST do InTEA opera sob o padrão JSON sobre HTTP/HTTPS, seguindo a arquitetura MVC (Model-View-Controller) com Node.js, Express, TypeScript e persistência no PostgreSQL via Supabase.

### 1.1 Autenticação e Segurança

- Os endpoints protegidos exigem o cabeçalho `Authorization: Bearer <TOKEN_JWT>`, validado pelo `authMiddleware` via Supabase Auth.
- O controle de acesso clínico aos prontuários e dados confidenciais do paciente é reforçado pelo middleware `verificarVisibilidadePaciente` (**RN04**), que valida o vínculo ativo terapeuta-paciente e a mesma afiliação institucional clínica.

### 1.2 Padrão de Respostas HTTP e Tratamento de Erros

Todas as respostas seguem formatos previsíveis:

- **Sucesso (200 OK / 201 Created):**

  ```json
  {
    "data": { ... } | [ ... ],
    "message": "Mensagem informativa opcional",
    "meta": { "total": 25, "page": 1, "limit": 10, "totalPages": 3 }
  }
  ```

- **Erro ou Rejeição de Validação (400, 401, 403, 404, 409, 422, 500):**

  ```json
  {
    "error": "Descrição resumida da falha",
    "detalhes": "Informação técnica complementar ou mensagem do banco",
    "erros": [ "Lista detalhada de inconsistências de validação DTO" ],
    "regraViolada": "Identificação de norma clínica (ex: RN02 - Fallback de Métrica Proibido)"
  }
  ```

### 1.3 Mapeamento de Códigos de Status HTTP

| Código | Significado HTTP | Cenário de Aplicação no InTEA |
| :--- | :--- | :--- |
| **`200 OK`** | Requisição bem-sucedida | Consultas GET, atualizações PUT/PATCH e validações aprovadas. |
| **`201 Created`** | Recurso criado com sucesso | Cadastro de paciente (`POST /api/paciente`) e novos vínculos (`POST /api/paciente/:id/terapeutas`). |
| **`400 Bad Request`** | Parâmetros ou payload inválidos | UUID malformado, CPF inválido, falha de validação DTO ou conflito institucional de clínicas. |
| **`401 Unauthorized`** | Não autenticado | Cabeçalho `Authorization` ausente, token malformado ou JWT expirado no Supabase Auth. |
| **`403 Forbidden`** | Acesso negado / Sem permissão | Terapeuta inativo, de clínica distinta ou sem vínculo ativo com o paciente (**RN04**). |
| **`404 Not Found`** | Recurso não encontrado | Paciente, terapeuta ou jogo inexistente no banco de dados. |
| **`409 Conflict`** | Conflito de integridade única ou estado de sessão | CPF já cadastrado, sessão já pareada/em andamento ou divergência entre o jogo executado e o selecionado na sessão. |
| **`410 Gone`** | Recurso expirado ou permanentemente indisponível | Token PIN de pareamento remoto expirado (TTL de 15 minutos esgotado) ou tentativa de operar sobre sessão cancelada/finalizada. |
| **`422 Unprocessable Entity`** | Regra de negócio violada | Validação estrita de telemetria rejeitada por violar a **RN02** (métrica sem tipo ou valor fora de domínio). |
| **`500 Internal Server Error`** | Erro interno do servidor | Exceção não tratada ou falha de conectividade com o banco Supabase. |

---

## 2. Módulo de Pacientes (`/api/paciente`)

### 2.1 Resumo dos Endpoints

| Método | Endpoint | Protegido | Requisito / Regra | Finalidade |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/paciente` | Não | **RF19**, **RN05** | Lista pacientes com busca, filtros de idade e paginação |
| `GET` | `/api/paciente/:id` | Sim (JWT + Vínculo) | **RF06**, **RN04** | Consulta prontuário e dados completos do paciente |
| `POST` | `/api/paciente` | Sim (Recomendado) | **RF06**, **RF18** | Cadastra novo paciente e responsável principal |
| `PUT` | `/api/paciente/:id` | Sim (JWT + Vínculo) | **RF06**, **RN04** | Atualiza dados cadastrais do paciente |
| `DELETE` | `/api/paciente/:id` | Sim | **RN05** | Soft delete: inativa o paciente preservando prontuário |
| `PATCH` | `/api/paciente/:id/reativar` | Sim | **RN05** | Reativa paciente inativo (`status_ativo = true`) |
| `DELETE` | `/api/paciente/:id/hard` | Sim (Admin/Dev) | Testes | Exclusão física permanente (apenas DEV e testes) |
| `GET` | `/api/paciente/:id/terapeutas` | Sim (JWT + Vínculo) | **RF18**, **RN04** | Lista terapeutas da equipe multidisciplinar vinculados |
| `POST` | `/api/paciente/:id/terapeutas` | Sim (JWT) | **RF18**, **RF21** | Vincula um novo terapeuta da mesma clínica ao paciente |
| `DELETE` | `/api/paciente/:id/terapeutas/:terapeutaId` | Sim (JWT) | **RF18** | Remove o vínculo do terapeuta com o paciente |

---

### 2.2 Detalhamento de Rotas — Pacientes

#### Rota 1: Listar Pacientes com Busca e Paginação

- **Método:** `GET`

- **URL:** `/api/paciente`
- **Headers Requeridos:** `Content-Type: application/json`
- **Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição | Exemplo |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `nome` | `string` | Não | — | Busca textual parcial insensível a caixa alta/baixa (`ilike %termo%`) | `Henrique` |
| `cpf` | `string` | Não | — | Busca exata por CPF (aceita com ou sem máscara) | `529.982.247-25` |
| `idadeMin` | `integer` | Não | — | Idade mínima calculada sem drift de fuso horário | `4` |
| `idadeMax` | `integer` | Não | — | Idade máxima calculada sem drift de fuso horário | `12` |
| `incluirInativos` | `boolean` | Não | `false` | Se `true`, inclui pacientes inativados por soft delete | `false` |
| `page` | `integer` | Não | `1` | Índice da página atual (início em 1) | `1` |
| `limit` | `integer` | Não | `10` | Registros por página (teto de segurança: máx 100) | `10` |

- **Exemplo de Chamada:**

  ```http
  GET /api/paciente?nome=Pedro&idadeMin=4&idadeMax=10&page=1&limit=10 HTTP/1.1
  Host: localhost:3000
  ```

- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": [
        {
          "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
          "nome": "Pedro Henrique Silveira",
          "data_nascimento": "2018-06-15",
          "cpf": "529.982.247-25",
          "telefone": "(11) 98765-4321",
          "cep": "01310-100",
          "cidade": "São Paulo",
          "estado": "SP",
          "endereco": "Avenida Paulista",
          "bairro": "Bela Vista",
          "numero": "1000",
          "complemento": "Apto 42",
          "status_ativo": true,
          "clinica_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          "created_at": "2026-09-20T10:15:30.000Z",
          "updated_at": "2026-09-20T10:15:30.000Z",
          "responsaveis": [
            {
              "responsavel": {
                "id": "e2b74052-16a3-4813-9f87-217bc3c02341",
                "nome": "Juliana Silveira",
                "telefone": "(11) 99887-6655",
                "cpf": "364.721.890-50",
                "parentesco": "Mãe"
              }
            }
          ]
        }
      ],
      "meta": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
      }
    }
    ```

  - **Status `500 Internal Server Error`:**

    ```json
    {
      "error": "Erro interno ao listar pacientes.",
      "detalhes": "Conexão recusada com o serviço Supabase."
    }
    ```

---

#### Rota 2: Consultar Prontuário e Detalhes de um Paciente

- **Método:** `GET`

- **URL:** `/api/paciente/:id`
- **Headers Requeridos:**
  - `Authorization: Bearer <TOKEN_JWT>`
- **Path Parameters:**
  - `id` (`string`, UUID obrigatório): Identificador único do paciente.
- **Segurança e Regras Clínicas:**
  - Protegido por `authMiddleware` e `verificarVisibilidadePaciente` (**RN04**).
  - O terapeuta só visualiza o prontuário caso possua vínculo ativo na tabela `terapeuta_paciente` e pertença à mesma clínica institucional. SuperAdmins possuem auditoria global.
- **Exemplo de Chamada:**

  ```http
  GET /api/paciente/7c9e6679-7425-40de-944b-e07fc1f90ae7 HTTP/1.1
  Host: localhost:3000
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...
  ```

- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "nome": "Pedro Henrique Silveira",
        "data_nascimento": "2018-06-15",
        "cpf": "529.982.247-25",
        "telefone": "(11) 98765-4321",
        "cep": "01310-100",
        "cidade": "São Paulo",
        "estado": "SP",
        "status_ativo": true,
        "responsaveis": [
          {
            "responsavel": {
              "id": "e2b74052-16a3-4813-9f87-217bc3c02341",
              "nome": "Juliana Silveira",
              "telefone": "(11) 99887-6655",
              "cpf": "364.721.890-50",
              "parentesco": "Mãe"
            }
          }
        ],
        "terapeutas": [
          {
            "terapeuta": {
              "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
              "nome": "Dra. Carolina Mendes",
              "crp": "06/123456",
              "email": "carolina.mendes@intea.com.br"
            }
          }
        ]
      }
    }
    ```

  - **Status `400 Bad Request`:**

    ```json
    {
      "error": "O identificador do paciente deve ser um UUID válido."
    }
    ```

  - **Status `401 Unauthorized`:**

    ```json
    {
      "error": "Acesso não autorizado. Forneça um token no cabeçalho Authorization: Bearer <token>."
    }
    ```

  - **Status `403 Forbidden` (RN04 - Sem Vínculo ou Clínica Conflitante):**

    ```json
    {
      "error": "Acesso negado: o terapeuta não possui vínculo ativo com este paciente."
    }
    ```

  - **Status `404 Not Found`:**

    ```json
    {
      "error": "Paciente não encontrado."
    }
    ```

---

#### Rota 3: Cadastrar Novo Paciente e Responsável

- **Método:** `POST`

- **URL:** `/api/paciente`
- **Headers Requeridos:** `Content-Type: application/json`
- **Request Body (JSON):**
  - Objeto `CriarPacienteDTO`:
    - `nome` (`string`, obrigatório, mín. 3 caracteres)
    - `data_nascimento` (`string`, obrigatório, formato `YYYY-MM-DD`, não pode ser futura)
    - `cpf` (`string`, obrigatório, CPF válido com ou sem pontuação)
    - `clinica_id` (`string`, opcional, UUID da clínica)
    - `telefone` (`string`, opcional, telefone fixo ou celular com DDD)
    - `cep` (`string`, opcional, CEP 8 dígitos)
    - `cidade` (`string`, opcional)
    - `estado` (`string`, opcional, UF 2 letras)
    - `endereco` (`string`, opcional)
    - `bairro` (`string`, opcional)
    - `numero` (`string`, opcional)
    - `complemento` (`string`, opcional)
    - `responsavel` (`object`, opcional):
      - `nome` (`string`, obrigatório se responsavel enviado)
      - `telefone` (`string`, obrigatório)
      - `cpf` (`string`, opcional, CPF válido)
      - `email` (`string`, opcional, formato válido)
      - `parentesco` (`string`, opcional, ex: "Mãe", "Pai", "Tutor Legal")

- **Exemplo de Request Body:**

  ```json
  {
    "nome": "Lucas Gabriel Santos",
    "data_nascimento": "2019-04-10",
    "cpf": "123.456.789-09",
    "telefone": "(11) 97777-6666",
    "cep": "04567-000",
    "cidade": "São Paulo",
    "estado": "SP",
    "endereco": "Rua dos Pinheiros",
    "bairro": "Pinheiros",
    "numero": "320",
    "complemento": "Bloco B, Apto 12",
    "responsavel": {
      "nome": "Mariana Santos",
      "telefone": "(11) 98888-5555",
      "cpf": "987.654.321-12",
      "email": "mariana.santos@email.com",
      "parentesco": "Mãe"
    }
  }
  ```

- **Respostas:**
  - **Status `201 Created`:**

    ```json
    {
      "data": {
        "id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
        "nome": "Lucas Gabriel Santos",
        "data_nascimento": "2019-04-10",
        "cpf": "123.456.789-09",
        "telefone": "(11) 97777-6666",
        "cep": "04567-000",
        "cidade": "São Paulo",
        "estado": "SP",
        "endereco": "Rua dos Pinheiros",
        "bairro": "Pinheiros",
        "numero": "320",
        "complemento": "Bloco B, Apto 12",
        "status_ativo": true,
        "created_at": "2026-09-23T18:00:00.000Z",
        "updated_at": "2026-09-23T18:00:00.000Z",
        "responsaveis": [
          {
            "responsavel": {
              "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
              "nome": "Mariana Santos",
              "telefone": "(11) 98888-5555",
              "cpf": "987.654.321-12",
              "parentesco": "Mãe"
            }
          }
        ]
      },
      "message": "Paciente cadastrado com sucesso."
    }
    ```

  - **Status `400 Bad Request` (Erros de Validação DTO):**

    ```json
    {
      "error": "Erro de validação nos dados do paciente.",
      "erros": [
        "O campo 'cpf' é obrigatório e deve ser um CPF válido.",
        "A data de nascimento informada não pode estar no futuro."
      ]
    }
    ```

  - **Status `409 Conflict` (Unicidade de CPF):**

    ```json
    {
      "error": "Já existe um paciente cadastrado com este CPF."
    }
    ```

  - **Status `500 Internal Server Error`:**

    ```json
    {
      "error": "Erro interno ao cadastrar paciente.",
      "detalhes": "database error: column does not exist"
    }
    ```

---

#### Rota 4: Atualizar Dados de um Paciente

- **Método:** `PUT`

- **URL:** `/api/paciente/:id`
- **Headers Requeridos:**
  - `Authorization: Bearer <TOKEN_JWT>`
  - `Content-Type: application/json`
- **Path Parameters:**
  - `id` (`string`, UUID obrigatório): ID do paciente a ser atualizado.
- **Segurança e Validação:**
  - Executa `authMiddleware` e `verificarVisibilidadePaciente` (**RN04**).
  - Rejeita payloads com CPF inválido, datas futuras ou campos incorretos.
- **Request Body (JSON):**

  ```json
  {
    "telefone": "(11) 99999-1122",
    "cidade": "Campinas",
    "estado": "SP",
    "endereco": "Avenida Barão de Itapura",
    "numero": "1500"
  }
  ```

- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "nome": "Pedro Henrique Silveira",
        "telefone": "(11) 99999-1122",
        "cidade": "Campinas",
        "estado": "SP",
        "endereco": "Avenida Barão de Itapura",
        "numero": "1500",
        "status_ativo": true,
        "updated_at": "2026-09-23T18:15:00.000Z"
      },
      "message": "Paciente atualizado com sucesso."
    }
    ```

  - **Status `400 Bad Request`:**

    ```json
    {
      "error": "Erro de validação na atualização do paciente.",
      "erros": [
        "O campo 'telefone' fornecido possui formato inválido."
      ]
    }
    ```

  - **Status `401 Unauthorized`:**

    ```json
    {
      "error": "Token JWT inválido ou expirado."
    }
    ```

  - **Status `403 Forbidden`:**

    ```json
    {
      "error": "Acesso negado: o terapeuta não possui vínculo ativo com este paciente."
    }
    ```

  - **Status `404 Not Found`:**

    ```json
    {
      "error": "Paciente não encontrado para atualização."
    }
    ```

  - **Status `409 Conflict`:**

    ```json
    {
      "error": "Já existe outro paciente cadastrado com este CPF."
    }
    ```

---

#### Rota 5: Desativação de Paciente (Soft Delete - RN05)

- **Método:** `DELETE`

- **URL:** `/api/paciente/:id`
- **Regra Clínica RN05:**
  - Jamais apaga fisicamente registros de prontuários clínicos.
  - Define `status_ativo = false` e atualiza `updated_at`.
- **Path Parameters:**
  - `id` (`string`, UUID obrigatório).
- **Exemplo de Chamada:**

  ```http
  DELETE /api/paciente/7c9e6679-7425-40de-944b-e07fc1f90ae7 HTTP/1.1
  Host: localhost:3000
  ```

- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "nome": "Pedro Henrique Silveira",
        "status_ativo": false,
        "updated_at": "2026-09-23T18:20:00.000Z"
      },
      "message": "Paciente desativado com sucesso (soft delete aplicado)."
    }
    ```

  - **Status `400 Bad Request`:**

    ```json
    {
      "error": "O parâmetro ID deve ser um UUID válido."
    }
    ```

  - **Status `404 Not Found`:**

    ```json
    {
      "error": "Paciente não encontrado para desativação."
    }
    ```

---

#### Rota 6: Reativar Paciente Inativo

- **Método:** `PATCH`

- **URL:** `/api/paciente/:id/reativar`
- **Path Parameters:** `id` (`string`, UUID obrigatório).
- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "status_ativo": true,
        "updated_at": "2026-09-23T18:25:00.000Z"
      },
      "message": "Paciente reativado com sucesso."
    }
    ```

  - **Status `404 Not Found`:**

    ```json
    {
      "error": "Paciente não encontrado para reativação."
    }
    ```

---

#### Rota 7: Exclusão Física Permanente (Hard Delete - DEV/Testes)

- **Método:** `DELETE`

- **URL:** `/api/paciente/:id/hard`
- **Aviso de Segurança:**
  - Restrito a testes unitários, automação em CI e testes locais. Não deve ser invocado em ambiente de produção clínica.
- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "message": "Paciente excluído fisicamente do banco com sucesso (hard delete para testes)."
    }
    ```

  - **Status `404 Not Found`:**

    ```json
    {
      "error": "Paciente não encontrado para exclusão física."
    }
    ```

---

#### Rota 8: Listar Terapeutas Vinculados ao Paciente (Equipe Multidisciplinar)

- **Método:** `GET`

- **URL:** `/api/paciente/:id/terapeutas`
- **Headers Requeridos:** `Authorization: Bearer <TOKEN_JWT>`
- **Segurança:** `authMiddleware` + `verificarVisibilidadePaciente` (**RN04**).
- **Path Parameters:** `id` (`string`, UUID do paciente).
- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": [
        {
          "created_at": "2026-09-20T10:30:00.000Z",
          "terapeuta": {
            "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            "nome": "Dra. Carolina Mendes",
            "crp": "06/123456",
            "especialidade": "Psicologia Cognitivo-Comportamental",
            "email": "carolina.mendes@intea.com.br",
            "status_ativo": true
          }
        },
        {
          "created_at": "2026-09-22T14:10:00.000Z",
          "terapeuta": {
            "id": "4bb67a12-88ef-4109-b132-7c8899aabbcc",
            "nome": "Dr. Fernando Souza",
            "crp": "06/987654",
            "especialidade": "Fonoaudiologia",
            "email": "fernando.souza@intea.com.br",
            "status_ativo": true
          }
        }
      ]
    }
    ```

  - **Status `403 Forbidden`:**

    ```json
    {
      "error": "Acesso negado: o terapeuta não possui vínculo ativo com este paciente."
    }
    ```

  - **Status `404 Not Found`:**

    ```json
    {
      "error": "Paciente não encontrado ao listar terapeutas vinculados."
    }
    ```

---

#### Rota 9: Vincular Novo Terapeuta ao Paciente (RF18)

- **Método:** `POST`

- **URL:** `/api/paciente/:id/terapeutas`
- **Headers Requeridos:**
  - `Authorization: Bearer <TOKEN_JWT>`
  - `Content-Type: application/json`
- **Path Parameters:**
  - `id` (`string`, UUID do paciente).
- **Request Body (JSON):**

  ```json
  {
    "terapeuta_id": "4bb67a12-88ef-4109-b132-7c8899aabbcc"
  }
  ```

- **Regras de Validação:**
  - Bloqueia vínculo caso o paciente ou o terapeuta esteja inativo.
  - **Isolamento Multitenant Clínico:** Bloqueia a tentativa de associar profissionais pertencentes a clínicas distintas.

- **Respostas:**
  - **Status `201 Created`:**

    ```json
    {
      "message": "Terapeuta vinculado ao paciente com sucesso."
    }
    ```

  - **Status `400 Bad Request` (Bloqueio Institucional / Inativo):**

    ```json
    {
      "error": "Bloqueio de segurança: Não é permitido vincular terapeutas de clínicas diferentes."
    }
    ```

  - **Status `401 Unauthorized`:**

    ```json
    {
      "error": "Acesso não autorizado. Forneça um token no cabeçalho Authorization: Bearer <token>."
    }
    ```

  - **Status `404 Not Found`:**

    ```json
    {
      "error": "Terapeuta não encontrado para vinculação."
    }
    ```

---

#### Rota 10: Desvincular Terapeuta do Paciente (RF18)

- **Método:** `DELETE`

- **URL:** `/api/paciente/:id/terapeutas/:terapeutaId`
- **Headers Requeridos:** `Authorization: Bearer <TOKEN_JWT>`
- **Path Parameters:**
  - `id` (`string`, UUID do paciente).
  - `terapeutaId` (`string`, UUID do terapeuta a ser desvinculado).
- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "message": "Vínculo do terapeuta com o paciente removido com sucesso."
    }
    ```

  - **Status `400 Bad Request`:**

    ```json
    {
      "error": "O parâmetro \"terapeutaId\" deve ser um UUID válido."
    }
    ```

  - **Status `404 Not Found`:**

    ```json
    {
      "error": "Paciente não encontrado para desvincular terapeuta."
    }
    ```

---

## 3. Módulo da Biblioteca de Jogos (`/api/jogos`)

### 3.1 Resumo dos Endpoints

| Método | Endpoint | Protegido | Requisito / Regra | Finalidade |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/jogos` | Não | **RF09**, **RF19** | Catálogo de jogos terapêuticos com filtros e paginação |
| `GET` | `/api/jogos/:id` | Não | **RF09**, **RNF02** | Detalhes do jogo e manifesto JSON |
| `GET` | `/api/jogos/:id/manifesto` | Não | **RNF02** | Manifesto de métricas com laudo de conformidade |
| `POST` | `/api/jogos/validar-manifesto` | Não | **RNF02**, **RN02** | Validação sintática e semântica de manifesto de jogo |
| `POST` | `/api/jogos/:id/validar-telemetria` | Não | **RN02**, **RNF02** | Validação estrita de evento antes de persistir no prontuário |

---

### 3.2 Detalhamento de Rotas — Jogos

#### Rota 1: Catálogo Geral de Jogos (Biblioteca Terapêutica)

- **Método:** `GET`

- **URL:** `/api/jogos`
- **Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição | Exemplo |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `objetivo` | `string` | Não | — | Filtro por objetivo clínico (ex: `foco_atencional`, `regulacao_emocional`, `linguagem`) | `foco_atencional` |
| `page` | `integer` | Não | `1` | Página atual dos resultados | `1` |
| `limit` | `integer` | Não | `10` | Quantidade de jogos retornados por página | `10` |

- **Exemplo de Chamada:**

  ```http
  GET /api/jogos?objetivo=foco_atencional&page=1&limit=10 HTTP/1.1
  Host: localhost:3000
  ```

- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": [
        {
          "id": "1",
          "nome": "Aventura das Cores",
          "descricao": "Estimula atenção compartilhada e reconhecimento facial através de estímulos cromáticos.",
          "versao": "1.2.0",
          "status_instalacao": "instalado",
          "objetivo_clinico": "foco_atencional",
          "manifesto_json": {
            "id_jogo": "aventura-das-cores",
            "nome": "Aventura das Cores",
            "versao": "1.2.0",
            "objetivo_clinico": "foco_atencional",
            "metricas_suportadas": [
              {
                "id_metrica": "tempo_resposta",
                "tipo_metrica": "numerica",
                "unidade": "segundos"
              },
              {
                "id_metrica": "nivel_frustracao",
                "tipo_metrica": "categorica",
                "valores": ["baixo", "medio", "alto"]
              }
            ]
          }
        },
        {
          "id": "2",
          "nome": "Formas Calmas",
          "descricao": "Exercício de autorregulação e atenção sustentada com encaixe geométrico relaxante.",
          "versao": "1.0.0",
          "status_instalacao": "instalado",
          "objetivo_clinico": "regulacao_emocional"
        }
      ],
      "total": 2,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
    ```

  - **Status `500 Internal Server Error`:**

    ```json
    {
      "error": "Erro ao listar catálogo de jogos"
    }
    ```

---

#### Rota 2: Consultar Detalhes de um Jogo Específico

- **Método:** `GET`

- **URL:** `/api/jogos/:id`
- **Path Parameters:**
  - `id` (`string`, obrigatório): Identificador numérico ou slug do jogo.
- **Exemplo de Chamada:**

  ```http
  GET /api/jogos/1 HTTP/1.1
  Host: localhost:3000
  ```

- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": {
        "id": "1",
        "nome": "Aventura das Cores",
        "descricao": "Estimula atenção compartilhada e reconhecimento facial.",
        "versao": "1.2.0",
        "status_instalacao": "instalado",
        "manifesto_json": {
          "id_jogo": "aventura-das-cores",
          "nome": "Aventura das Cores",
          "versao": "1.2.0",
          "metricas_suportadas": [
            {
              "id_metrica": "tempo_resposta",
              "tipo_metrica": "numerica",
              "unidade": "segundos"
            },
            {
              "id_metrica": "nivel_frustracao",
              "tipo_metrica": "categorica",
              "valores": ["baixo", "medio", "alto"]
            }
          ]
        }
      }
    }
    ```

  - **Status `404 Not Found`:**

    ```json
    {
      "error": "Jogo não encontrado"
    }
    ```

---

#### Rota 3: Obter Manifesto e Relatório de Conformidade do Jogo

- **Método:** `GET`

- **URL:** `/api/jogos/:id/manifesto`
- **Finalidade:** Inspeciona o campo `manifesto_json` do jogo e avalia a conformidade com as regras de tipagem estrita (**RN02** e **RNF02**).
- **Path Parameters:** `id` (`string`, obrigatório).
- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": {
        "id_jogo": "aventura-das-cores",
        "nome": "Aventura das Cores",
        "versao": "1.2.0",
        "metricas_suportadas": [
          {
            "id_metrica": "tempo_resposta",
            "tipo_metrica": "numerica",
            "unidade": "segundos"
          }
        ]
      },
      "validacao": {
        "valido": true,
        "erros": []
      }
    }
    ```

  - **Status `404 Not Found`:**

    ```json
    {
      "error": "Jogo não encontrado"
    }
    ```

---

#### Rota 4: Validação Externa de Manifesto de Jogos (Contrato 1 - RNF02)

- **Método:** `POST`

- **URL:** `/api/jogos/validar-manifesto`
- **Headers Requeridos:** `Content-Type: application/json`
- **Descrição Técnica:**
  - Submete um arquivo ou payload de manifesto para validação formal prévia à homologação no catálogo.
  - Valida presença de `id_jogo`, `nome`, `versao`, `metricas_suportadas` e tipagem estrita de cada métrica (`numerica` ou `categorica`).
- **Exemplo de Request Body Válido:**

  ```json
  {
    "id_jogo": "som-dos-animais",
    "nome": "O Som dos Animais",
    "versao": "2.0.1",
    "objetivo_clinico": "desenvolvimento_linguagem",
    "metricas_suportadas": [
      {
        "id_metrica": "acertos_consecutivos",
        "tipo_metrica": "numerica",
        "unidade": "pontos"
      },
      {
        "id_metrica": "resposta_vocal",
        "tipo_metrica": "categorica",
        "valores": ["imitou", "apontou", "nao_respondeu"]
      }
    ]
  }
  ```

- **Respostas:**
  - **Status `200 OK` (Manifesto Homologado):**

    ```json
    {
      "valido": true,
      "data": {
        "id_jogo": "som-dos-animais",
        "nome": "O Som dos Animais",
        "versao": "2.0.1",
        "metricas_suportadas": [
          {
            "id_metrica": "acertos_consecutivos",
            "tipo_metrica": "numerica",
            "unidade": "pontos"
          },
          {
            "id_metrica": "resposta_vocal",
            "tipo_metrica": "categorica",
            "valores": ["imitou", "apontou", "nao_respondeu"]
          }
        ]
      }
    }
    ```

  - **Status `400 Bad Request` (Manifesto Inválido / Métricas Sem Tipo):**

    ```json
    {
      "valido": false,
      "error": "Manifesto do jogo inválido",
      "erros": [
        "A métrica 'engajamento' não possui 'tipo_metrica' estritamente definido. [RN02] É proibido fallback automático para métricas sem tipagem explícita."
      ]
    }
    ```

---

#### Rota 5: Validação de Telemetria com Tipagem Estrita (RN02)

- **Método:** `POST`

- **URL:** `/api/jogos/:id/validar-telemetria`
- **Headers Requeridos:** `Content-Type: application/json`
- **Contexto Clínico & Diretriz RN02:**
  - **Regra Inviolável:** Métricas clínicas coletadas dos jogos sem tipo explícito ou com valores incompatíveis **NUNCA** devem ser gravadas no prontuário nem tratadas arbitrariamente como dados categóricos.
  - Se a métrica violar o manifesto ou o domínio definido, o endpoint recusa a gravação retornando **`422 Unprocessable Entity`**, resguardando os relatórios médicos e algoritmos clínicos de dados espúrios.
- **Path Parameters:**
  - `id` (`string`, obrigatório): Identificador do jogo no catálogo.
- **Request Body (JSON):**
  - `token_sessao` (`string`, obrigatório): Token identificador da sessão ativa.
  - `data_hora` (`string`, formato ISO 8601 UTC): Carimbo temporal do evento.
  - `tipo_evento` (`string`, obrigatório): Ex: `coleta_metrica`, `interacao_paciente`.
  - `dados` (`object`, obrigatório):
    - `id_metrica` (`string`, obrigatório): Identificador registrado no manifesto.
    - `valor` (`number` | `string`, obrigatório): Valor apurado no jogo.

- **Exemplo 1 — Telemetria Aprovada (Métrica Numérica):**

  ```json
  {
    "token_sessao": "sessao-clinica-98a1-b2c3",
    "data_hora": "2026-09-23T15:30:00Z",
    "tipo_evento": "coleta_metrica",
    "dados": {
      "id_metrica": "tempo_resposta",
      "valor": 2.45
    }
  }
  ```

  - **Resposta `200 OK`:**

    ```json
    {
      "podeGravar": true,
      "tipoDetectado": "numerica",
      "metricaHomologada": {
        "id_metrica": "tempo_resposta",
        "tipo_metrica": "numerica",
        "unidade": "segundos"
      }
    }
    ```

- **Exemplo 2 — Telemetria Rejeitada por Violação da RN02 (Status 422):**
  - Requisição com valor textual em métrica definida como numérica no manifesto:

  ```json
  {
    "token_sessao": "sessao-clinica-98a1-b2c3",
    "data_hora": "2026-09-23T15:31:00Z",
    "tipo_evento": "coleta_metrica",
    "dados": {
      "id_metrica": "tempo_resposta",
      "valor": "resposta_muito_rapida"
    }
  }
  ```

  - **Resposta `422 Unprocessable Entity`:**

    ```json
    {
      "podeGravar": false,
      "error": "A métrica 'tempo_resposta' é do tipo numérica, mas recebeu valor não numérico: 'resposta_muito_rapida'",
      "regraViolada": "RN02 - Fallback de Métrica Proibido"
    }
    ```

- **Exemplo 3 — Telemetria Rejeitada por Valor Fora do Domínio Categórico (Status 422):**
  - Requisição para a métrica `nivel_frustracao` (domínio: `["baixo", "medio", "alto"]`) com valor `"desesperado"`:

  ```json
  {
    "token_sessao": "sessao-clinica-98a1-b2c3",
    "data_hora": "2026-09-23T15:32:00Z",
    "tipo_evento": "coleta_metrica",
    "dados": {
      "id_metrica": "nivel_frustracao",
      "valor": "desesperado"
    }
  }
  ```

  - **Resposta `422 Unprocessable Entity`:**

    ```json
    {
      "podeGravar": false,
      "error": "O valor 'desesperado' não pertence ao domínio permitido para a métrica 'nivel_frustracao': [baixo, medio, alto]",
      "regraViolada": "RN02 - Fallback de Métrica Proibido"
    }
    ```

- **Status `404 Not Found` (Jogo Inexistente):**

  ```json
  {
    "error": "Jogo não encontrado"
  }
  ```

---

## 4. Módulo de Gestão de Sessão e Pareamento Remoto (`/api/sessao`)

### 4.1 Resumo dos Endpoints

| Método | Endpoint | Protegido | Requisito / Regra | Finalidade |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/sessao/gerarCodigoPareamento` | Sim (JWT) | **RF10** | Gera código legível único de pareamento remoto (PIN) |
| `POST` | `/api/sessao/iniciar` | Sim (JWT + Vínculo) | **RF12**, **RF13**, **RN01**, **RN03**, **RN04** | Inicia nova sessão clínica ou em modo livre, emite token e vincula contexto DDA |
| `POST` | `/api/sessao/parear` | Não (Launcher Game) | **RF10**, **RNF03** | Handshake de pareamento remoto do tablet/VR confirmando conexão ativa |
| `GET` | `/api/sessao/:id` | Sim (JWT) | **RF12**, **RN04** | Consulta dados completos e estado atual da sessão por UUID interno |
| `GET` | `/api/sessao/buscarPorToken/:token` | Sim (JWT) | **RF10** | Consulta dados da sessão através do código alfanumérico (PIN) |
| `GET` | `/api/sessao/:token/status` | Não | **RF10**, **RNF04** | Polling de status e diagnóstico de presença do dispositivo remoto |
| `PATCH` | `/api/sessao/:id/finalizar` | Sim (JWT) | **RF13**, **RF17**, **RF21**, **RN01**, **RN04**, **RN05**, **RNF06** | Encerra formalmente a sessão, aciona síntese de IA e grava na trilha de auditoria |
| `DELETE` | `/api/sessao/:id/cancelar` | Sim (JWT) | **RF12**, **RF13**, **RN05** | Cancela antecipadamente sessão pendente antes da conclusão clínica |
| `PATCH` | `/api/sessao/:id/status` | Sim (JWT) | **RF12** | Transição manual controlada da máquina de estados (FSM) da sessão |

---

### 4.2 Detalhamento de Rotas — Sessão

#### Rota 1: Gerar Código Legível de Pareamento Remoto (PIN)

- **Método:** `GET`
- **URL:** `/api/sessao/gerarCodigoPareamento`
- **Headers Requeridos:** `Authorization: Bearer <TOKEN_JWT>`
- **Finalidade:** Gera um código PIN legível e seguro (ex.: `4M5S-8U7B`), garantindo unicidade no banco de dados para digitação facilitada no jogo externo pelo paciente ou mediador.
- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "codigo": "4M5S-8U7B"
    }
    ```

  - **Status `401 Unauthorized`:** Token JWT ausente ou expirado.
  - **Status `500 Internal Server Error`:** Erro ao gerar código único após 10 tentativas consecutivas.

---

#### Rota 2: Iniciar Nova Sessão Clínica ou Modo Livre (RF12, RN01, RN03)

- **Método:** `POST`
- **URL:** `/api/sessao/iniciar`
- **Headers Requeridos:**
  - `Authorization: Bearer <TOKEN_JWT>`
  - `Content-Type: application/json`
- **Segurança e Regras Clínicas:**
  - Protegido por `authMiddleware` e `verificarVisibilidadePaciente` (**RN04**).
  - **RN01 (Modo Livre vs. Sessão Clínica):**
    - Se `modo_sessao = "sessao_clinica"`, `paciente_id` é obrigatório.
    - Se `modo_sessao = "modo_livre"`, `paciente_id` deve ser nulo.
  - **RN03 (Contexto DDA Pré-Sessão):** Aceita `contexto_dda_json` com dados de calibração que serão entregues ao jogo no pareamento.
  - Cria a sessão no estado `aguardando_pareamento` com TTL de 15 minutos (**RNF03**).
- **Request Body (JSON):**
  - Objeto `CriarSessaoDTO`:
    - `terapeuta_id` (`string`, UUID obrigatório): Identificador do profissional.
    - `jogo_id` (`string`, UUID obrigatório): Jogo terapêutico selecionado no catálogo.
    - `paciente_id` (`string`, UUID opcional/obrigatório conforme modalidade).
    - `modo_sessao` (`string`, opcional): `"sessao_clinica"` (padrão) ou `"modo_livre"`.
    - `codigo_pareamento` (`string`, obrigatório): PIN gerado previamente.
    - `contexto_dda_json` (`object`, opcional): Parâmetros pré-sessão para o Agente de IA DDA (ex: estresse inicial, gatilhos a evitar).
- **Exemplo de Request Body:**

  ```json
  {
    "terapeuta_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "jogo_id": "8b5a034f-9e77-4ad3-9b6e-1d54e5cf4291",
    "paciente_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "modo_sessao": "sessao_clinica",
    "codigo_pareamento": "4M5S-8U7B",
    "contexto_dda_json": {
      "estresse_inicial": 2,
      "gatilhos_a_evitar": ["Sons Altos", "Mudança Repentina de Cores"],
      "objetivo_clinico": "Foco atencional e regulação sensorial"
    }
  }
  ```

- **Respostas:**
  - **Status `201 Created`:**

    ```json
    {
      "data": {
        "session_id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
        "session_token": "4M5S-8U7B",
        "status_sessao": "aguardando_pareamento",
        "modo_sessao": "sessao_clinica",
        "paciente_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "expira_em": "2026-10-07T23:45:00.000Z"
      }
    }
    ```

  - **Status `400 Bad Request` (Violação RN01 ou Campos Ausentes):**

    ```json
    {
      "error": "O paciente_id é obrigatório para sessões clínicas (RN01)"
    }
    ```

  - **Status `401 Unauthorized`:** Token JWT ausente ou inválido.
  - **Status `403 Forbidden` (RN04):** Terapeuta sem vínculo com o paciente indicado.

---

#### Rota 3: Handshake de Pareamento Remoto (RF10, RNF03)

- **Método:** `POST`
- **URL:** `/api/sessao/parear`
- **Headers Requeridos:** `Content-Type: application/json`
- **Descrição Técnica:**
  - Endpoint consumido pelo executável do jogo externo (tablet Android, PC ou VR).
  - Valida o `session_token`, checa o TTL efêmero de 15 minutos e executa transição atômica da FSM de `aguardando_pareamento` para `conectado` / `em_andamento`.
  - Dispara notificação imediata via WebSocket no namespace `/sessao` para o Cockpit do terapeuta e registra auditoria clínica (`dispositivo_pareado`).
- **Request Body (JSON):**
  - Objeto `ParearSessaoDTO`:
    - `session_token` (`string`, obrigatório): Código PIN digitado no dispositivo.
    - `jogo_id` (`string`, UUID opcional): Se informado, valida se corresponde ao jogo selecionado pelo terapeuta.
    - `dispositivo_info` (`object`, opcional): Metadados de telemetria do hardware (modelo, resolução, SO, versão do jogo).
- **Exemplo de Request Body:**

  ```json
  {
    "session_token": "4M5S-8U7B",
    "jogo_id": "8b5a034f-9e77-4ad3-9b6e-1d54e5cf4291",
    "dispositivo_info": {
      "tipo_dispositivo": "tablet",
      "modelo": "Samsung Galaxy Tab S9",
      "sistema_operacional": "Android 14",
      "resolucao": "2560x1600",
      "versao_jogo": "1.2.0"
    }
  }
  ```

- **Respostas:**
  - **Status `200 OK` (Pareamento Confirmado):**

    ```json
    {
      "message": "Dispositivo pareado com sucesso",
      "data": {
        "sessao_id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
        "session_token": "4M5S-8U7B",
        "status_sessao": "conectado",
        "modo_sessao": "sessao_clinica",
        "jogo": {
          "id": "8b5a034f-9e77-4ad3-9b6e-1d54e5cf4291",
          "nome": "Aventura das Cores",
          "versao": "1.2.0"
        },
        "jogo_id": "8b5a034f-9e77-4ad3-9b6e-1d54e5cf4291",
        "paciente_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "contexto_dda": {
          "estresse_inicial": 2,
          "gatilhos_a_evitar": ["Sons Altos", "Mudança Repentina de Cores"],
          "objetivo_clinico": "Foco atencional e regulação sensorial"
        },
        "websocket": {
          "url": "ws://localhost:3000/sessao",
          "canal": "session_4M5S-8U7B"
        },
        "dispositivo_info": {
          "tipo_dispositivo": "tablet",
          "modelo": "Samsung Galaxy Tab S9",
          "sistema_operacional": "Android 14",
          "resolucao": "2560x1600",
          "versao_jogo": "1.2.0"
        },
        "pareado_em": "2026-10-07T23:30:15.000Z"
      }
    }
    ```

  - **Status `400 Bad Request`:** `session_token` ausente ou estado incompatível com pareamento.
  - **Status `404 Not Found`:** Sessão não encontrada para o PIN fornecido.
  - **Status `409 Conflict`:** Sessão já em andamento com outro dispositivo ou divergência entre `jogo_id` informado e o selecionado na sessão.
  - **Status `410 Gone` (RNF03):** Token PIN expirado (TTL de 15 minutos ultrapassado) ou sessão terminal.

---

#### Rota 4: Consultar Detalhes da Sessão por UUID

- **Método:** `GET`
- **URL:** `/api/sessao/:id`
- **Headers Requeridos:** `Authorization: Bearer <TOKEN_JWT>`
- **Path Parameters:** `id` (`string`, UUID obrigatório).
- **Respostas:**
  - **Status `200 OK`:** Retorna dados cadastrais, status da FSM, timestamps, contexto DDA e dispositivo pareado.
  - **Status `401 Unauthorized`:** Token ausente ou inválido.
  - **Status `404 Not Found`:** Sessão não encontrada.

---

#### Rota 5: Consultar Sessão por Código de Pareamento (PIN)

- **Método:** `GET`
- **URL:** `/api/sessao/buscarPorToken/:token`
- **Headers Requeridos:** `Authorization: Bearer <TOKEN_JWT>`
- **Path Parameters:** `token` (`string`, obrigatório, ex: `4M5S-8U7B`).
- **Respostas:**
  - **Status `200 OK`:** Sessão localizada com sucesso.
  - **Status `404 Not Found`:** Código de sessão inválido ou inexistente.

---

#### Rota 6: Polling de Status e Presença do Dispositivo (RF10, RNF04)

- **Método:** `GET`
- **URL:** `/api/sessao/:token/status`
- **Path Parameters:** `token` (`string`, PIN da sessão).
- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": {
        "id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
        "session_token": "4M5S-8U7B",
        "status_sessao": "em_andamento",
        "modo_sessao": "sessao_clinica",
        "dispositivo_info": { "modelo": "Samsung Galaxy Tab S9" },
        "presenca_dispositivo": {
          "conectado": true,
          "bateria": 84,
          "latencia_ms": 18,
          "qualidade_sinal": "excelente"
        },
        "expira_em": "2026-10-07T23:45:00.000Z",
        "data_hora_inicio": "2026-10-07T23:30:15.000Z"
      }
    }
    ```

  - **Status `404 Not Found`:** Sessão não encontrada.

---

#### Rota 7: Encerramento Formal e Sumarização Clínica (RF13, RF17, RF21, RN01, RN05, RNF06)

- **Método:** `PATCH`
- **URL:** `/api/sessao/:id/finalizar`
- **Headers Requeridos:**
  - `Authorization: Bearer <TOKEN_JWT>`
  - `Content-Type: application/json`
- **Path Parameters:** `id` (`string`, UUID ou session token).
- **Contexto Clínico e Regras:**
  - O terapeuta encerra formalmente a intervenção terapêutica no Cockpit.
  - Transiciona atômica da FSM para `finalizada` e carimba `data_hora_fim`.
  - Registra evento imutável na trilha de auditoria clínica (`sessao_finalizada`).
  - **Geração de Relatório de Síntese IA (RF17):**
    - Se `modo_sessao = "sessao_clinica"` e paciente vinculado: aciona o motor de inteligência clínica (`gerarRelatorioIA`), consolida anotações do terapeuta e persiste no prontuário (`relatorio_sessao`).
    - Se `modo_sessao = "modo_livre"` (**RN01**): não gera relatório IA nem persiste em prontuário.
- **Request Body (JSON - Opcional):**

  ```json
  {
    "anotacoes_clinicas": "Paciente apresentou evolução notável no tempo de reação e excelente autorregulação nas fases com estímulos cromáticos complexos."
  }
  ```

- **Respostas:**
  - **Status `200 OK` (Sessão Finalizada com Relatório IA):**

    ```json
    {
      "data": {
        "id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
        "session_token": "4M5S-8U7B",
        "status_sessao": "finalizada",
        "modo_sessao": "sessao_clinica",
        "terapeuta_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "paciente_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "jogo_id": "8b5a034f-9e77-4ad3-9b6e-1d54e5cf4291",
        "data_hora_inicio": "2026-10-07T23:30:15.000Z",
        "data_hora_fim": "2026-10-07T23:55:20.000Z",
        "relatorio": {
          "id_relatorio": "rel-849291",
          "sessao_id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
          "duracao_total_segundos": 1505,
          "analises_ia": [
            "Desempenho de foco atencional acima da média histórica do paciente.",
            "Sem indícios de fadiga sensorial durante o ciclo ativo."
          ],
          "gerado_em": "2026-10-07T23:55:20.000Z"
        }
      }
    }
    ```

  - **Status `400 Bad Request`:** Sessão já finalizada, cancelada, expirada ou ainda não pareada.
  - **Status `401 Unauthorized`:** Token JWT ausente ou expirado.
  - **Status `404 Not Found`:** Sessão não encontrada.

---

#### Rota 8: Cancelamento Antecipado de Sessão (RF12, RF13, RN05)

- **Método:** `DELETE`
- **URL:** `/api/sessao/:id/cancelar`
- **Headers Requeridos:** `Authorization: Bearer <TOKEN_JWT>`
- **Path Parameters:** `id` (`string`, UUID da sessão).
- **Regras:** Impede cancelamento de sessões já encerradas (`finalizada`, `expirada` ou `cancelada`), retornando status 400. Registra auditoria com motivo e estado anterior.
- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": {
        "id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
        "status_sessao": "cancelada"
      }
    }
    ```

  - **Status `400 Bad Request`:** Tentativa de cancelar sessão em status terminal.
  - **Status `404 Not Found`:** Sessão não encontrada.

---

#### Rota 9: Atualização de Status da Máquina de Estados (FSM)

- **Método:** `PATCH`
- **URL:** `/api/sessao/:id/status`
- **Headers Requeridos:** `Authorization: Bearer <TOKEN_JWT>`, `Content-Type: application/json`
- **Request Body (JSON):**

  ```json
  {
    "status": "em_andamento"
  }
  ```

- **Valores Aceitos:** `aguardando_pareamento`, `conectado`, `em_andamento`, `finalizada`, `expirada`, `cancelada`.
- **Respostas:**
  - **Status `200 OK`:** Status atualizado com sucesso.
  - **Status `400 Bad Request`:** Status inválido ou campo ausente.

---

## 5. Módulo de Telemetria Clínica (`/api/telemetria`)

### 5.1 Resumo dos Endpoints

| Método | Endpoint | Protegido | Requisito / Regra | Finalidade |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/telemetria` | Não | **RF12**, **RN01**, **RN02** | Ingestão de evento individual de telemetria clínica |
| `POST` | `/api/telemetria/lote` | Não | **RF12**, **RN01**, **RNF03**, **RNF05** | Ingestão em lote de eventos de telemetria (batch insert até 500) |
| `GET` | `/api/telemetria/sessao/:sessaoId` | Sim (JWT + Vínculo) | **RF12**, **RN04**, **RN05** | Consulta histórico cronológico da série temporal de telemetria |

---

### 5.2 Detalhamento de Rotas — Telemetria

#### Rota 1: Ingestão de Evento Individual de Telemetria

- **Método:** `POST`
- **URL:** `/api/telemetria`
- **Headers Requeridos:** `Content-Type: application/json`
- **Regras Clínicas e Guardas FSM:**
  - Aceita `sessao_id` (UUID) ou `token_sessao` (PIN).
  - A sessão deve estar com status `em_andamento`; se estiver inativa, retorna **409 Conflict**.
  - **RN01:** Em Modo Livre, processa em memória e retorna HTTP 200 com `persistido = false`, suprimindo a gravação em prontuário.
  - Em Sessão Clínica, persiste o registro na tabela `telemetria_evento` e retorna HTTP 201 Created.
- **Request Body (JSON):**

  ```json
  {
    "sessao_id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
    "tipo_evento": "interacao_paciente",
    "dados": {
      "id_metrica": "tempo_resposta",
      "valor": 2.45
    },
    "data_hora": "2026-10-07T23:35:10.000Z"
  }
  ```

- **Respostas:**
  - **Status `201 Created` (Sessão Clínica Persistida):**

    ```json
    {
      "message": "Evento de telemetria registrado com sucesso",
      "data": {
        "id": "c1f7b8a2-1111-4444-8888-99990000aaaa",
        "sessao_id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
        "tipo_evento": "interacao_paciente",
        "dados": { "id_metrica": "tempo_resposta", "valor": 2.45 },
        "data_hora": "2026-10-07T23:35:10.000Z"
      },
      "persistido": true
    }
    ```

  - **Status `200 OK` (Modo Livre - RN01):**

    ```json
    {
      "message": "Evento processado em memória (Modo Livre não persiste telemetria - RN01)",
      "persistido": false
    }
    ```

  - **Status `400 Bad Request`:** Campos obrigatórios ausentes.
  - **Status `404 Not Found`:** Sessão não encontrada.
  - **Status `409 Conflict`:** Sessão não está em andamento.

---

#### Rota 2: Ingestão em Lote de Telemetria (Batch Insert - RNF03, RNF05)

- **Método:** `POST`
- **URL:** `/api/telemetria/lote`
- **Headers Requeridos:** `Content-Type: application/json`
- **Descrição Técnica:**
  - Projetado para alta vazão e envio em rajadas periódicas pelo jogo remoto.
  - Validação estrita de cada evento do array.
  - Teto de segurança: limite de até 500 eventos por requisição (**RNF03**).
  - Executa persistência em lote atômica com SQL batch insert.
- **Request Body (JSON):**

  ```json
  {
    "sessao_id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
    "eventos": [
      {
        "tipo_evento": "interacao_paciente",
        "dados": { "id_metrica": "toque_alvo", "valor": 1.2 },
        "data_hora": "2026-10-07T23:35:10.000Z"
      },
      {
        "tipo_evento": "coleta_metrica",
        "dados": { "id_metrica": "nivel_frustracao", "valor": "baixo" },
        "data_hora": "2026-10-07T23:35:12.000Z"
      }
    ]
  }
  ```

- **Respostas:**
  - **Status `201 Created` (Lote Persistido):**

    ```json
    {
      "message": "Lote de telemetria registrado com sucesso",
      "total": 2,
      "persistido": true
    }
    ```

  - **Status `200 OK` (Modo Livre - RN01):**

    ```json
    {
      "message": "Lote processado em memória (Modo Livre não persiste telemetria - RN01)",
      "total": 2,
      "persistido": false
    }
    ```

  - **Status `400 Bad Request`:** Lote vazio, elemento malformado ou teto de 500 excedido.
  - **Status `409 Conflict`:** Sessão não está em andamento.

---

#### Rota 3: Consulta do Histórico da Série Temporal de Telemetria (RN04)

- **Método:** `GET`
- **URL:** `/api/telemetria/sessao/:sessaoId`
- **Headers Requeridos:** `Authorization: Bearer <TOKEN_JWT>`
- **Path Parameters:** `sessaoId` (`string`, UUID obrigatório).
- **Query Parameters:**
  - `metrica` (`string`, opcional): Filtra por identificador de métrica específico (ex: `tempo_resposta`).
  - `limite` (`integer`, opcional): Quantidade de registros por página.
  - `pagina` (`integer`, opcional, padrão: `1`): Página consultada.
- **Segurança e Regras Clínicas:**
  - Protegido por `authMiddleware`.
  - **RN04:** Acesso restrito ao terapeuta vinculado à sessão clínica ou SuperAdmin. Terapeutas sem vínculo recebem **403 Forbidden**.
- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": [
        {
          "id": "c1f7b8a2-1111-4444-8888-99990000aaaa",
          "sessao_id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
          "tipo_evento": "interacao_paciente",
          "dados": { "id_metrica": "tempo_resposta", "valor": 2.45 },
          "data_hora": "2026-10-07T23:35:10.000Z"
        }
      ],
      "pagina": 1,
      "limite": 10,
      "total_pagina": 1
    }
    ```

  - **Status `401 Unauthorized`:** Token JWT ausente ou expirado.
  - **Status `403 Forbidden` (RN04):** Acesso negado por falta de vínculo institucional com a sessão.
  - **Status `404 Not Found`:** Sessão clínica não encontrada.

---

## 6. Módulo da Trilha de Auditoria Clínica (`/api/auditoria`)

### 6.1 Resumo dos Endpoints

| Método | Endpoint | Protegido | Requisito / Regra | Finalidade |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/auditoria/sessao/:sessaoId` | Sim (JWT + Vínculo) | **RF13**, **RF21**, **RN04**, **RN05**, **RNF06** | Consulta a linha do tempo cronológica imutável da sessão clínica |

---

### 6.2 Detalhamento de Rotas — Auditoria

#### Rota 1: Consulta da Linha do Tempo Imutável da Sessão (RF13, RNF06, RN05)

- **Método:** `GET`
- **URL:** `/api/auditoria/sessao/:sessaoId`
- **Headers Requeridos:** `Authorization: Bearer <TOKEN_JWT>`
- **Finalidade:** Retorna os registros imutáveis gerados durante o ciclo de vida da intervenção (pareamento, comandos do terapeuta, encerramento, cancelamento) para conformidade regulatória e auditoria clínica.
- **Path Parameters:** `sessaoId` (`string`, UUID obrigatório).
- **Segurança:** Acesso restrito ao terapeuta da sessão ou SuperAdmin (**RN04**).
- **Respostas:**
  - **Status `200 OK`:**

    ```json
    {
      "data": [
        {
          "id": "aud-1111-2222-3333-4444",
          "sessao_id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
          "terapeuta_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "origem": "dispositivo_jogo",
          "acao": "dispositivo_pareado",
          "detalhes_json": {
            "jogo_id": "8b5a034f-9e77-4ad3-9b6e-1d54e5cf4291",
            "dispositivo_info": { "modelo": "Samsung Galaxy Tab S9" }
          },
          "ip": "192.168.1.105",
          "user_agent": "InTEA-Game-Launcher/1.2.0",
          "created_at": "2026-10-07T23:30:15.000Z"
        },
        {
          "id": "aud-5555-6666-7777-8888",
          "sessao_id": "e4f8d912-32a1-4bb6-9811-6677889900aa",
          "terapeuta_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "origem": "terapeuta_web",
          "acao": "sessao_finalizada",
          "detalhes_json": {
            "gerou_relatorio_ia": true,
            "tem_anotacoes": true
          },
          "ip": "192.168.1.50",
          "user_agent": "Mozilla/5.0 Chrome/129.0",
          "created_at": "2026-10-07T23:55:20.000Z"
        }
      ],
      "total": 2
    }
    ```

  - **Status `401 Unauthorized`:** Token ausente ou inválido.
  - **Status `403 Forbidden`:** Terapeuta sem vínculo com a sessão indicada.
  - **Status `404 Not Found`:** Sessão não encontrada.

---

## 7. Gateway WebSocket em Tempo Real (`/sessao`)

O servidor Socket.IO opera integrado ao backend na porta `3000`, expondo o namespace `/sessao`. A comunicação é particionada por salas exclusivas (`session_<session_token>`), garantindo isolamento total entre pacientes e sessões concorrentes.

### 7.1 Matriz de Eventos WebSocket

| Evento | Direção | Emissor | Finalidade Técnica | Requisito / Regra |
| :--- | :---: | :---: | :--- | :--- |
| `entrar_sessao` | C → S | Terapeuta / Jogo | Conecta o socket e ingressa na sala da sessão | **RF10** |
| `sessao_conectada` | S → C | Backend | Confirmação de entrada na sala | **RF10** |
| `dispositivo_conectado` | S → Sala | Backend | Notifica ao Cockpit do terapeuta que o tablet concluiu o handshake | **RF10** |
| `ping_presenca` | C → S | Tablet do Jogo | Heartbeat contínuo com nível de bateria e latência | **RNF04** |
| `pong_presenca` | S → C | Backend | Confirmação de presença e sincronização de relógio | **RNF04** |
| `sessao:telemetria` / `telemetria` | C → S | Tablet do Jogo | Ingestão e streaming de telemetria (< 100ms) | **RF12**, **RNF05** |
| `sessao:comando` / `comando_jogo` | C → S | Terapeuta | Envio de ordens clínicas ao jogo (pausar, retomar, ajustar DDA) | **RF13**, **RF21** |
| `dispositivo_desconectado` | S → Sala | Backend | Alerta imediato de queda de sinal com timestamp e causa | **RNF04** |
| `sessao:alerta_conexao` | S → Sala | Backend | Alerta com janela de tolerância de 60s para reconexão | **RNF04** |
| `dispositivo_reconectado` | S → Sala | Backend | Restauração confirmada com cálculo de `tempo_offline_ms` | **RNF04** |
| `sessao:interrompida_por_queda` | S → Sala | Backend | Disparado se a desconexão ultrapassar 60 segundos | **RNF04** |
| `finalizar_sessao` | C → S | Terapeuta | Sinaliza solicitação de término da sessão | **RF13** |
| `sessao_finalizada` | S → Sala | Backend | Notificação de encerramento formal para todos os clientes da sala | **RF13** |

---

### 7.2 Exemplos de Payloads WebSocket

#### Evento: `sessao:telemetria` (Ingestão do Jogo para o Cockpit)

```json
{
  "session_token": "4M5S-8U7B",
  "tipo_evento": "coleta_metrica",
  "dados": {
    "id_metrica": "tempo_resposta",
    "valor": 1.85
  },
  "data_hora": "2026-10-07T23:36:00.000Z"
}
```

> **Controle de Taxa (Card 2.4 - RNF03):** O gateway aplica rate limit de 20 eventos por segundo por conexão socket via algoritmo de janela deslizante. Se excedido, emite o evento `erro_rate_limit` com código `RATE_LIMIT_EXCEDIDO` e descarta o excesso.

#### Evento: `sessao:comando` (Comando do Terapeuta para o Jogo Remoto)

```json
{
  "session_token": "4M5S-8U7B",
  "tipo_comando": "ajustar_dificuldade_dda",
  "parametros": {
    "novo_nivel": 3,
    "reduzir_estimulos": true
  }
}
```

> **Comandos Suportados:** `pausar_jogo`, `retomar_jogo`, `ajustar_dificuldade_dda`, `solicitar_encerramento`. Apenas sockets autenticados com papel `terapeuta` possuem permissão (**RF21**); dispositivos remotos que tentarem emitir comandos recebem erro `PERMISSAO_NEGADA`.

#### Evento: `ping_presenca` e Diagnóstico do Tablet

```json
{
  "timestamp_cliente": 1728345600000,
  "bateria": 78,
  "qualidade_sinal": "excelente"
}
```

---

## 8. Matriz de Rastreabilidade Consolidada (Requisitos x Rotas x Códigos HTTP)

| Requisito / Regra | Rota / Mecanismo Principal | Códigos HTTP / Eventos WS | Detalhe de Implementação |
| :--- | :--- | :--- | :--- |
| **RF06** (CRUD Paciente) | `POST`, `GET`, `PUT`, `DELETE /api/paciente` | `200`, `201`, `400`, `404`, `409` | Validação de DTOs, vínculos familiares e soft delete. |
| **RF09** (Biblioteca de Jogos) | `GET /api/jogos`, `GET /api/jogos/:id` | `200`, `404`, `500` | Catálogo com objetivos clínicos e status de instalação. |
| **RF10** (Pareamento Remoto) | `POST /api/sessao/parear`, `GET /api/sessao/gerarCodigoPareamento` | `200`, `400`, `404`, `409`, `410` | Handshake PIN de 8 caracteres, TTL de 15 minutos e WebSocket. |
| **RF11** (Modo Livre) | `POST /api/sessao/iniciar` (`modo_sessao: modo_livre`) | `200`, `201` | Partidas recreativas sem vínculo a prontuário clínico. |
| **RF12** (Gestão de Sessão) | `POST /api/sessao/iniciar`, `GET /api/sessao/:id`, `PATCH /status` | `200`, `201`, `400`, `404` | Orquestração da FSM e monitoramento ativo do ciclo. |
| **RF13** (Ciclo e Encerramento) | `PATCH /api/sessao/:id/finalizar`, `DELETE /cancelar` | `200`, `400`, `404` | Encerramento formal, cálculo de duração e trilha de auditoria. |
| **RF17** (Contexto DDA e Relatório IA) | `PATCH /api/sessao/:id/finalizar` | `200`, `500` | Síntese clínica via IA persistida em `relatorio_sessao`. |
| **RF18** (Vínculo Multiterapeuta) | `POST`, `DELETE /api/paciente/:id/terapeutas` | `200`, `201`, `400`, `401`, `403`, `404` | Associação de múltiplos terapeutas com barreira clínica multitenant. |
| **RF19** (Filtros e Busca) | `GET /api/paciente`, `GET /api/jogos` | `200`, `400` | Paginação e busca avançada por idade, objetivo e CPF. |
| **RF21** (Autoria Obrigatória) | `POST /api/sessao/iniciar`, `sessao:comando` | `201`, `401`, `403` | Bloqueio de comandos remotos emitidos pelo dispositivo do paciente. |
| **RN01** (Modo Livre sem Persistência) | `POST /api/telemetria`, `POST /api/telemetria/lote` | `200` (`persistido: false`) | Supressão mandatória de gravação de telemetria no prontuário. |
| **RN02** (Tipagem Estrita de Métrica) | `POST /api/jogos/:id/validar-telemetria` | `200`, `404`, `422` | Rejeição mandatória com status 422 para tipos divergentes. |
| **RN03** (Contexto DDA Pré-Sessão) | `POST /api/sessao/iniciar`, `POST /api/sessao/parear` | `200`, `201` | Entrega de gatilhos e estresse antes do início da telemetria. |
| **RN04** (Visibilidade por Vínculo) | `GET /api/telemetria/sessao/:id`, `GET /api/auditoria/sessao/:id` | `200`, `401`, `403`, `404` | Middleware `verificarVisibilidadePaciente` bloqueia terceiros (403). |
| **RN05** (Inalterabilidade e Imutabilidade) | `DELETE /api/paciente/:id`, `GET /api/auditoria/sessao/:id` | `200`, `404` | Soft delete em prontuários e imutabilidade de histórico clínico. |
| **RNF02** (Contrato e Manifesto) | `POST /api/jogos/validar-manifesto` | `200`, `400` | Conformidade com `manifestoGame.json` e documentação OpenAPI. |
| **RNF03** (Rate Limiting e TTL) | `POST /api/sessao/parear`, `core/websocket/socket.limiter.ts` | `410`, `erro_rate_limit` | Expiração de PIN em 15 min e teto de 20 eventos/s no WebSocket. |
| **RNF04** (Resiliência de Conexão) | `core/websocket/sessao.reconnection.ts` | `sessao:alerta_conexao`, `interrompida_por_queda` | Janela de tolerância de 60s para reconexão de dispositivo. |
| **RNF05** (Tempo Real e Alta Vazão) | `POST /api/telemetria/lote`, `sessao:telemetria` | `201`, `latencia < 100ms` | Lotes de até 500 eventos e despacho instantâneo no Cockpit. |
| **RNF06** (Trilha de Auditoria Clínica) | `GET /api/auditoria/sessao/:sessaoId` | `200`, `403`, `404` | Registros imutáveis de ações clínicas com IP e User-Agent. |

---

## 9. Como Executar e Acessar o Swagger UI

1. **Instalação e Inicialização do Backend:**

   ```bash
   cd Backend
   npm install
   npm run dev
   ```

2. **Acesso à Documentação Interativa:**
   - Navegue até `http://localhost:3000/api/docs`.
   - O Swagger UI renderizará automaticamente os esquemas de Pacientes, Jogos, Sessão, Telemetria e Auditoria.

3. **Conexão ao Gateway WebSocket:**
   - URL do WebSocket: `ws://localhost:3000/sessao`
   - Clientes Socket.IO devem conectar e emitir `entrar_sessao` com `session_token` para ingressar na sala correspondente.
