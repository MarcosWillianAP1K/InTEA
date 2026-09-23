> **Versão da API:** `v1.0.0` | **Base URL:** `http://localhost:3000/api` | **Swagger UI:** `http://localhost:3000/api/docs`

---

## 1. Visão Geral e Padrões de Comunicação

A API REST do InTEA opera sob o padrão JSON sobre HTTP/HTTPS, seguindo a arquitetura MVC (Model-View-Controller) com Node.js, Express, TypeScript e persistência no PostgreSQL via Supabase.

### 1.1 Autenticação e Segurança
- Os endpoints protegidos exigem o cabeçalho `Authorization: Bearer <TOKEN_JWT>`, validado pelo `authMiddleware` via Supabase Auth.
- O controle de acesso clínico aos prontuários e dados confidenciais do paciente é reforçado pelo middleware `verificarVisibilidadePaciente` (**RN04**), que valida o vínculo ativo terapeuta-paciente e a mesma afiliação institucional clínica.

### 1.2 Padrão de Respostas HTTP e Tratamento de Erros
Todas as respostas seguem formatos previsíveis:

* **Sucesso (200 OK / 201 Created):**
  ```json
  {
    "data": { ... } | [ ... ],
    "message": "Mensagem informativa opcional",
    "meta": { "total": 25, "page": 1, "limit": 10, "totalPages": 3 }
  }
  ```

* **Erro ou Rejeição de Validação (400, 401, 403, 404, 409, 422, 500):**
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
| **`409 Conflict`** | Conflito de integridade única | Tentativa de cadastro de paciente ou terapeuta com CPF já existente no sistema. |
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
* **Método:** `GET`
* **URL:** `/api/paciente`
* **Headers Requeridos:** `Content-Type: application/json`
* **Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição | Exemplo |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `nome` | `string` | Não | — | Busca textual parcial insensível a caixa alta/baixa (`ilike %termo%`) | `Henrique` |
| `cpf` | `string` | Não | — | Busca exata por CPF (aceita com ou sem máscara) | `529.982.247-25` |
| `idadeMin` | `integer` | Não | — | Idade mínima calculada sem drift de fuso horário | `4` |
| `idadeMax` | `integer` | Não | — | Idade máxima calculada sem drift de fuso horário | `12` |
| `incluirInativos`| `boolean` | Não | `false` | Se `true`, inclui pacientes inativados por soft delete | `false` |
| `page` | `integer` | Não | `1` | Índice da página atual (início em 1) | `1` |
| `limit` | `integer` | Não | `10` | Registros por página (teto de segurança: máx 100) | `10` |

* **Exemplo de Chamada:**
  ```http
  GET /api/paciente?nome=Pedro&idadeMin=4&idadeMax=10&page=1&limit=10 HTTP/1.1
  Host: localhost:3000
  ```

* **Respostas:**
  * **Status `200 OK`:**
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
  * **Status `500 Internal Server Error`:**
    ```json
    {
      "error": "Erro interno ao listar pacientes.",
      "detalhes": "Conexão recusada com o serviço Supabase."
    }
    ```

---

#### Rota 2: Consultar Prontuário e Detalhes de um Paciente
* **Método:** `GET`
* **URL:** `/api/paciente/:id`
* **Headers Requeridos:**
  * `Authorization: Bearer <TOKEN_JWT>`
* **Path Parameters:**
  * `id` (`string`, UUID obrigatório): Identificador único do paciente.
* **Segurança e Regras Clínicas:**
  * Protegido por `authMiddleware` e `verificarVisibilidadePaciente` (**RN04**).
  * O terapeuta só visualiza o prontuário caso possua vínculo ativo na tabela `terapeuta_paciente` e pertença à mesma clínica institucional. SuperAdmins possuem auditoria global.
* **Exemplo de Chamada:**
  ```http
  GET /api/paciente/7c9e6679-7425-40de-944b-e07fc1f90ae7 HTTP/1.1
  Host: localhost:3000
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI...
  ```
* **Respostas:**
  * **Status `200 OK`:**
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
  * **Status `400 Bad Request`:**
    ```json
    {
      "error": "O identificador do paciente deve ser um UUID válido."
    }
    ```
  * **Status `401 Unauthorized`:**
    ```json
    {
      "error": "Acesso não autorizado. Forneça um token no cabeçalho Authorization: Bearer <token>."
    }
    ```
  * **Status `403 Forbidden` (RN04 - Sem Vínculo ou Clínica Conflitante):**
    ```json
    {
      "error": "Acesso negado: o terapeuta não possui vínculo ativo com este paciente."
    }
    ```
  * **Status `404 Not Found`:**
    ```json
    {
      "error": "Paciente não encontrado."
    }
    ```

---

#### Rota 3: Cadastrar Novo Paciente e Responsável
* **Método:** `POST`
* **URL:** `/api/paciente`
* **Headers Requeridos:** `Content-Type: application/json`
* **Request Body (JSON):**
  * Objeto `CriarPacienteDTO`:
    * `nome` (`string`, obrigatório, mín. 3 caracteres)
    * `data_nascimento` (`string`, obrigatório, formato `YYYY-MM-DD`, não pode ser futura)
    * `cpf` (`string`, obrigatório, CPF válido com ou sem pontuação)
    * `clinica_id` (`string`, opcional, UUID da clínica)
    * `telefone` (`string`, opcional, telefone fixo ou celular com DDD)
    * `cep` (`string`, opcional, CEP 8 dígitos)
    * `cidade` (`string`, opcional)
    * `estado` (`string`, opcional, UF 2 letras)
    * `endereco` (`string`, opcional)
    * `bairro` (`string`, opcional)
    * `numero` (`string`, opcional)
    * `complemento` (`string`, opcional)
    * `responsavel` (`object`, opcional):
      * `nome` (`string`, obrigatório se responsavel enviado)
      * `telefone` (`string`, obrigatório)
      * `cpf` (`string`, opcional, CPF válido)
      * `email` (`string`, opcional, formato válido)
      * `parentesco` (`string`, opcional, ex: "Mãe", "Pai", "Tutor Legal")

* **Exemplo de Request Body:**
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

* **Respostas:**
  * **Status `201 Created`:**
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
  * **Status `400 Bad Request` (Erros de Validação DTO):**
    ```json
    {
      "error": "Erro de validação nos dados do paciente.",
      "erros": [
        "O campo 'cpf' é obrigatório e deve ser um CPF válido.",
        "A data de nascimento informada não pode estar no futuro."
      ]
    }
    ```
  * **Status `409 Conflict` (Unicidade de CPF):**
    ```json
    {
      "error": "Já existe um paciente cadastrado com este CPF."
    }
    ```
  * **Status `500 Internal Server Error`:**
    ```json
    {
      "error": "Erro interno ao cadastrar paciente.",
      "detalhes": "database error: column does not exist"
    }
    ```

---

#### Rota 4: Atualizar Dados de um Paciente
* **Método:** `PUT`
* **URL:** `/api/paciente/:id`
* **Headers Requeridos:**
  * `Authorization: Bearer <TOKEN_JWT>`
  * `Content-Type: application/json`
* **Path Parameters:**
  * `id` (`string`, UUID obrigatório): ID do paciente a ser atualizado.
* **Segurança e Validação:**
  * Executa `authMiddleware` e `verificarVisibilidadePaciente` (**RN04**).
  * Rejeita payloads com CPF inválido, datas futuras ou campos incorretos.
* **Request Body (JSON):**
  ```json
  {
    "telefone": "(11) 99999-1122",
    "cidade": "Campinas",
    "estado": "SP",
    "endereco": "Avenida Barão de Itapura",
    "numero": "1500"
  }
  ```
* **Respostas:**
  * **Status `200 OK`:**
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
  * **Status `400 Bad Request`:**
    ```json
    {
      "error": "Erro de validação na atualização do paciente.",
      "erros": [
        "O campo 'telefone' fornecido possui formato inválido."
      ]
    }
    ```
  * **Status `401 Unauthorized`:**
    ```json
    {
      "error": "Token JWT inválido ou expirado."
    }
    ```
  * **Status `403 Forbidden`:**
    ```json
    {
      "error": "Acesso negado: o terapeuta não possui vínculo ativo com este paciente."
    }
    ```
  * **Status `404 Not Found`:**
    ```json
    {
      "error": "Paciente não encontrado para atualização."
    }
    ```
  * **Status `409 Conflict`:**
    ```json
    {
      "error": "Já existe outro paciente cadastrado com este CPF."
    }
    ```

---

#### Rota 5: Desativação de Paciente (Soft Delete - RN05)
* **Método:** `DELETE`
* **URL:** `/api/paciente/:id`
* **Regra Clínica RN05:**
  * Jamais apaga fisicamente registros de prontuários clínicos.
  * Define `status_ativo = false` e atualiza `updated_at`.
* **Path Parameters:**
  * `id` (`string`, UUID obrigatório).
* **Exemplo de Chamada:**
  ```http
  DELETE /api/paciente/7c9e6679-7425-40de-944b-e07fc1f90ae7 HTTP/1.1
  Host: localhost:3000
  ```
* **Respostas:**
  * **Status `200 OK`:**
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
  * **Status `400 Bad Request`:**
    ```json
    {
      "error": "O parâmetro ID deve ser um UUID válido."
    }
    ```
  * **Status `404 Not Found`:**
    ```json
    {
      "error": "Paciente não encontrado para desativação."
    }
    ```

---

#### Rota 6: Reativar Paciente Inativo
* **Método:** `PATCH`
* **URL:** `/api/paciente/:id/reativar`
* **Path Parameters:** `id` (`string`, UUID obrigatório).
* **Respostas:**
  * **Status `200 OK`:**
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
  * **Status `404 Not Found`:**
    ```json
    {
      "error": "Paciente não encontrado para reativação."
    }
    ```

---

#### Rota 7: Exclusão Física Permanente (Hard Delete - DEV/Testes)
* **Método:** `DELETE`
* **URL:** `/api/paciente/:id/hard`
* **Aviso de Segurança:**
  * Restrito a testes unitários, automação em CI e testes locais. Não deve ser invocado em ambiente de produção clínica.
* **Respostas:**
  * **Status `200 OK`:**
    ```json
    {
      "message": "Paciente excluído fisicamente do banco com sucesso (hard delete para testes)."
    }
    ```
  * **Status `404 Not Found`:**
    ```json
    {
      "error": "Paciente não encontrado para exclusão física."
    }
    ```

---

#### Rota 8: Listar Terapeutas Vinculados ao Paciente (Equipe Multidisciplinar)
* **Método:** `GET`
* **URL:** `/api/paciente/:id/terapeutas`
* **Headers Requeridos:** `Authorization: Bearer <TOKEN_JWT>`
* **Segurança:** `authMiddleware` + `verificarVisibilidadePaciente` (**RN04**).
* **Path Parameters:** `id` (`string`, UUID do paciente).
* **Respostas:**
  * **Status `200 OK`:**
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
  * **Status `403 Forbidden`:**
    ```json
    {
      "error": "Acesso negado: o terapeuta não possui vínculo ativo com este paciente."
    }
    ```
  * **Status `404 Not Found`:**
    ```json
    {
      "error": "Paciente não encontrado ao listar terapeutas vinculados."
    }
    ```

---

#### Rota 9: Vincular Novo Terapeuta ao Paciente (RF18)
* **Método:** `POST`
* **URL:** `/api/paciente/:id/terapeutas`
* **Headers Requeridos:**
  * `Authorization: Bearer <TOKEN_JWT>`
  * `Content-Type: application/json`
* **Path Parameters:**
  * `id` (`string`, UUID do paciente).
* **Request Body (JSON):**
  ```json
  {
    "terapeuta_id": "4bb67a12-88ef-4109-b132-7c8899aabbcc"
  }
  ```
* **Regras de Validação:**
  * Bloqueia vínculo caso o paciente ou o terapeuta esteja inativo.
  * **Isolamento Multitenant Clínico:** Bloqueia a tentativa de associar profissionais pertencentes a clínicas distintas.
* **Respostas:**
  * **Status `201 Created`:**
    ```json
    {
      "message": "Terapeuta vinculado ao paciente com sucesso."
    }
    ```
  * **Status `400 Bad Request` (Bloqueio Institucional / Inativo):**
    ```json
    {
      "error": "Bloqueio de segurança: Não é permitido vincular terapeutas de clínicas diferentes."
    }
    ```
  * **Status `401 Unauthorized`:**
    ```json
    {
      "error": "Acesso não autorizado. Forneça um token no cabeçalho Authorization: Bearer <token>."
    }
    ```
  * **Status `404 Not Found`:**
    ```json
    {
      "error": "Terapeuta não encontrado para vinculação."
    }
    ```

---

#### Rota 10: Desvincular Terapeuta do Paciente (RF18)
* **Método:** `DELETE`
* **URL:** `/api/paciente/:id/terapeutas/:terapeutaId`
* **Headers Requeridos:** `Authorization: Bearer <TOKEN_JWT>`
* **Path Parameters:**
  * `id` (`string`, UUID do paciente).
  * `terapeutaId` (`string`, UUID do terapeuta a ser desvinculado).
* **Respostas:**
  * **Status `200 OK`:**
    ```json
    {
      "message": "Vínculo do terapeuta com o paciente removido com sucesso."
    }
    ```
  * **Status `400 Bad Request`:**
    ```json
    {
      "error": "O parâmetro \"terapeutaId\" deve ser um UUID válido."
    }
    ```
  * **Status `404 Not Found`:**
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
* **Método:** `GET`
* **URL:** `/api/jogos`
* **Query Parameters:**

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição | Exemplo |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `objetivo` | `string` | Não | — | Filtro por objetivo clínico (ex: `foco_atencional`, `regulacao_emocional`, `linguagem`) | `foco_atencional` |
| `page` | `integer` | Não | `1` | Página atual dos resultados | `1` |
| `limit` | `integer` | Não | `10` | Quantidade de jogos retornados por página | `10` |

* **Exemplo de Chamada:**
  ```http
  GET /api/jogos?objetivo=foco_atencional&page=1&limit=10 HTTP/1.1
  Host: localhost:3000
  ```
* **Respostas:**
  * **Status `200 OK`:**
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
  * **Status `500 Internal Server Error`:**
    ```json
    {
      "error": "Erro ao listar catálogo de jogos"
    }
    ```

---

#### Rota 2: Consultar Detalhes de um Jogo Específico
* **Método:** `GET`
* **URL:** `/api/jogos/:id`
* **Path Parameters:**
  * `id` (`string`, obrigatório): Identificador numérico ou slug do jogo.
* **Exemplo de Chamada:**
  ```http
  GET /api/jogos/1 HTTP/1.1
  Host: localhost:3000
  ```
* **Respostas:**
  * **Status `200 OK`:**
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
  * **Status `404 Not Found`:**
    ```json
    {
      "error": "Jogo não encontrado"
    }
    ```

---

#### Rota 3: Obter Manifesto e Relatório de Conformidade do Jogo
* **Método:** `GET`
* **URL:** `/api/jogos/:id/manifesto`
* **Finalidade:** Inspeciona o campo `manifesto_json` do jogo e avalia a conformidade com as regras de tipagem estrita (**RN02** e **RNF02**).
* **Path Parameters:** `id` (`string`, obrigatório).
* **Respostas:**
  * **Status `200 OK`:**
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
  * **Status `404 Not Found`:**
    ```json
    {
      "error": "Jogo não encontrado"
    }
    ```

---

#### Rota 4: Validação Externa de Manifesto de Jogos (Contrato 1 - RNF02)
* **Método:** `POST`
* **URL:** `/api/jogos/validar-manifesto`
* **Headers Requeridos:** `Content-Type: application/json`
* **Descrição Técnica:**
  * Submete um arquivo ou payload de manifesto para validação formal prévia à homologação no catálogo.
  * Valida presença de `id_jogo`, `nome`, `versao`, `metricas_suportadas` e tipagem estrita de cada métrica (`numerica` ou `categorica`).
* **Exemplo de Request Body Válido:**
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
* **Respostas:**
  * **Status `200 OK` (Manifesto Homologado):**
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
  * **Status `400 Bad Request` (Manifesto Inválido / Métricas Sem Tipo):**
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
* **Método:** `POST`
* **URL:** `/api/jogos/:id/validar-telemetria`
* **Headers Requeridos:** `Content-Type: application/json`
* **Contexto Clínico & Diretriz RN02:**
  * **Regra Inviolável:** Métricas clínicas coletadas dos jogos sem tipo explícito ou com valores incompatíveis **NUNCA** devem ser gravadas no prontuário nem tratadas arbitrariamente como dados categóricos.
  * Se a métrica violar o manifesto ou o domínio definido, o endpoint recusa a gravação retornando **`422 Unprocessable Entity`**, resguardando os relatórios médicos e algoritmos clínicos de dados espúrios.
* **Path Parameters:**
  * `id` (`string`, obrigatório): Identificador do jogo no catálogo.
* **Request Body (JSON):**
  * `token_sessao` (`string`, obrigatório): Token identificador da sessão ativa.
  * `data_hora` (`string`, formato ISO 8601 UTC): Carimbo temporal do evento.
  * `tipo_evento` (`string`, obrigatório): Ex: `coleta_metrica`, `interacao_paciente`.
  * `dados` (`object`, obrigatório):
    * `id_metrica` (`string`, obrigatório): Identificador registrado no manifesto.
    * `valor` (`number` | `string`, obrigatório): Valor apurado no jogo.

* **Exemplo 1 — Telemetria Aprovada (Métrica Numérica):**
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
  * **Resposta `200 OK`:**
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

* **Exemplo 2 — Telemetria Rejeitada por Violação da RN02 (Status 422):**
  * Requisição com valor textual em métrica definida como numérica no manifesto:
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
  * **Resposta `422 Unprocessable Entity`:**
    ```json
    {
      "podeGravar": false,
      "error": "A métrica 'tempo_resposta' é do tipo numérica, mas recebeu valor não numérico: 'resposta_muito_rapida'",
      "regraViolada": "RN02 - Fallback de Métrica Proibido"
    }
    ```

* **Exemplo 3 — Telemetria Rejeitada por Valor Fora do Domínio Categórico (Status 422):**
  * Requisição para a métrica `nivel_frustracao` (domínio: `["baixo", "medio", "alto"]`) com valor `"desesperado"`:
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
  * **Resposta `422 Unprocessable Entity`:**
    ```json
    {
      "podeGravar": false,
      "error": "O valor 'desesperado' não pertence ao domínio permitido para a métrica 'nivel_frustracao': [baixo, medio, alto]",
      "regraViolada": "RN02 - Fallback de Métrica Proibido"
    }
    ```

* **Status `404 Not Found` (Jogo Inexistente):**
  ```json
  {
    "error": "Jogo não encontrado"
  }
  ```

---

## 4. Matriz Rastreabilidade: Requisitos x Rotas x Códigos HTTP

| Requisito / Regra | Rota Principal | Códigos HTTP Atendidos | Detalhe de Implementação |
| :--- | :--- | :--- | :--- |
| **RF06** (CRUD Paciente) | `POST`, `GET`, `PUT`, `DELETE /api/paciente` | `200`, `201`, `400`, `404`, `409` | Validação de DTOs, campos de responsáveis e soft delete. |
| **RF09** (Biblioteca de Jogos) | `GET /api/jogos`, `GET /api/jogos/:id` | `200`, `404`, `500` | Exibição de cards, objetivos clínicos e status de instalação. |
| **RF11** (Modo Livre) | `GET /api/jogos` | `200` | Suporte a partidas desvinculadas de prontuário clínico. |
| **RF18** (Vínculo Multiterapeuta) | `POST`, `DELETE /api/paciente/:id/terapeutas` | `200`, `201`, `400`, `401`, `403`, `404` | Vínculos N:N com barreira institucional entre clínicas. |
| **RF19** (Filtros e Busca) | `GET /api/paciente`, `GET /api/jogos` | `200`, `400` | Busca por nome/CPF, faixa etária calculada e objetivo clínico. |
| **RF21** (Vínculo Automático) | `POST /api/paciente` | `201`, `400` | Associação automática do terapeuta logado via trigger/model. |
| **RN02** (Tipagem Estrita) | `POST /api/jogos/:id/validar-telemetria` | `200`, `404`, `422` | Rejeição mandatória com status 422 para métricas sem tipo estrito. |
| **RN04** (Visibilidade por Vínculo)| `GET`, `PUT /api/paciente/:id` | `200`, `401`, `403`, `404` | Middleware `verificarVisibilidadePaciente` bloqueia terapeutas sem vínculo. |
| **RN05** (Soft Delete) | `DELETE /api/paciente/:id` | `200`, `404` | Inativação sem perda do histórico de prontuário médico. |
| **RNF02** (Contrato e OpenAPI) | `POST /api/jogos/validar-manifesto` | `200`, `400`, `500` | Conformidade com `manifestoGame.json` e documentação interativa. |

---

## 5. Como Executar e Acessar o Swagger UI

1. **Instalação e Inicialização:**
   ```bash
   cd Backend
   npm install
   npm run dev
   ```

2. **Acesso à Documentação Interativa:**
   - Navegue até `http://localhost:3000/api/docs`.
   - O Swagger UI renderizará automaticamente os esquemas, exemplos de payload e respostas documentados via Swagger JSDoc.
