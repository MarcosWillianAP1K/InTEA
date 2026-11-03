# Roteiro de Testes Manuais e Critérios de Aceite — Sprint 7

> **Tarefa:** 5.6 — `Docs: Casos de Teste e Critérios de Aceite Formais`  
> **Módulos cobertos:** Gerenciamento de Pacientes · Biblioteca de Jogos Terapêuticos  
> **Requisitos rastreados:** RF06, RF09, RF11, RF18, RF19, RF21, RN02, RN04, RN05, RNF02

---

## Convenções

| Campo | Descrição |
| :--- | :--- |
| **CT-ID** | Identificador único do caso de teste |
| **Requisito** | Requisito ou regra de negócio validada |
| **Tipo** | `Positivo` (fluxo feliz) ou `Negativo` (rejeição / segurança) |
| **Precondição** | Estado inicial necessário antes da execução |
| **Entrada** | Endpoint, payload ou ação do testador |
| #### Passos | Sequência de ações a executar |
| #### Resultado Esperado | Comportamento correto esperado do sistema |
| **Status** | `[ ] Passou` · `[ ] Falhou` · `[ ] Pendente` |

> **Ferramenta sugerida:** Postman ou Insomnia. Base URL: `http://localhost:3000/api`

---

## Módulo 1 — Gerenciamento de Pacientes

### CT-P01 — Cadastro de Paciente com Dados Completos

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06 — Cadastro e Gestão de Pacientes |
| **Tipo** | Positivo |
| **Precondição** | API em execução; banco acessível |

**Entrada — `POST /api/paciente`**

```json
{
  "nome": "Lucas Gabriel Santos",
  "data_nascimento": "2019-04-10",
  "cpf": "529.982.247-25",
  "telefone": "(11) 97777-6666",
  "cep": "04567-000",
  "cidade": "São Paulo",
  "estado": "SP",
  "responsavel": {
    "nome": "Mariana Santos",
    "telefone": "(11) 98888-5555",
    "parentesco": "Mãe"
  }
}
```

#### Passos

1. Abrir Postman/Insomnia.
2. Configurar `POST /api/paciente` com o body acima.
3. Executar a requisição.

#### Resultado Esperado

- HTTP **201 Created**
- `data.id` presente (UUID gerado automaticamente)
- `data.status_ativo: true`
- `data.responsaveis[]` com a mãe vinculada
- Mensagem: _"Paciente cadastrado com sucesso."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P02 — Rejeição de CPF Inválido

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06 — Validação de DTO |
| **Tipo** | Negativo |
| **Precondição** | API em execução |

**Entrada — `POST /api/paciente`** com `"cpf": "111.111.111-11"` (todos os dígitos iguais)

#### Passos

1. Configurar `POST /api/paciente`.
2. Inserir CPF matematicamente inválido.
3. Executar a requisição.

#### Resultado Esperado

- HTTP **400 Bad Request**
- Campo `error` indicando falha de validação
- Campo `erros[]` descrevendo o CPF como inválido

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P03 — Conflito por CPF Já Cadastrado

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06 — Unicidade de CPF |
| **Tipo** | Negativo |
| **Precondição** | Paciente com CPF `529.982.247-25` já cadastrado (executar CT-P01 antes) |

**Entrada — `POST /api/paciente`** com o mesmo CPF do CT-P01

#### Passos

1. Executar CT-P01 com sucesso.
2. Repetir o mesmo `POST` sem alterar o CPF.

#### Resultado Esperado

- HTTP **409 Conflict**
- Mensagem: _"Já existe um paciente cadastrado com este CPF."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P04 — Listagem Padrão Exclui Pacientes Inativados

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06 — Listagem; RN05 — Soft Delete |
| **Tipo** | Positivo |
| **Precondição** | Ao menos 1 paciente ativo e 1 inativo no banco |

**Entrada — `GET /api/paciente`** (sem parâmetros)

#### Passos

1. Executar `GET /api/paciente`.
2. Verificar os registros retornados.

#### Resultado Esperado

- HTTP **200 OK**
- `data[]` somente com `status_ativo: true`
- Metadados `meta.total`, `page`, `limit` e `totalPages` presentes

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P05 — Busca por Nome e Faixa Etária com Paginação

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF19 — Busca e Filtros Avançados |
| **Tipo** | Positivo |
| **Precondição** | Pacientes com idades variadas cadastrados |

**Entrada — `GET /api/paciente?nome=Lucas&idadeMin=4&idadeMax=10&page=1&limit=5`**

#### Passos

1. Executar a `GET` com os parâmetros acima.
2. Analisar os registros e metadados retornados.

#### Resultado Esperado

- HTTP **200 OK**
- Apenas pacientes cujo nome contenha _Lucas_ (case-insensitive)
- Idades entre 4 e 10 anos
- No máximo 5 registros por resposta

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P06 — Consulta de Prontuário com Vínculo Ativo (RN04)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06; RN04 — Visibilidade por Vínculo |
| **Tipo** | Positivo |
| **Precondição** | Terapeuta com token JWT válido e vínculo ativo em `terapeuta_paciente` |

**Entrada — `GET /api/paciente/{uuid}`**

```http
Authorization: Bearer {token}
```

#### Passos

1. Obter token JWT via login.
2. Garantir que o terapeuta possui vínculo com o paciente.
3. Executar `GET /api/paciente/{id}`.

#### Resultado Esperado

- HTTP **200 OK**
- `data` com dados completos, `responsaveis[]` e `terapeutas[]`

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P07 — Bloqueio de Acesso sem Vínculo Ativo (RN04)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN04 — Visibilidade por Vínculo e Instituição |
| **Tipo** | Negativo — segurança clínica |
| **Precondição** | Terapeuta com token JWT válido **sem** vínculo com o paciente consultado |

**Entrada — `GET /api/paciente/{uuid-sem-vinculo}`**

```http
Authorization: Bearer {token}
```

#### Passos

1. Autenticar terapeuta que **não** está vinculado ao paciente.
2. Executar `GET /api/paciente/{id}`.

#### Resultado Esperado

- HTTP **403 Forbidden**
- Mensagem: _"Acesso negado: o terapeuta não possui vínculo ativo com este paciente."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P08 — Bloqueio por JWT Ausente ou Inválido

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RNF02 — Segurança; RN04 |
| **Tipo** | Negativo — autenticação |
| **Precondição** | Nenhum header de autenticação enviado |

**Entrada — `GET /api/paciente/{id}`** sem header `Authorization`

#### Passos

1. Executar `GET /api/paciente/{id}` sem token.

#### Resultado Esperado

- HTTP **401 Unauthorized**
- Mensagem: _"Acesso não autorizado. Forneça um token no cabeçalho Authorization: Bearer \<token\>."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P09 — Soft Delete: Inativação sem Exclusão Física (RN05)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN05 — Inalterabilidade do Histórico Clínico |
| **Tipo** | Positivo |
| **Precondição** | Paciente ativo com UUID conhecido |

**Entrada — `DELETE /api/paciente/{id}`**

#### Passos

1. Executar `DELETE /api/paciente/{id}`.
2. Verificar `status_ativo` na resposta.
3. Executar `GET /api/paciente` e confirmar ausência do paciente.
4. Verificar **diretamente no banco** que o registro **não foi deletado fisicamente**.

#### Resultado Esperado

- HTTP **200 OK**
- `data.status_ativo: false`
- Paciente ausente da listagem padrão
- Registro físico preservado no banco

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P10 — Reativação de Paciente Inativo

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06; RN05 |
| **Tipo** | Positivo |
| **Precondição** | Paciente com `status_ativo: false` (executar CT-P09 antes) |

**Entrada — `PATCH /api/paciente/{id}/reativar`**

#### Passos

1. Inativar o paciente (CT-P09).
2. Executar `PATCH /api/paciente/{id}/reativar`.
3. Confirmar `status_ativo` e visibilidade na listagem.

#### Resultado Esperado

- HTTP **200 OK**
- `data.status_ativo: true`
- Mensagem: _"Paciente reativado com sucesso."_
- Paciente visível novamente na listagem padrão

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P11 — Vínculo de Terapeuta ao Paciente (RF18)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF18 — Vínculos Multiterapeuta; RF21 |
| **Tipo** | Positivo |
| **Precondição** | Paciente ativo; terapeuta ativo com a mesma `clinica_id`; token JWT válido |

**Entrada — `POST /api/paciente/{id}/terapeutas`**

```json
{ "terapeuta_id": "{uuid-do-terapeuta}" }
```

#### Passos

1. Autenticar e obter token JWT.
2. Executar `POST /api/paciente/{id}/terapeutas`.
3. Confirmar com `GET /api/paciente/{id}/terapeutas`.

#### Resultado Esperado

- HTTP **201 Created**
- Mensagem: _"Terapeuta vinculado ao paciente com sucesso."_
- Registro criado em `terapeuta_paciente`

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P12 — Bloqueio de Vínculo entre Clínicas Distintas

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF18; RN04 — Isolamento Institucional |
| **Tipo** | Negativo — segurança multitenant |
| **Precondição** | Paciente em `clinica_id = A`; terapeuta em `clinica_id = B` |

**Entrada — `POST /api/paciente/{id}/terapeutas`** com `terapeuta_id` de outra clínica

#### Passos

1. Tentar vincular terapeuta de clínica diferente.

#### Resultado Esperado

- HTTP **400 Bad Request**
- Mensagem: _"Bloqueio de segurança: Não é permitido vincular terapeutas de clínicas diferentes."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P13 — Bloqueio de Vínculo com Paciente Inativo

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF18; RN05 |
| **Tipo** | Negativo |
| **Precondição** | Paciente com `status_ativo: false` |

**Entrada — `POST /api/paciente/{id-inativo}/terapeutas`**

#### Passos

1. Inativar o paciente (CT-P09).
2. Tentar vincular um terapeuta ao paciente inativo.

#### Resultado Esperado

- HTTP **400 Bad Request**
- Mensagem: _"Não é possível vincular terapeuta a um paciente inativo."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P14 — Atualização Parcial de Dados do Paciente

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06 — Atualização de Paciente |
| **Tipo** | Positivo |
| **Precondição** | Paciente cadastrado; terapeuta vinculado com token válido |

**Entrada — `PUT /api/paciente/{id}`**

```json
{ "telefone": "(11) 99999-1122", "cidade": "Campinas" }
```

#### Passos

1. Autenticar terapeuta com vínculo ativo.
2. Executar `PUT /api/paciente/{id}` com body parcial.
3. Confirmar novos valores com `GET /api/paciente/{id}`.

#### Resultado Esperado

- HTTP **200 OK**
- `telefone` e `cidade` atualizados; demais campos inalterados
- `updated_at` renovado

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P15 — Rejeição de UUID Malformado na Rota

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06 — Validação de Entrada |
| **Tipo** | Negativo |
| **Precondição** | API em execução |

**Entrada — `GET /api/paciente/nao-e-uuid-valido`**

#### Passos

1. Executar `GET` com string arbitrária no lugar do UUID.

#### Resultado Esperado

- HTTP **400 Bad Request**
- Mensagem: _"O parâmetro ID deve ser um UUID válido."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

## Módulo 2 — Biblioteca de Jogos Terapêuticos

### CT-J01 — Listagem do Catálogo Completo de Jogos

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF09 — Biblioteca de Jogos Terapêuticos |
| **Tipo** | Positivo |
| **Precondição** | Seed executado com 3 jogos: _Aventura das Cores_, _Formas Calmas_, _O Som dos Animais_ |

**Entrada — `GET /api/jogos`**

#### Passos

1. Executar `GET /api/jogos`.
2. Verificar estrutura e quantidade de registros.

#### Resultado Esperado

- HTTP **200 OK**
- `data[]` com ao menos 3 jogos, cada um com `nome`, `versao`, `descricao` e `status_instalacao`
- Campo `manifesto_json` **ausente** na listagem resumida
- Metadados de paginação presentes

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J02 — Filtro por Objetivo Clínico

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF09; RF19 — Filtros Avançados |
| **Tipo** | Positivo |
| **Precondição** | Seed executado; jogos com objetivos distintos |

#### Entradas

- `GET /api/jogos?objetivo=foco_atencional`
- `GET /api/jogos?objetivo=regulacao_emocional`
- `GET /api/jogos?objetivo=desenvolvimento_linguagem`

#### Passos

1. Executar cada filtro separadamente.
2. Verificar qual jogo é retornado em cada consulta.

#### Resultado Esperado

| Filtro | Jogo Esperado |
| :--- | :--- |
| `foco_atencional` | _Aventura das Cores_ |
| `regulacao_emocional` | _Formas Calmas_ |
| `desenvolvimento_linguagem` | _O Som dos Animais_ |

Cada consulta retorna exatamente **1 jogo**; `total: 1`.

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J03 — Filtro com Objetivo Inexistente

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF09; RF19 |
| **Tipo** | Negativo (sem correspondência) |
| **Precondição** | Seed executado |

**Entrada — `GET /api/jogos?objetivo=objetivo_inexistente`**

#### Passos

1. Executar a `GET` com objetivo que não existe no catálogo.

#### Resultado Esperado

- HTTP **200 OK**
- `data: []`
- `total: 0`

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J04 — Paginação da Biblioteca de Jogos

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF19 — Paginação |
| **Tipo** | Positivo |
| **Precondição** | Seed com 3 jogos |

#### Entradas

- `GET /api/jogos?page=1&limit=2`
- `GET /api/jogos?page=2&limit=2`

#### Passos

1. Executar consulta da página 1.
2. Executar consulta da página 2.
3. Verificar que os jogos das duas páginas **não se repetem**.

#### Resultado Esperado

- Página 1: 2 jogos; `totalPages ≥ 2`
- Página 2: ao menos 1 jogo diferente dos da página 1

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J05 — Consulta de Detalhes com Manifesto JSON

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF09; RNF02 — Contrato de Dados |
| **Tipo** | Positivo |
| **Precondição** | Jogo ID 1 (_Aventura das Cores_) no banco |

**Entrada — `GET /api/jogos/1`**

#### Passos

1. Executar `GET /api/jogos/1`.
2. Verificar presença e estrutura do `manifesto_json`.

#### Resultado Esperado

- HTTP **200 OK**
- `data.nome = "Aventura das Cores"`
- `data.manifesto_json` com `id_jogo`, `versao` e `metricas_suportadas[]`

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J06 — Retorno 404 para Jogo Inexistente

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF09 |
| **Tipo** | Negativo |
| **Precondição** | Banco sem jogo com ID `999999` |

**Entrada — `GET /api/jogos/999999`**

#### Passos

1. Executar `GET` com ID inexistente.

#### Resultado Esperado

- HTTP **404 Not Found**
- Mensagem: _"Jogo não encontrado"_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J07 — Validação de Manifesto Conforme (RNF02)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RNF02; RN02 — Tipagem Estrita |
| **Tipo** | Positivo |
| **Precondição** | API em execução |

**Entrada — `POST /api/jogos/validar-manifesto`**

```json
{
  "id_jogo": "jogo-novo",
  "nome": "Jogo Novo",
  "versao": "1.0.0",
  "metricas_suportadas": [
    {
      "id_metrica": "tempo_resposta",
      "tipo_metrica": "numerica",
      "unidade": "segundos"
    }
  ]
}
```

#### Passos

1. Executar `POST /api/jogos/validar-manifesto` com o payload acima.

#### Resultado Esperado

- HTTP **200 OK**
- `valido: true`
- Campo `data` com o manifesto homologado

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J08 — Rejeição de Manifesto com Métrica Sem Tipo (RN02)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN02 — Tipagem Estrita sem Fallback; RNF02 |
| **Tipo** | Negativo — regra clínica crítica |
| **Precondição** | API em execução |

**Entrada — `POST /api/jogos/validar-manifesto`**

```json
{
  "id_jogo": "jogo-invalido",
  "nome": "Jogo Inválido",
  "versao": "1.0.0",
  "metricas_suportadas": [
    { "id_metrica": "engajamento" }
  ]
}
```

> Note que `tipo_metrica` está ausente — isto viola a RN02.

#### Passos

1. Executar `POST` com métrica sem `tipo_metrica`.

#### Resultado Esperado

- HTTP **400 Bad Request**
- `valido: false`
- `erros[]` mencionando **RN02** e proibição de fallback automático

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J09 — Telemetria Aprovada para Gravação (RN02)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN02; RNF02 |
| **Tipo** | Positivo |
| **Precondição** | Jogo ID 1 no banco com métrica numérica `tempo_resposta` |

**Entrada — `POST /api/jogos/1/validar-telemetria`**

```json
{
  "token_sessao": "tok-001",
  "data_hora": "2026-09-23T15:00:00Z",
  "tipo_evento": "coleta_metrica",
  "dados": {
    "id_metrica": "tempo_resposta",
    "valor": 2.45
  }
}
```

#### Passos

1. Executar `POST /api/jogos/1/validar-telemetria`.

#### Resultado Esperado

- HTTP **200 OK**
- `podeGravar: true`
- `tipoDetectado: "numerica"`
- `metricaHomologada` presente

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J10 — Bloqueio de Telemetria com Tipo Incompatível (422)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN02 — Proibição de Fallback de Métrica |
| **Tipo** | Negativo — violação de regra clínica crítica |
| **Precondição** | Jogo ID 1 com `tempo_resposta` do tipo `numerica` |

**Entrada — `POST /api/jogos/1/validar-telemetria`**

```json
{
  "token_sessao": "tok-002",
  "data_hora": "2026-09-23T15:01:00Z",
  "tipo_evento": "coleta_metrica",
  "dados": {
    "id_metrica": "tempo_resposta",
    "valor": "muito_rapido"
  }
}
```

> Valor textual em métrica definida como numérica — viola RN02.

#### Passos

1. Executar `POST` com valor de tipo incompatível.

#### Resultado Esperado

- HTTP **422 Unprocessable Entity**
- `podeGravar: false`
- `regraViolada: "RN02 - Fallback de Métrica Proibido"`
- Mensagem descrevendo o tipo esperado versus o recebido

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J11 — Bloqueio de Telemetria com Valor Fora do Domínio

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN02 |
| **Tipo** | Negativo — domínio de valores |
| **Precondição** | Jogo ID 1 com `nivel_frustracao` do tipo `categorica` e domínio `["baixo", "medio", "alto"]` |

**Entrada — `POST /api/jogos/1/validar-telemetria`**

```json
{
  "token_sessao": "tok-003",
  "data_hora": "2026-09-23T15:02:00Z",
  "tipo_evento": "coleta_metrica",
  "dados": {
    "id_metrica": "nivel_frustracao",
    "valor": "desesperado"
  }
}
```

> `"desesperado"` não pertence ao domínio `["baixo", "medio", "alto"]`.

#### Passos

1. Executar `POST` com valor fora do domínio autorizado.

#### Resultado Esperado

- HTTP **422 Unprocessable Entity**
- `podeGravar: false`
- Mensagem indicando que `"desesperado"` não pertence ao domínio `[baixo, medio, alto]`

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J12 — Manifesto com Laudo de Conformidade

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RNF02 — Contrato do Manifesto |
| **Tipo** | Positivo |
| **Precondição** | Jogo ID 1 com manifesto cadastrado |

**Entrada — `GET /api/jogos/1/manifesto`**

#### Passos

1. Executar `GET /api/jogos/1/manifesto`.
2. Analisar o objeto `validacao` na resposta.

#### Resultado Esperado

- HTTP **200 OK**
- Campo `data` com o manifesto JSON completo
- `validacao.valido: true`
- `validacao.erros: []`

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

## Módulo 3 — Pareamento Remoto e Sessões (Sprint 8)

### CT-S01 — Pareamento Remoto Bem-Sucedido com Handshake e WebSocket

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF10 — Pareamento Remoto via Session Token (Fig. 3) |
| **Tipo** | Positivo |
| **Precondição** | Sessão criada com status `aguardando_conexao`; terapeuta conectado na sala WebSocket |

**Entrada — `POST /api/sessao/parear`**

```json
{
  "session_token": "849-291",
  "dispositivo_info": {
    "tipo_dispositivo": "tablet",
    "modelo": "Galaxy Tab S8",
    "sistema_operacional": "Android 14",
    "resolucao": "2560x1600",
    "versao_jogo": "1.2.0"
  }
}
```

#### Passos

1. Abrir conexão WebSocket no namespace `/sessao` com `role: 'terapeuta'` e entrar na sala da sessão `849-291`.
2. O jogo remoto envia requisição `POST /api/sessao/parear` com o token e metadados.
3. Observar a resposta HTTP e a notificação instantânea no canal WebSocket.

#### Resultado Esperado

- HTTP **200 OK**
- `message: "Dispositivo pareado com sucesso"`
- `data.status_sessao: "em_andamento"`
- `data.websocket.canal: "session_849-291"`
- O terapeuta recebe via WebSocket o evento `dispositivo_conectado` com os dados do dispositivo.

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S02 — Normalização Automática de Token sem Hífen e com Espaços

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF10, RNF03 — Usabilidade e Tolerância de Formato |
| **Tipo** | Positivo |
| **Precondição** | Sessão ativa com token `849-291` |

**Entrada — `POST /api/sessao/parear`**

```json
{
  "session_token": "  849291  "
}
```

#### Passos

1. O jogador digita o PIN contínuo sem traços ou com espaços residuais.
2. Executar `POST /api/sessao/parear`.

#### Resultado Esperado

- HTTP **200 OK**
- Token normalizado com sucesso e pareamento concluído.

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S03 — Rejeição de Token Expirado (RNF03)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RNF03 — Segurança e Expiração Efêmera de 15 Minutos |
| **Tipo** | Negativo |
| **Precondição** | Sessão emitida há mais de 15 minutos com `expira_em` no passado |

**Entrada — `POST /api/sessao/parear`**

```json
{
  "session_token": "EXP-001"
}
```

#### Passos

1. Tentar parear com um token cujo tempo limite de 15 minutos expirou.

#### Resultado Esperado

- HTTP **410 Gone**
- `error: "Token de pareamento expirado"`
- Detalhes informando a necessidade de gerar novo código no painel web.

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S04 — Rejeição de Token Inexistente ou Incorreto

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF10 — Validação de Integridade de Token |
| **Tipo** | Negativo |
| **Precondição** | Token não cadastrado no banco |

**Entrada — `POST /api/sessao/parear`**

```json
{
  "session_token": "999-999"
}
```

#### Passos

1. Submeter código PIN inexistente ou incorreto.

#### Resultado Esperado

- HTTP **404 Not Found**
- `error: "Sessão não encontrada para o token informado"`

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S05 — Rejeição de Pareamento Concorrente (Sessão Já em Andamento)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF10 — Exclusividade de Conexão por Sessão |
| **Tipo** | Negativo |
| **Precondição** | Sessão já pareada com status `em_andamento` |

**Entrada — `POST /api/sessao/parear`**

```json
{
  "session_token": "AND-002"
}
```

#### Passos

1. Um segundo dispositivo tenta utilizar o mesmo PIN de uma sessão ativa.

#### Resultado Esperado

- HTTP **409 Conflict**
- `error: "Sessão já pareada ou em andamento"`

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S06 — Monitoramento de Queda de Conexão e Reconexão (RNF04)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RNF04 — Resiliência de Conexão e Detecção de Presença |
| **Tipo** | Positivo |
| **Precondição** | Dispositivo pareado ativo na sala WebSocket |

#### Passos

1. Dispositivo conectado simula queda de sinal ou desconexão abrupta de rede.
2. Analisar o evento recebido na interface do terapeuta (`dispositivo_desconectado`).
3. O dispositivo restabelece a rede e reconecta ao WebSocket com o mesmo token.
4. Analisar o evento de reconexão (`dispositivo_reconectado`).

#### Resultado Esperado

- No momento da queda: evento `dispositivo_desconectado` com timestamp e causa.
- No retorno da rede: evento `dispositivo_reconectado` com métrica exata de `tempo_offline_ms` e status `em_andamento`.

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---


### CT-S07 — Início de Sessão Clínica com Injeção de Contexto DDA (RN03)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF12 — Gestão de Sessão; RF13 — Ciclo da Sessão; RN03 — Contexto DDA |
| **Tipo** | Positivo |
| **Precondição** | Terapeuta autenticado; paciente ativo vinculado (**RN04**); jogo selecionado no catálogo |

**Entrada — `POST /api/sessao/iniciar`**

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

#### Passos

1. Autenticar terapeuta e obter token JWT válido no Supabase Auth.
2. Gerar código PIN alfanumérico via `GET /api/sessao/gerarCodigoPareamento`.
3. Executar `POST /api/sessao/iniciar` com o payload acima incluindo parâmetros DDA.

#### Resultado Esperado

- HTTP **201 Created**
- `data.status_sessao: "aguardando_pareamento"`
- `data.session_token: "4M5S-8U7B"`
- `data.paciente_id` preenchido
- `data.expira_em` com carimbo de expiração de 15 minutos (**RNF03**)
- Contexto DDA registrado e pronto para entrega ao jogo no handshake (**RN03**)

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S08 — Ingestão de Evento de Telemetria com Persistência em Sessão Clínica

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF12 — Gestão de Sessão; RN02 — Tipagem Estrita; RNF05 — Tempo Real (< 100ms) |
| **Tipo** | Positivo |
| **Precondição** | Sessão pareada e ativa com status `em_andamento` |

**Entrada — `POST /api/telemetria`**

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

#### Passos

1. Garantir que a sessão realizou handshake de pareamento com sucesso e está em `em_andamento`.
2. O tablet do jogo transmite o evento de interação através da rota HTTP ou WebSocket.
3. Verificar a resposta retornada e consultar a persistência no banco.

#### Resultado Esperado

- HTTP **201 Created**
- `message: "Evento de telemetria registrado com sucesso"`
- `persistido: true`
- `data.id` presente com UUID do registro inserido na tabela `telemetria_evento`
- Dados refletidos imediatamente no cockpit do terapeuta

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S09 — Ingestão em Lote de Telemetria Contínua (Batch Insert - RNF05)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF12 — Telemetria Contínua; RNF03 — Limites de Segurança; RNF05 — Alta Vazão |
| **Tipo** | Positivo |
| **Precondição** | Sessão em andamento com alto volume de eventos gerados |

**Entrada — `POST /api/telemetria/lote`**

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

#### Passos

1. Montar lote contendo múltiplos eventos de telemetria (respeitando teto máximo de 500 eventos).
2. Submeter `POST /api/telemetria/lote`.
3. Inspecionar a resposta e confirmar persistência em bloco atômico no banco de dados.

#### Resultado Esperado

- HTTP **201 Created**
- `message: "Lote de telemetria registrado com sucesso"`
- `total: 2` (ou quantidade exata de eventos submetidos)
- `persistido: true`
- Rejeição com HTTP **400 Bad Request** caso o lote exceda o limite de 500 registros

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S10 — Supressão Mandatória de Telemetria em Modo Livre (RN01)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN01 — Isolamento do Modo Livre sem Persistência Clínica; RF11; RF12 |
| **Tipo** | Positivo / Regra Clínica Inviolável |
| **Precondição** | Sessão ativa criada em `modo_sessao: "modo_livre"` (`paciente_id: null`) |

**Entrada — `POST /api/telemetria` ou `POST /api/telemetria/lote`**

```json
{
  "sessao_id": "{uuid-sessao-modo-livre}",
  "eventos": [
    {
      "tipo_evento": "interacao_livre",
      "dados": { "id_metrica": "toques", "valor": 5 }
    }
  ]
}
```

#### Passos

1. Iniciar sessão recreativa configurada em Modo Livre.
2. Conectar o tablet e disparar eventos de telemetria.
3. Observar a resposta HTTP da API e consultar diretamente a tabela `telemetria_evento`.

#### Resultado Esperado

- HTTP **200 OK**
- `message: "Lote processado em memória (Modo Livre não persiste telemetria - RN01)"`
- `persistido: false`
- Nenhum registro gravado na tabela `telemetria_evento` nem no prontuário do paciente (**RN01**)
- Nenhuma linha inserida na tabela `relatorio_sessao` durante ou após o encerramento da partida livre (**RN01**)

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S11 — Canal de Comandos do Terapeuta para o Jogo Remoto (RF13, RF21)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF13 — Controle Clínico; RF21 — Autoria Obrigatória; RNF04 |
| **Tipo** | Positivo |
| **Precondição** | Terapeuta (`role: "terapeuta"`) e tablet (`role: "dispositivo"`) na mesma sala WebSocket `session_{token}` |

**Entrada — Emissão de `sessao:comando` no WebSocket pelo terapeuta**

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

#### Passos

1. Estabelecer canal WebSocket com o terapeuta e o tablet do jogo conectados na sala.
2. Terapeuta clica em botão de comando no Cockpit (ex.: pausar jogo, retomar, ou ajustar DDA).
3. Analisar confirmação (Ack) entregue ao terapeuta e recebimento do comando no jogo.
4. Testar tentativa de envio de comando pelo socket do tablet do paciente.

#### Resultado Esperado

- Ack imediato entregue ao terapeuta: `{ sucesso: true, comando: "ajustar_dificuldade_dda", timestamp: "..." }`.
- Tablet do jogo recebe instantaneamente o evento `sessao:comando` com os parâmetros.
- Se o dispositivo do paciente tentar emitir comando: rejeitado com código `PERMISSAO_NEGADA` (**RF21**).
- Se o tablet estiver desconectado: ack retorna erro `DISPOSITIVO_OFFLINE`.

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S12 — Rate Limiting e Prevenção de Flood no WebSocket (RNF03)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RNF03 — Segurança e Integridade; RNF04 — Tempo Real |
| **Tipo** | Negativo / Segurança e Estabilidade de Infraestrutura |
| **Precondição** | Socket conectado emitindo telemetria contínua |

**Entrada — Emissão de mais de 20 eventos `sessao:telemetria` em 1 segundo (janela deslizante)**

#### Passos

1. Conectar simulador de carga no namespace `/sessao`.
2. Disparar rajada de 35 eventos no intervalo de 600 ms.
3. Monitorar os eventos interceptados pelo middleware `socket.limiter.ts`.

#### Resultado Esperado

- Os primeiros 20 eventos são aceitos e roteados sem bloqueio.
- A partir do 21º evento dentro da janela de 1.000 ms, o gateway emite evento `erro_rate_limit`:
  ```json
  {
    "sucesso": false,
    "error": "Taxa máxima de eventos excedida. Limite: 20 eventos por segundo.",
    "codigo": "RATE_LIMIT_EXCEDIDO",
    "limite_por_segundo": 20
  }
  ```
- O excesso é descartado, preservando a estabilidade do servidor e do banco de dados.

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S13 — Janela de Tolerância de 60s em Queda e Interrupção Assistida (RNF04)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RNF04 — Resiliência e Tolerância a Falhas; RF13 |
| **Tipo** | Misto (Resiliência e Timeout) |
| **Precondição** | Dispositivo pareado em sessão ativa (`em_andamento`) |

#### Passos

1. Forçar corte de conectividade no tablet do jogo durante a partida ativa.
2. Avaliar recebimento do evento `sessao:alerta_conexao` no Cockpit do terapeuta com timer de 60s.
3. **Fluxo A (Reconexão dentro do prazo):** Reestabelecer rede antes dos 60 segundos (ex.: aos 25s).
4. **Fluxo B (Excedeu tolerância):** Repetir teste mantendo rede inativa por mais de 60 segundos.

#### Resultado Esperado

- No momento do corte: status transiciona para `desconectado_transitorio`, cronômetro regressivo ativado no Cockpit.
- **Fluxo A:** Evento `dispositivo_reconectado` disparado com `tempo_offline_ms`, retornando a `em_andamento`.
- **Fluxo B:** Ao expirar 60s, o servidor emite evento `sessao:interrompida_por_queda` (`status_sessao: "interrompida_por_queda"`), permitindo encerramento assistido pelo terapeuta.

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S14 — Encerramento Formal da Sessão, Relatório IA e Trilha de Auditoria (RF13, RF17, RF21, RN04, RN05, RNF06)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF13 — Encerramento; RF17 — Relatório IA; RF21; RN04; RN05; RNF06 |
| **Tipo** | Positivo |
| **Precondição** | Sessão clínica ativa (`em_andamento`) com telemetria coletada; terapeuta logado |

**Entrada — `PATCH /api/sessao/{id}/finalizar`**

```json
{
  "anotacoes_clinicas": "Paciente apresentou excelente foco atencional e autorregulação durante todo o ciclo terapêutico."
}
```

#### Passos

1. No Cockpit, terapeuta aciona o botão "Finalizar Sessão" e preenche o modal com anotações clínicas.
2. Confirmar a requisição de finalização.
3. Analisar retorno da API, persistência do relatório e evento WebSocket.
4. Tentar submeter novamente a finalização para a mesma sessão.
5. Consultar a trilha de auditoria via `GET /api/auditoria/sessao/{id}`.

#### Resultado Esperado

- HTTP **200 OK**
- `data.status_sessao: "finalizada"` e `data.data_hora_fim` carimbado
- Objeto `data.relatorio` gerado com análises do motor de IA (`analises_ia[]` e `duracao_total_segundos`)
- Registro criado na tabela `relatorio_sessao` (3FN — PK compartilhada `sessao_id`) vinculado ao prontuário médico (em estrito contraste com Modo Livre RN01, onde nenhuma linha é persistida nesta tabela)
- Notificação `sessao_finalizada` emitida na sala WebSocket para desconexão ordenada do tablet
- Evento imutável gravado na trilha de auditoria clínica (`acao: "sessao_finalizada"`) com IP e User-Agent
- Segunda tentativa de finalização sumariamente rejeitada com HTTP **400 Bad Request** (_"A sessão já se encontra finalizada."_)

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

## Módulo 4 — Resultados da Sessão, Relatórios Clínicos e Anotações (Sprint 10)

### CT-S15 — Consulta Consolidada dos Resultados de Sessão Clínica (RF14, RF17, RN04)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF14 — Tela de Resultados; RF17 — Relatório Analítico IA; RN04 |
| **Tipo** | Positivo |
| **Precondição** | Sessão clínica (`sessao_clinica`) finalizada com telemetria e relatório gerado; terapeuta vinculado logado |

**Entrada — `GET /api/sessao/{id}/resultado`**

```http
Authorization: Bearer {token_terapeuta_vinculado}
```

#### Passos

1. Obter o UUID de uma sessão clínica formalmente finalizada.
2. Executar a requisição `GET /api/sessao/{id}/resultado`.
3. Analisar os metadados consolidados, objeto de paciente, jogo e bloco analítico de IA.

#### Resultado Esperado

- HTTP **200 OK**
- `data.sessao.status_sessao: "finalizada"`
- `data.paciente` presente com dados sociodemográficos
- `data.relatorio` presente, contendo `sessao_id`, parecer em `conteudo` e `dados_ia_json` conforme Contrato 4 (`taxa_conclusao`, `analises_ia[]`, `metricas_agregadas[]`)
- `data.anotacoes[]` listando anotações clínicas registradas

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S16 — Supressão Mandatória de Relatório Clínico e Prontuário em Modo Livre (RN01, RF11, RF14)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN01 — Isolamento do Modo Livre; RF11; RF14 — Tela de Resultados |
| **Tipo** | Positivo / Regra Clínica Inviolável |
| **Precondição** | Sessão em Modo Livre (`modo_sessao: "modo_livre"`) finalizada com `PATCH /api/sessao/{id}/finalizar` |

**Entrada — `GET /api/sessao/{id}/resultado` e Inspeção Direta no Banco**

```http
Authorization: Bearer {token_terapeuta}
```

#### Passos

1. Iniciar e finalizar uma partida em Modo Livre (`paciente_id: null`).
2. Executar `GET /api/sessao/{id}/resultado`.
3. Executar query SQL no banco de dados: `SELECT COUNT(*) FROM public.relatorio_sessao WHERE sessao_id = '{id}';`.

#### Resultado Esperado

- HTTP **200 OK**
- `data.sessao.modo_sessao: "modo_livre"`
- `data.paciente: null` e `data.sessao.paciente_id: null`
- Campo `data.relatorio: null` (ou omitido)
- Query no banco retorna contagem **0**: **ausência absoluta de persistência na tabela `relatorio_sessao`** (**RN01**)
- Nenhuma linha associada a prontuário médico

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S17 — Bloqueio de Consulta de Resultados por Falta de Vínculo Clínico Institucional (RN04)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN04 — Visibilidade por Vínculo Institucional; RF14 |
| **Tipo** | Negativo / Segurança Multitenant |
| **Precondição** | Sessão clínica finalizada pertencente a paciente de outra clínica ou terapeuta sem vínculo |

**Entrada — `GET /api/sessao/{id}/resultado`**

```http
Authorization: Bearer {token_terapeuta_sem_vinculo}
```

#### Passos

1. Autenticar com credenciais de terapeuta sem vínculo ativo em `terapeuta_paciente` com o paciente da sessão.
2. Executar a requisição `GET /api/sessao/{id}/resultado`.

#### Resultado Esperado

- HTTP **403 Forbidden**
- `error: "Acesso negado: terapeuta não possui vínculo ativo com o paciente desta sessão (RN04)"`
- Dados de prontuário e análises clínicas protegidos

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S18 — Rejeição de Consulta de Resultados para Sessão em Andamento (Ciclo Incompleto)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF12 — FSM da Sessão; RF14 — Tela de Resultados |
| **Tipo** | Negativo / Integridade de FSM |
| **Precondição** | Sessão em status `em_andamento` ou `aguardando_pareamento` |

**Entrada — `GET /api/sessao/{id}/resultado`**

#### Passos

1. Obter o UUID de uma sessão com status `em_andamento`.
2. Executar requisição para consultar resultados consolidados.

#### Resultado Esperado

- HTTP **400 Bad Request**
- `error: "Resultados consolidados disponíveis apenas para sessões em status finalizada"`

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S19 — Validação Estrutural da Modelagem 3FN da Tabela `relatorio_sessao`

| Campo | Valor |
| :--- | :--- |
| **Requisito** | Conformidade 3FN; ANOTACAO.MD Seção 2; RN01; RN05 |
| **Tipo** | Validação Estrutural de Banco de Dados |
| **Precondição** | Migração `008_normalizacao_relatorio_sessao.sql` aplicada |

**Entrada — Inspeção de Schema PostgreSQL (`information_schema.columns`)**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'relatorio_sessao';
```

#### Passos

1. Consultar a estrutura de colunas e constraints da tabela `public.relatorio_sessao`.
2. Verificar chave primária (`sessao_id`) e ausência de colunas redundantes (`paciente_id`, `terapeuta_id`).
3. Verificar a restrição de FK `REFERENCES public.sessao(id) ON DELETE RESTRICT`.

#### Resultado Esperado

- Chave primária é exclusivamente `sessao_id` (PK = FK compartilhada, relação 1:1)
- Coluna artificial `id UUID` eliminada do schema
- Colunas `paciente_id` e `terapeuta_id` **ausentes** da tabela `relatorio_sessao` (resolvidas via JOIN com `public.sessao`)
- Campos presentes: `sessao_id`, `conteudo`, `dados_ia_json`, `soft_delete`, `created_at`, `updated_at`

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S20 — Registro e Atualização de Parecer Técnico e Anotações Pós-Sessão (RF16, RF21)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF16 — Anotações Clínicas; RF21 — Autoria Obrigatória; RN04 |
| **Tipo** | Positivo |
| **Precondição** | Sessão clínica finalizada; terapeuta com vínculo autenticado |

**Entrada — `POST /api/anotacao`**

```json
{
  "sessao_id": "{uuid-sessao-finalizada}",
  "conteudo": "Observada melhora expressiva na tolerância a pistas sonoras complexas pós-intervenção."
}
```

#### Passos

1. Submeter anotação clínica associada à sessão.
2. Consultar o endpoint de resultados `GET /api/sessao/{id}/resultado`.
3. Validar se a anotação aparece indexada com autoria do terapeuta logado.

#### Resultado Esperado

- HTTP **201 Created**
- `data.id` gerado
- `data.terapeuta_id` associado ao `auth.uid()` do terapeuta logado (**RF21**)
- Anotação listada em `data.anotacoes[]` na rota de resultado consolidado

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S21 — Imutabilidade de Prontuário e Bloqueio de Hard Delete em Relatório Clínico (RN05)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN05 — Inalterabilidade e Imutabilidade do Histórico Clínico |
| **Tipo** | Negativo / Validação de Imutabilidade |
| **Precondição** | Sessão clínica com relatório persistido |

**Entrada — Tentativa de `DELETE FROM public.relatorio_sessao WHERE sessao_id = '{id}';`**

#### Passos

1. Localizar o `sessao_id` de um relatório clínico existente.
2. Tentar executar exclusão física (`DELETE`) diretamente via SQL ou endpoint administrativo.

#### Resultado Esperado

- Exclusão física sumariamente rejeitada por trigger de integridade clínica ou substituída por flag `soft_delete: true`
- Preservação intacta dos dados históricos e análises da IA no prontuário médico (**RN05**)

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S22 — Exportação de Relatório Clínico Estruturado (RF20)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF20 — Impressão e Exportação de Relatórios Clínicos; RN04 |
| **Tipo** | Positivo |
| **Precondição** | Sessão clínica finalizada com relatório IA e anotações |

**Entrada — `GET /api/sessao/{id}/exportar`**

```http
Authorization: Bearer {token_terapeuta_vinculado}
```

#### Passos

1. Solicitar a exportação do relatório consolidado da sessão.
2. Analisar o cabeçalho de resposta e o payload recebido.

#### Resultado Esperado

- HTTP **200 OK**
- Retorno de payload estruturado contendo dados completos do paciente, profissional responsável, métricas agregadas, análises analíticas de IA e parecer consolidado pronto para impressão/PDF

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

## Matriz de Rastreabilidade

| Requisito | Descrição | Casos de Teste |
| :--- | :--- | :--- |
| **RF06** | Cadastro e Gestão de Pacientes | CT-P01, CT-P02, CT-P03, CT-P04, CT-P14, CT-P15 |
| **RF09** | Biblioteca de Jogos Terapêuticos | CT-J01, CT-J02, CT-J03, CT-J04, CT-J05, CT-J06, CT-J12 |
| **RF10** | Pareamento Remoto via Session Token e Handshake | CT-S01, CT-S02, CT-S04, CT-S05 |
| **RF11** | Modo Livre (sem prontuário clínico) | CT-J01, CT-S10, CT-S16 |
| **RF12** | Gestão de Sessão Terapêutica Ativa | CT-S07, CT-S08, CT-S09, CT-S10, CT-S18 |
| **RF13** | Ciclo de Sessão, Comandos e Encerramento Formal | CT-S07, CT-S11, CT-S13, CT-S14 |
| **RF14** | Tela de Resultados e Consolidação Pós-Sessão | CT-S15, CT-S16, CT-S17, CT-S18 |
| **RF16** | Anotações Clínicas Pós-Sessão | CT-S20 |
| **RF17** | Contexto DDA e Relatório de Síntese IA | CT-S07, CT-S14, CT-S15 |
| **RF18** | Gestão de Vínculos Multiterapeuta | CT-P11, CT-P12, CT-P13 |
| **RF19** | Filtros, Busca Avançada e Paginação | CT-P05, CT-J02, CT-J03, CT-J04 |
| **RF20** | Exportação e Impressão de Relatórios Clínicos | CT-S22 |
| **RF21** | Autoria Obrigatória e Controle do Terapeuta | CT-P11, CT-S11, CT-S14, CT-S20 |

---

## Módulo 4 — Histórico Longitudinal e Gráficos Dinâmicos (Sprint 11)

> Cobre a rota `GET /api/paciente/:id/historico` e os componentes visuais de histórico evolutivo do InTEA.

---

### CT-S23 — Consulta de Engajamento Geral sem `jogoId` (200 OK)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF15 — Prontúrio Longitudinal; RF19 — Filtros |
| **Tipo** | Positivo |
| **Precondição** | Terapeuta com JWT válido e vínculo ativo com o paciente; ao menos 8 sessões finalizadas e 2 interrompidas registradas |

**Entrada — `GET /api/paciente/{uuid}/historico`**

```http
Authorization: Bearer {token}
```

#### Passos

1. Autenticar terapeuta com vínculo ativo ao paciente.
2. Executar `GET /api/paciente/{id}/historico` **sem** query params.
3. Verificar o bloco `engajamento_geral` e o campo `jogos_jogados`.

#### Resultado Esperado

- HTTP **200 OK**
- `data.engajamento_geral.total_sessoes_iniciadas ≥ 1`
- `data.engajamento_geral.taxa_conclusao_percentual` calculado como `(finalizadas / iniciadas) * 100` (ex: 8/10 = 80.0)
- `data.jogos_jogados[]` listando os jogos já experimentados pelo paciente com `total_partidas` e `data_ultima_partida`
- Sessões em Modo Livre (`paciente_id = NULL`) **não aparecem** no cômputo (**RN01**)

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S24 — Troca do Seletor de Jogo Retorna Série Temporal Específica (200 OK)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF15 — Prontúrio Longitudinal; RNF04 — Visualização por Tipo de Métrica |
| **Tipo** | Positivo |
| **Precondição** | Paciente com pelo menos 2 sessões finalizadas do jogo `{jogoId}`; manifesto do jogo com todas as métricas tipadas |

**Entrada — `GET /api/paciente/{uuid}/historico?jogoId={jogoId}`**

```http
Authorization: Bearer {token}
```

#### Passos

1. Obter o `{jogoId}` de um jogo que o paciente já jogou (via CT-S23 ou banco).
2. Executar `GET /api/paciente/{id}/historico?jogoId={jogoId}`.
3. Verificar `historico_por_jogo.series_temporais` e `metricas_declaradas`.

#### Resultado Esperado

- HTTP **200 OK**
- `data.historico_por_jogo.jogo_id` igual ao `{jogoId}` informado
- `data.historico_por_jogo.series_temporais[]` com ao menos 2 entradas, cada uma contendo `sessao_id`, `data_hora_fim` e `valores_metricas` **somente daquele jogo**
- `data.historico_por_jogo.metricas_declaradas[]` refletindo exatamente as métricas do manifesto do jogo
- Sessões de outros jogos **não aparecem** na série

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S25 — Filtragem por Intervalo de Datas e Paginação (200 OK)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF19 — Filtros Avançados e Paginação |
| **Tipo** | Positivo |
| **Precondição** | Paciente com sessões em períodos distintos (antes e depois de `2026-10-01`) |

**Entrada — `GET /api/paciente/{uuid}/historico?dataInicio=2026-10-01T00:00:00.000Z&dataFim=2026-10-22T23:59:59.999Z&page=1&limit=5`**

```http
Authorization: Bearer {token}
```

#### Passos

1. Executar com intervalo de datas restrito a outubro/2026 e `limit=5`.
2. Verificar que `series_temporais[]` contém apenas sessões dentro do intervalo informado.
3. Verificar que `meta.limit = 5` e `meta.page = 1`.
4. Executar com intervalo invertido (`dataInicio > dataFim`) e verificar rejeição.

#### Resultado Esperado

- HTTP **200 OK** (intervalo válido): `series_temporais[]` com sessões exclusivamente entre `2026-10-01` e `2026-10-22`; `meta.limit = 5`
- HTTP **400 Bad Request** (intervalo invertido): mensagem explicando incoerência temporal

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S26 — Rejeição de Métrica sem Tipagem no Manifesto (422 — RN02)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN02 — Tipagem Estrita sem Fallback; RNF02 |
| **Tipo** | Negativo — regra clínica crítica |
| **Precondição** | Jogo com ao menos uma métrica no `manifesto_json` **sem** campo `tipo_metrica` definido; paciente com sessões desse jogo |

**Entrada — `GET /api/paciente/{uuid}/historico?jogoId={jogoIdManifestoIncompleto}`**

```http
Authorization: Bearer {token}
```

#### Passos

1. Identificar (ou cadastrar em ambiente de teste) um jogo cujo manifesto possua métrica sem `tipo_metrica`.
2. Executar `GET /api/paciente/{id}/historico?jogoId={jogoId}` para esse jogo.

#### Resultado Esperado

- HTTP **422 Unprocessable Entity**
- Campo `error` identificando a métrica problemática pelo nome
- Campo `regraViolada: "RN02 - Fallback de Métrica Proibido / Tipagem Estrita"`
- **Nenhum fallback automático** para gráfico de barras ou qualquer outro tipo padrão

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S27 — Bloqueio de Acesso sem Vínculo Institucional Ativo (403 — RN04)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN04 — Isolamento Institucional; RF21 |
| **Tipo** | Negativo — segurança clínica |
| **Precondição** | Terapeuta autenticado **sem** vínculo ativo com o paciente em `terapeuta_paciente` **ou** pertencente a outra clínica |

**Entrada — `GET /api/paciente/{uuid-sem-vinculo}/historico`**

```http
Authorization: Bearer {token-terapeuta-sem-vinculo}
```

#### Passos

1. Autenticar terapeuta que **não** possui vínculo com o paciente alvo.
2. Executar `GET /api/paciente/{id}/historico`.

#### Resultado Esperado

- HTTP **403 Forbidden**
- `error`: _"Acesso negado: terapeuta não possui vínculo ativo com este paciente ou pertence a outra clínica."_
- `regraViolada`: _"RN04 - Visibilidade por Vínculo Institucional"_
- Nenhum dado de sessão ou métrica do paciente exposto na resposta

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S28 — Supressão Comprovada de Sessões em Modo Livre (RN01)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN01 — Isolamento de Modo Livre; RF15 |
| **Tipo** | Negativo — integridade de prontúrio |
| **Precondição** | Banco contém sessões de Modo Livre (`paciente_id = NULL`) do mesmo `jogo_id` que sessões clínicas do paciente |

**Entrada — `GET /api/paciente/{uuid}/historico`**

```http
Authorization: Bearer {token}
```

#### Passos

1. Verificar no banco que existem sessões com `paciente_id = NULL` para o mesmo jogo do paciente.
2. Executar `GET /api/paciente/{id}/historico` com terapeuta vinculado.
3. Calcular manualmente o total esperado de sessões (excluindo Modo Livre).
4. Comparar `engajamento_geral.total_sessoes_iniciadas` com o total manual.

#### Resultado Esperado

- HTTP **200 OK**
- `total_sessoes_iniciadas` corresponde **apenas** às sessões com `paciente_id = {uuid}` (Modo Livre excluído)
- `taxa_conclusao_percentual` calculada sem contaminação de partidas anônimas
- Nenhuma entrada de `series_temporais` possui `paciente_id = NULL`

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

## Módulo 4 — Anotações Clínicas e Contexto Pré-Sessão DDA (Sprint 12)

### CT-S29 — Registro de Anotação Clínica com Autoria Indelével do Terapeuta (201 Created — RF16 / RF21)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF16 — Bloco de Anotações Clínicas; RF21 — Autoria Obrigatória; RN04 — Vínculo Institucional |
| **Tipo** | Positivo — caminho feliz clínico |
| **Precondição** | Terapeuta autenticado (`req.user.id = 44444444-4444-4444-4444-444444444444`) com vínculo ativo ao paciente (`paciente_id = 22222222-2222-2222-2222-222222222222`) na tabela `terapeuta_paciente` |

**Entrada — `POST /api/anotacao`**

```http
Authorization: Bearer {token-terapeuta-marcos}
Content-Type: application/json
```

```json
{
  "paciente_id": "22222222-2222-2222-2222-222222222222",
  "sessao_id": "11111111-1111-1111-1111-111111111111",
  "conteudo": "Paciente demonstrou excelente autorregulação nas fases com estímulos cromáticos complexos e redução de latência motora."
}
```

#### Passos

1. Autenticar o terapeuta com JWT válido na rota `/api/terapeuta/login`.
2. Executar a requisição `POST /api/anotacao` enviando o payload JSON acima.
3. Consultar a anotação criada executando `GET /api/anotacao/{id_gerado}`.
4. Inspecionar o bloco `autor` no JSON de resposta.

#### Resultado Esperado

- HTTP **201 Created** na criação
- HTTP **200 OK** na consulta por ID
- Resposta no Envelope Pattern Categorizado contendo `data.anotacao`
- Campo `terapeuta_id` preenchido compulsoriamente com o UUID do terapeuta do token JWT (`44444444-4444-4444-4444-444444444444`)
- Objeto sanitizado `autor` presente com:
  - `autor.id`: `"44444444-4444-4444-4444-444444444444"`
  - `autor.nome`: `"Dr. Marcos Terapeuta"`
  - `autor.registro_profissional`: `"12345/PI"`
  - `autor.crefito`: `"CREFITO-12345"`
  - `autor.especialidade`: `"Terapia Ocupacional"`
- A interface não exibe UUIDs crus do profissional, exibindo nome e registro profissional completo (**RF21**)

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S30 — Bloqueio de Edição e Exclusão por Terapeuta não Autor (403 Forbidden — RF21 / RN04)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF21 — Autoria e Integridade de Registros; RN04 — Isolamento Clínico Institucional |
| **Tipo** | Negativo — segurança e anti-spoofing |
| **Precondição** | Anotação clínica existente criada pelo terapeuta A (`44444444-4444-4444-4444-444444444444`). Terapeuta B (`55555555-5555-5555-5555-555555555555`) autenticado com vínculo no mesmo paciente |

**Entrada 1 — `PATCH /api/anotacao/{anotacao_id_terapeuta_A}`**

```http
Authorization: Bearer {token-terapeuta-B}
Content-Type: application/json
```

```json
{
  "conteudo": "Tentativa indevida de alterar a observação clínica de outro profissional."
}
```

**Entrada 2 — `DELETE /api/anotacao/{anotacao_id_terapeuta_A}`**

```http
Authorization: Bearer {token-terapeuta-B}
```

#### Passos

1. Obter o UUID de uma anotação cujo autor é o terapeuta A.
2. Autenticar como terapeuta B (colega de clínica com vínculo ao paciente).
3. Tentar executar `PATCH /api/anotacao/{id}` alterando o conteúdo.
4. Tentar executar `DELETE /api/anotacao/{id}` para inativar a nota de outrem.
5. Inspecionar o banco relacional para confirmar a integridade do texto original.

#### Resultado Esperado

- HTTP **403 Forbidden** em ambas as requisições
- Mensagem de erro explícita indicando que apenas o autor original possui autorização para editar ou inativar o registro
- O conteúdo da anotação e o valor de `soft_delete` permanecem inalterados no banco de dados
- Nenhuma mutação de dados é consumada

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S31 — Filtragem Longitudinal, Soft Delete e Reativação de Anotação (200 OK — RF19 / RN05)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF19 — Filtros Avançados; RN05 — Inalterabilidade e Ciclo de Vida por Soft Delete |
| **Tipo** | Positivo — governança e recuperação de registros |
| **Precondição** | Paciente com histórico de 3 anotações clínicas em datas distintas, criadas pelo terapeuta autor autenticado |

**Entrada 1 — `GET /api/anotacao/paciente/{pacienteId}?terapeutaId={autorId}&busca=estresse&page=1&limit=10`**

```http
Authorization: Bearer {token-terapeuta-autor}
```

**Entrada 2 — `DELETE /api/anotacao/{anotacaoId}`**

```http
Authorization: Bearer {token-terapeuta-autor}
```

**Entrada 3 — `PATCH /api/anotacao/{anotacaoId}/reativar`**

```http
Authorization: Bearer {token-terapeuta-autor}
```

#### Passos

1. Executar a consulta com filtros combinados (`terapeutaId`, termo textual `busca="estresse"`, paginação `page=1`, `limit=10`).
2. Verificar que a API retorna apenas as notas do autor que contêm a palavra "estresse" no Envelope Categorizado (`total`, `pagina`, `limite`).
3. Executar o soft delete via `DELETE /api/anotacao/{id}`.
4. Executar `GET /api/anotacao/paciente/{pacienteId}` sem o parâmetro `incluirInativos` e comprovar a ocultação da nota.
5. Executar `PATCH /api/anotacao/{id}/reativar`.
6. Confirmar que a anotação retorna ao estado ativo (`soft_delete = false`).

#### Resultado Esperado

- Entrada 1: HTTP **200 OK**, lista contendo estritamente as notas correspondentes aos filtros combinados (**RF19**)
- Entrada 2: HTTP **200 OK**, com `data.anotacao.soft_delete: true`
- Entrada 3: HTTP **200 OK**, com `data.anotacao.soft_delete: false` e objeto `autor` preservado
- O registro nunca é deletado fisicamente do banco de dados, cumprindo integralmente a **RN05**

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S32 — Configuração Personalizada do Contexto DDA Pré-Sessão (201 Created — RF17 / RN03 / Contrato 2)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF17 — Injeção de Contexto Clínico DDA; RN03 — Entrega Prévia à Telemetria; Contrato 2 |
| **Tipo** | Positivo — calibração pré-sessão customizada |
| **Precondição** | Terapeuta vinculado ao paciente; jogo cadastrado com manifesto homologado; código PIN legível gerado previamente |

**Entrada — `POST /api/sessao/iniciar`**

```http
Authorization: Bearer {token-terapeuta}
Content-Type: application/json
```

```json
{
  "terapeuta_id": "44444444-4444-4444-4444-444444444444",
  "jogo_id": "8b5a034f-9e77-4ad3-9b6e-1d54e5cf4291",
  "paciente_id": "22222222-2222-2222-2222-222222222222",
  "modo_sessao": "sessao_clinica",
  "codigo_pareamento": "4M5S-8U7B",
  "contexto_dda_json": {
    "nivel_estresse_inicial": 4,
    "gatilhos_sensoriais_evitar": [
      "Sons Agudos Repentinos",
      "Transições de Luz Fluorescente"
    ],
    "objetivo_clinico": "Foco atencional com modulação para evitar sobrecarga sensorial"
  }
}
```

#### Passos

1. Iniciar a sessão enviando o payload customizado acima com escala de estresse `4`.
2. Obter o `session_token` e simular a conexão do jogo externo via `POST /api/sessao/parear` ou WebSocket Socket.IO (`entrar_sessao`).
3. Verificar a carga de contexto DDA entregue no handshake.
4. Tentar enviar o primeiro evento `sessao:telemetria` e validar a ordem temporal.

#### Resultado Esperado

- HTTP **201 Created** em `/api/sessao/iniciar`
- A escala de estresse numérica `4` é mapeada deterministicamente para `"alto"` no pacote do Contrato 2
- O pacote entregue no handshake contém:
  - `token_sessao`: `"4M5S-8U7B"`
  - `id_terapeuta`: `"44444444-4444-4444-4444-444444444444"`
  - `id_paciente`: `"22222222-2222-2222-2222-222222222222"`
  - `contexto_paciente.nivel_estresse_inicial`: `"alto"`
  - `contexto_paciente.gatilhos_sensoriais_evitar`: 2 gatilhos informados
  - `contexto_paciente.objetivo_clinico`: texto informado
- O pacote de contexto DDA é entregue ao dispositivo **antes** da aceitação do primeiro pacote de telemetria (**RN03**)

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S33 — Início de Sessão com Fallback Clínico Parametrizado (201 Created — RF17 / Figura 5)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF17 — Contexto DDA; Figura 5 — Diagrama de Atividades com Fallback Parametrizado |
| **Tipo** | Positivo — fallback clínico automático |
| **Precondição** | Paciente com gatilhos cadastrados na anamnese (`dados_clinicos` contendo `"Sons Altos"` e `"Luz Piscante"`); terapeuta vinculado |

**Entrada — `POST /api/sessao/iniciar`**

```http
Authorization: Bearer {token-terapeuta}
Content-Type: application/json
```

```json
{
  "terapeuta_id": "44444444-4444-4444-4444-444444444444",
  "jogo_id": "8b5a034f-9e77-4ad3-9b6e-1d54e5cf4291",
  "paciente_id": "22222222-2222-2222-2222-222222222222",
  "modo_sessao": "sessao_clinica",
  "codigo_pareamento": "7K9P-2W4X",
  "contexto_dda_json": {
    "usar_fallback_padrao": true
  }
}
```

#### Passos

1. Cadastrar previamente gatilhos sensoriais no prontuário do paciente (`dados_clinicos` e `paciente_gatilho`).
2. Executar `POST /api/sessao/iniciar` acionando `"usar_fallback_padrao": true` (ou omitindo parâmetros DDA).
3. Consultar a sessão criada no banco de dados e inspecionar o campo `sessao.contexto_dda_json`.

#### Resultado Esperado

- HTTP **201 Created**
- Aplicação automática do fluxo de fallback da **Figura 5**:
  - `nivel_estresse_inicial`: normalizado como `"baixo"` (escala padrão 1)
  - `gatilhos_sensoriais_evitar`: herda automaticamente os gatilhos cadastrados no prontuário do paciente (`"Sons Altos"`, `"Luz Piscante"`)
  - `objetivo_clinico`: assume o objetivo clínico padrão do manifesto do jogo selecionado
- O motor de IA é calibrado com segurança sem impor sobrecarga de preenchimento manual ao terapeuta

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S34 — Rejeição de Injeção de Contexto Clínico ou Anotação em Modo Livre (400 Bad Request — RN01)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN01 — Isolamento Inviolável de Modo Livre; RF11 |
| **Tipo** | Negativo — preservação da barreira recreativa vs. clínica |
| **Precondição** | Sessão criada ou configurada como `modo_sessao: "modo_livre"` (`paciente_id = NULL`) |

**Entrada 1 — `POST /api/sessao/iniciar` (Tentativa de injetar paciente ou contexto DDA em Modo Livre)**

```http
Authorization: Bearer {token-terapeuta}
Content-Type: application/json
```

```json
{
  "terapeuta_id": "44444444-4444-4444-4444-444444444444",
  "jogo_id": "8b5a034f-9e77-4ad3-9b6e-1d54e5cf4291",
  "paciente_id": "22222222-2222-2222-2222-222222222222",
  "modo_sessao": "modo_livre",
  "codigo_pareamento": "3X2Y-9Z8W",
  "contexto_dda_json": {
    "nivel_estresse_inicial": 2,
    "gatilhos_sensoriais_evitar": ["Sons Altos"],
    "objetivo_clinico": "Foco atencional"
  }
}
```

**Entrada 2 — `POST /api/anotacao` (Tentativa de registrar nota clínica em sessão de Modo Livre)**

```http
Authorization: Bearer {token-terapeuta}
Content-Type: application/json
```

```json
{
  "sessao_id": "99999999-9999-9999-9999-999999999999",
  "conteudo": "Tentativa de criar anotação clínica em partida de Modo Livre."
}
```

#### Passos

1. Executar a Entrada 1 tentando associar `paciente_id` ou contexto clínico a uma partida declarada como `modo_livre`.
2. Criar uma sessão válida em modo livre (`paciente_id = null`, sem contexto DDA).
3. Executar a Entrada 2 tentando registrar uma anotação clínica associada ao UUID dessa sessão livre.

#### Resultado Esperado

- Entrada 1: HTTP **400 Bad Request** com mensagem clara de violação da **RN01** (_"Sessões em modo livre não admitem paciente_id nem calibração clínica DDA"_).
- Entrada 2: HTTP **400 Bad Request** com mensagem explícita de que sessões em modo livre não persistem anotações em prontuário.
- Nenhuma entrada de histórico ou contexto clínico é gravada para a partida recreativa, cumprindo estritamente a invariante **RN01**.

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

> **Total atualizado: 61 casos de teste** — 15 Pacientes (CT-P01→P15) · 12 Jogos (CT-J01→J12) · 22 Sessão/Pareamento (CT-S01→S22) · 6 Histórico Longitudinal Sprint 11 (CT-S23→S28) · 6 Anotações e Contexto DDA Sprint 12 (CT-S29→S34)

---

## Resumo de Cobertura por Código HTTP e Eventos WebSocket

| Protocolo / Código | Semântica | Casos de Teste |
| :---: | :--- | :--- |
| **HTTP 200** | Sucesso em consulta, pareamento, validação aprovada, resultados ou modo livre | CT-P04, CT-P05, CT-P06, CT-P09, CT-P10, CT-P14, CT-J01, CT-J02, CT-J03, CT-J04, CT-J05, CT-J07, CT-J09, CT-J12, CT-S01, CT-S02, CT-S06, CT-S10, CT-S14, CT-S15, CT-S16, CT-S22, CT-S23, CT-S24, CT-S25, CT-S28, CT-S29, CT-S31, CT-S33 |
| **HTTP 201** | Recurso criado (paciente, vínculo, início de sessão, telemetria, anotação clínica) | CT-P01, CT-P11, CT-S07, CT-S08, CT-S09, CT-S20, CT-S29, CT-S32, CT-S33 |
| **HTTP 400** | Parâmetros inválidos, lote excedido, transição inválida de FSM ou sessão não finalizada | CT-P02, CT-P12, CT-P13, CT-P15, CT-J08, CT-S09, CT-S14, CT-S18, CT-S25, CT-S34 |
| **HTTP 401** | Sem autenticação / Token JWT ausente ou inválido | CT-P08 |
| **HTTP 403** | Acesso negado por falta de vínculo clínico institucional (RN04) ou autor divergente (RF21) | CT-P07, CT-S14, CT-S17, CT-S27, CT-S30 |
| **HTTP 404** | Recurso não encontrado (paciente, jogo ou sessão inexistente) | CT-J06, CT-S04 |
| **HTTP 409** | Conflito de integridade única ou sessão já em andamento | CT-P03, CT-S05 |
| **HTTP 410** | Token PIN expirado (TTL 15 min) ou sessão terminal | CT-S03 |
| **HTTP 422** | Violação de regra clínica de tipagem estrita RN02 | CT-J10, CT-J11, CT-S26 |
| **Banco / SQL** | Validação de restrições DDL 3FN e bloqueio de exclusão física | CT-S19, CT-S21 |
| **WebSocket** | Streaming de telemetria contínua (`sessao:telemetria` < 100ms) | CT-S08, CT-S09, CT-S10 |
| **WebSocket** | Canal bidirecional de comandos clínicos (`sessao:comando`) e Acks | CT-S11 |
| **WebSocket** | Rate limiting e prevenção de flood (`erro_rate_limit`) | CT-S12 |
| **WebSocket** | Presença, queda, reconexão de 60s e interrupção (`sessao:alerta_conexao`) | CT-S01, CT-S06, CT-S13 |
| **WebSocket** | Sinalização de encerramento de sessão (`sessao_finalizada`) | CT-S14 |
| **Histórico / RN01** | Supressão de Modo Livre em prontuário longitudinal | CT-S28 |
| **Anotações / Contexto DDA** | Injeção prévia DDA (RN03), autoria compulsória (RF21) e soft delete (RN05) | CT-S29, CT-S30, CT-S31, CT-S32, CT-S33, CT-S34 |
