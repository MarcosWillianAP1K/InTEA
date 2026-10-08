# Roteiro de Testes Manuais e Crit├®rios de Aceite ÔÇö Sprint 7

> **Tarefa:** 5.6 ÔÇö `Docs: Casos de Teste e Crit├®rios de Aceite Formais`  
> **M├│dulos cobertos:** Gerenciamento de Pacientes ┬À Biblioteca de Jogos Terap├¬uticos  
> **Requisitos rastreados:** RF06, RF09, RF11, RF18, RF19, RF21, RN02, RN04, RN05, RNF02

---

## Conven├º├Áes

| Campo | Descri├º├úo |
| :--- | :--- |
| **CT-ID** | Identificador ├║nico do caso de teste |
| **Requisito** | Requisito ou regra de neg├│cio validada |
| **Tipo** | `Positivo` (fluxo feliz) ou `Negativo` (rejei├º├úo / seguran├ºa) |
| **Precondi├º├úo** | Estado inicial necess├írio antes da execu├º├úo |
| **Entrada** | Endpoint, payload ou a├º├úo do testador |
| #### Passos | Sequ├¬ncia de a├º├Áes a executar |
| #### Resultado Esperado | Comportamento correto esperado do sistema |
| **Status** | `[ ] Passou` ┬À `[ ] Falhou` ┬À `[ ] Pendente` |

> **Ferramenta sugerida:** Postman ou Insomnia. Base URL: `http://localhost:3000/api`

---

## M├│dulo 1 ÔÇö Gerenciamento de Pacientes

### CT-P01 ÔÇö Cadastro de Paciente com Dados Completos

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06 ÔÇö Cadastro e Gest├úo de Pacientes |
| **Tipo** | Positivo |
| **Precondi├º├úo** | API em execu├º├úo; banco acess├¡vel |

**Entrada ÔÇö `POST /api/paciente`**

```json
{
  "nome": "Lucas Gabriel Santos",
  "data_nascimento": "2019-04-10",
  "cpf": "529.982.247-25",
  "telefone": "(11) 97777-6666",
  "cep": "04567-000",
  "cidade": "S├úo Paulo",
  "estado": "SP",
  "responsavel": {
    "nome": "Mariana Santos",
    "telefone": "(11) 98888-5555",
    "parentesco": "M├úe"
  }
}
```

#### Passos

1. Abrir Postman/Insomnia.
2. Configurar `POST /api/paciente` com o body acima.
3. Executar a requisi├º├úo.

#### Resultado Esperado

- HTTP **201 Created**
- `data.id` presente (UUID gerado automaticamente)
- `data.status_ativo: true`
- `data.responsaveis[]` com a m├úe vinculada
- Mensagem: _"Paciente cadastrado com sucesso."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P02 ÔÇö Rejei├º├úo de CPF Inv├ílido

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06 ÔÇö Valida├º├úo de DTO |
| **Tipo** | Negativo |
| **Precondi├º├úo** | API em execu├º├úo |

**Entrada ÔÇö `POST /api/paciente`** com `"cpf": "111.111.111-11"` (todos os d├¡gitos iguais)

#### Passos

1. Configurar `POST /api/paciente`.
2. Inserir CPF matematicamente inv├ílido.
3. Executar a requisi├º├úo.

#### Resultado Esperado

- HTTP **400 Bad Request**
- Campo `error` indicando falha de valida├º├úo
- Campo `erros[]` descrevendo o CPF como inv├ílido

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P03 ÔÇö Conflito por CPF J├í Cadastrado

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06 ÔÇö Unicidade de CPF |
| **Tipo** | Negativo |
| **Precondi├º├úo** | Paciente com CPF `529.982.247-25` j├í cadastrado (executar CT-P01 antes) |

**Entrada ÔÇö `POST /api/paciente`** com o mesmo CPF do CT-P01

#### Passos

1. Executar CT-P01 com sucesso.
2. Repetir o mesmo `POST` sem alterar o CPF.

#### Resultado Esperado

- HTTP **409 Conflict**
- Mensagem: _"J├í existe um paciente cadastrado com este CPF."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P04 ÔÇö Listagem Padr├úo Exclui Pacientes Inativados

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06 ÔÇö Listagem; RN05 ÔÇö Soft Delete |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Ao menos 1 paciente ativo e 1 inativo no banco |

**Entrada ÔÇö `GET /api/paciente`** (sem par├ómetros)

#### Passos

1. Executar `GET /api/paciente`.
2. Verificar os registros retornados.

#### Resultado Esperado

- HTTP **200 OK**
- `data[]` somente com `status_ativo: true`
- Metadados `meta.total`, `page`, `limit` e `totalPages` presentes

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P05 ÔÇö Busca por Nome e Faixa Et├íria com Pagina├º├úo

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF19 ÔÇö Busca e Filtros Avan├ºados |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Pacientes com idades variadas cadastrados |

**Entrada ÔÇö `GET /api/paciente?nome=Lucas&idadeMin=4&idadeMax=10&page=1&limit=5`**

#### Passos

1. Executar a `GET` com os par├ómetros acima.
2. Analisar os registros e metadados retornados.

#### Resultado Esperado

- HTTP **200 OK**
- Apenas pacientes cujo nome contenha _Lucas_ (case-insensitive)
- Idades entre 4 e 10 anos
- No m├íximo 5 registros por resposta

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P06 ÔÇö Consulta de Prontu├írio com V├¡nculo Ativo (RN04)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06; RN04 ÔÇö Visibilidade por V├¡nculo |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Terapeuta com token JWT v├ílido e v├¡nculo ativo em `terapeuta_paciente` |

**Entrada ÔÇö `GET /api/paciente/{uuid}`**

```http
Authorization: Bearer {token}
```

#### Passos

1. Obter token JWT via login.
2. Garantir que o terapeuta possui v├¡nculo com o paciente.
3. Executar `GET /api/paciente/{id}`.

#### Resultado Esperado

- HTTP **200 OK**
- `data` com dados completos, `responsaveis[]` e `terapeutas[]`

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P07 ÔÇö Bloqueio de Acesso sem V├¡nculo Ativo (RN04)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN04 ÔÇö Visibilidade por V├¡nculo e Institui├º├úo |
| **Tipo** | Negativo ÔÇö seguran├ºa cl├¡nica |
| **Precondi├º├úo** | Terapeuta com token JWT v├ílido **sem** v├¡nculo com o paciente consultado |

**Entrada ÔÇö `GET /api/paciente/{uuid-sem-vinculo}`**

```http
Authorization: Bearer {token}
```

#### Passos

1. Autenticar terapeuta que **n├úo** est├í vinculado ao paciente.
2. Executar `GET /api/paciente/{id}`.

#### Resultado Esperado

- HTTP **403 Forbidden**
- Mensagem: _"Acesso negado: o terapeuta n├úo possui v├¡nculo ativo com este paciente."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P08 ÔÇö Bloqueio por JWT Ausente ou Inv├ílido

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RNF02 ÔÇö Seguran├ºa; RN04 |
| **Tipo** | Negativo ÔÇö autentica├º├úo |
| **Precondi├º├úo** | Nenhum header de autentica├º├úo enviado |

**Entrada ÔÇö `GET /api/paciente/{id}`** sem header `Authorization`

#### Passos

1. Executar `GET /api/paciente/{id}` sem token.

#### Resultado Esperado

- HTTP **401 Unauthorized**
- Mensagem: _"Acesso n├úo autorizado. Forne├ºa um token no cabe├ºalho Authorization: Bearer \<token\>."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P09 ÔÇö Soft Delete: Inativa├º├úo sem Exclus├úo F├¡sica (RN05)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN05 ÔÇö Inalterabilidade do Hist├│rico Cl├¡nico |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Paciente ativo com UUID conhecido |

**Entrada ÔÇö `DELETE /api/paciente/{id}`**

#### Passos

1. Executar `DELETE /api/paciente/{id}`.
2. Verificar `status_ativo` na resposta.
3. Executar `GET /api/paciente` e confirmar aus├¬ncia do paciente.
4. Verificar **diretamente no banco** que o registro **n├úo foi deletado fisicamente**.

#### Resultado Esperado

- HTTP **200 OK**
- `data.status_ativo: false`
- Paciente ausente da listagem padr├úo
- Registro f├¡sico preservado no banco

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P10 ÔÇö Reativa├º├úo de Paciente Inativo

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06; RN05 |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Paciente com `status_ativo: false` (executar CT-P09 antes) |

**Entrada ÔÇö `PATCH /api/paciente/{id}/reativar`**

#### Passos

1. Inativar o paciente (CT-P09).
2. Executar `PATCH /api/paciente/{id}/reativar`.
3. Confirmar `status_ativo` e visibilidade na listagem.

#### Resultado Esperado

- HTTP **200 OK**
- `data.status_ativo: true`
- Mensagem: _"Paciente reativado com sucesso."_
- Paciente vis├¡vel novamente na listagem padr├úo

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P11 ÔÇö V├¡nculo de Terapeuta ao Paciente (RF18)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF18 ÔÇö V├¡nculos Multiterapeuta; RF21 |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Paciente ativo; terapeuta ativo com a mesma `clinica_id`; token JWT v├ílido |

**Entrada ÔÇö `POST /api/paciente/{id}/terapeutas`**

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

### CT-P12 ÔÇö Bloqueio de V├¡nculo entre Cl├¡nicas Distintas

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF18; RN04 ÔÇö Isolamento Institucional |
| **Tipo** | Negativo ÔÇö seguran├ºa multitenant |
| **Precondi├º├úo** | Paciente em `clinica_id = A`; terapeuta em `clinica_id = B` |

**Entrada ÔÇö `POST /api/paciente/{id}/terapeutas`** com `terapeuta_id` de outra cl├¡nica

#### Passos

1. Tentar vincular terapeuta de cl├¡nica diferente.

#### Resultado Esperado

- HTTP **400 Bad Request**
- Mensagem: _"Bloqueio de seguran├ºa: N├úo ├® permitido vincular terapeutas de cl├¡nicas diferentes."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P13 ÔÇö Bloqueio de V├¡nculo com Paciente Inativo

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF18; RN05 |
| **Tipo** | Negativo |
| **Precondi├º├úo** | Paciente com `status_ativo: false` |

**Entrada ÔÇö `POST /api/paciente/{id-inativo}/terapeutas`**

#### Passos

1. Inativar o paciente (CT-P09).
2. Tentar vincular um terapeuta ao paciente inativo.

#### Resultado Esperado

- HTTP **400 Bad Request**
- Mensagem: _"N├úo ├® poss├¡vel vincular terapeuta a um paciente inativo."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P14 ÔÇö Atualiza├º├úo Parcial de Dados do Paciente

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06 ÔÇö Atualiza├º├úo de Paciente |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Paciente cadastrado; terapeuta vinculado com token v├ílido |

**Entrada ÔÇö `PUT /api/paciente/{id}`**

```json
{ "telefone": "(11) 99999-1122", "cidade": "Campinas" }
```

#### Passos

1. Autenticar terapeuta com v├¡nculo ativo.
2. Executar `PUT /api/paciente/{id}` com body parcial.
3. Confirmar novos valores com `GET /api/paciente/{id}`.

#### Resultado Esperado

- HTTP **200 OK**
- `telefone` e `cidade` atualizados; demais campos inalterados
- `updated_at` renovado

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-P15 ÔÇö Rejei├º├úo de UUID Malformado na Rota

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF06 ÔÇö Valida├º├úo de Entrada |
| **Tipo** | Negativo |
| **Precondi├º├úo** | API em execu├º├úo |

**Entrada ÔÇö `GET /api/paciente/nao-e-uuid-valido`**

#### Passos

1. Executar `GET` com string arbitr├íria no lugar do UUID.

#### Resultado Esperado

- HTTP **400 Bad Request**
- Mensagem: _"O par├ómetro ID deve ser um UUID v├ílido."_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

## M├│dulo 2 ÔÇö Biblioteca de Jogos Terap├¬uticos

### CT-J01 ÔÇö Listagem do Cat├ílogo Completo de Jogos

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF09 ÔÇö Biblioteca de Jogos Terap├¬uticos |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Seed executado com 3 jogos: _Aventura das Cores_, _Formas Calmas_, _O Som dos Animais_ |

**Entrada ÔÇö `GET /api/jogos`**

#### Passos

1. Executar `GET /api/jogos`.
2. Verificar estrutura e quantidade de registros.

#### Resultado Esperado

- HTTP **200 OK**
- `data[]` com ao menos 3 jogos, cada um com `nome`, `versao`, `descricao` e `status_instalacao`
- Campo `manifesto_json` **ausente** na listagem resumida
- Metadados de pagina├º├úo presentes

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J02 ÔÇö Filtro por Objetivo Cl├¡nico

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF09; RF19 ÔÇö Filtros Avan├ºados |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Seed executado; jogos com objetivos distintos |

#### Entradas

- `GET /api/jogos?objetivo=foco_atencional`
- `GET /api/jogos?objetivo=regulacao_emocional`
- `GET /api/jogos?objetivo=desenvolvimento_linguagem`

#### Passos

1. Executar cada filtro separadamente.
2. Verificar qual jogo ├® retornado em cada consulta.

#### Resultado Esperado

| Filtro | Jogo Esperado |
| :--- | :--- |
| `foco_atencional` | _Aventura das Cores_ |
| `regulacao_emocional` | _Formas Calmas_ |
| `desenvolvimento_linguagem` | _O Som dos Animais_ |

Cada consulta retorna exatamente **1 jogo**; `total: 1`.

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J03 ÔÇö Filtro com Objetivo Inexistente

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF09; RF19 |
| **Tipo** | Negativo (sem correspond├¬ncia) |
| **Precondi├º├úo** | Seed executado |

**Entrada ÔÇö `GET /api/jogos?objetivo=objetivo_inexistente`**

#### Passos

1. Executar a `GET` com objetivo que n├úo existe no cat├ílogo.

#### Resultado Esperado

- HTTP **200 OK**
- `data: []`
- `total: 0`

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J04 ÔÇö Pagina├º├úo da Biblioteca de Jogos

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF19 ÔÇö Pagina├º├úo |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Seed com 3 jogos |

#### Entradas

- `GET /api/jogos?page=1&limit=2`
- `GET /api/jogos?page=2&limit=2`

#### Passos

1. Executar consulta da p├ígina 1.
2. Executar consulta da p├ígina 2.
3. Verificar que os jogos das duas p├íginas **n├úo se repetem**.

#### Resultado Esperado

- P├ígina 1: 2 jogos; `totalPages ÔëÑ 2`
- P├ígina 2: ao menos 1 jogo diferente dos da p├ígina 1

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J05 ÔÇö Consulta de Detalhes com Manifesto JSON

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF09; RNF02 ÔÇö Contrato de Dados |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Jogo ID 1 (_Aventura das Cores_) no banco |

**Entrada ÔÇö `GET /api/jogos/1`**

#### Passos

1. Executar `GET /api/jogos/1`.
2. Verificar presen├ºa e estrutura do `manifesto_json`.

#### Resultado Esperado

- HTTP **200 OK**
- `data.nome = "Aventura das Cores"`
- `data.manifesto_json` com `id_jogo`, `versao` e `metricas_suportadas[]`

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J06 ÔÇö Retorno 404 para Jogo Inexistente

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF09 |
| **Tipo** | Negativo |
| **Precondi├º├úo** | Banco sem jogo com ID `999999` |

**Entrada ÔÇö `GET /api/jogos/999999`**

#### Passos

1. Executar `GET` com ID inexistente.

#### Resultado Esperado

- HTTP **404 Not Found**
- Mensagem: _"Jogo n├úo encontrado"_

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J07 ÔÇö Valida├º├úo de Manifesto Conforme (RNF02)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RNF02; RN02 ÔÇö Tipagem Estrita |
| **Tipo** | Positivo |
| **Precondi├º├úo** | API em execu├º├úo |

**Entrada ÔÇö `POST /api/jogos/validar-manifesto`**

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

### CT-J08 ÔÇö Rejei├º├úo de Manifesto com M├®trica Sem Tipo (RN02)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN02 ÔÇö Tipagem Estrita sem Fallback; RNF02 |
| **Tipo** | Negativo ÔÇö regra cl├¡nica cr├¡tica |
| **Precondi├º├úo** | API em execu├º├úo |

**Entrada ÔÇö `POST /api/jogos/validar-manifesto`**

```json
{
  "id_jogo": "jogo-invalido",
  "nome": "Jogo Inv├ílido",
  "versao": "1.0.0",
  "metricas_suportadas": [
    { "id_metrica": "engajamento" }
  ]
}
```

> Note que `tipo_metrica` est├í ausente ÔÇö isto viola a RN02.

#### Passos

1. Executar `POST` com m├®trica sem `tipo_metrica`.

#### Resultado Esperado

- HTTP **400 Bad Request**
- `valido: false`
- `erros[]` mencionando **RN02** e proibi├º├úo de fallback autom├ítico

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J09 ÔÇö Telemetria Aprovada para Grava├º├úo (RN02)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN02; RNF02 |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Jogo ID 1 no banco com m├®trica num├®rica `tempo_resposta` |

**Entrada ÔÇö `POST /api/jogos/1/validar-telemetria`**

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

### CT-J10 ÔÇö Bloqueio de Telemetria com Tipo Incompat├¡vel (422)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN02 ÔÇö Proibi├º├úo de Fallback de M├®trica |
| **Tipo** | Negativo ÔÇö viola├º├úo de regra cl├¡nica cr├¡tica |
| **Precondi├º├úo** | Jogo ID 1 com `tempo_resposta` do tipo `numerica` |

**Entrada ÔÇö `POST /api/jogos/1/validar-telemetria`**

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

> Valor textual em m├®trica definida como num├®rica ÔÇö viola RN02.

#### Passos

1. Executar `POST` com valor de tipo incompat├¡vel.

#### Resultado Esperado

- HTTP **422 Unprocessable Entity**
- `podeGravar: false`
- `regraViolada: "RN02 - Fallback de M├®trica Proibido"`
- Mensagem descrevendo o tipo esperado versus o recebido

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J11 ÔÇö Bloqueio de Telemetria com Valor Fora do Dom├¡nio

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RN02 |
| **Tipo** | Negativo ÔÇö dom├¡nio de valores |
| **Precondi├º├úo** | Jogo ID 1 com `nivel_frustracao` do tipo `categorica` e dom├¡nio `["baixo", "medio", "alto"]` |

**Entrada ÔÇö `POST /api/jogos/1/validar-telemetria`**

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

> `"desesperado"` n├úo pertence ao dom├¡nio `["baixo", "medio", "alto"]`.

#### Passos

1. Executar `POST` com valor fora do dom├¡nio autorizado.

#### Resultado Esperado

- HTTP **422 Unprocessable Entity**
- `podeGravar: false`
- Mensagem indicando que `"desesperado"` n├úo pertence ao dom├¡nio `[baixo, medio, alto]`

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-J12 ÔÇö Manifesto com Laudo de Conformidade

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RNF02 ÔÇö Contrato do Manifesto |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Jogo ID 1 com manifesto cadastrado |

**Entrada ÔÇö `GET /api/jogos/1/manifesto`**

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

## M├│dulo 3 ÔÇö Pareamento Remoto e Sess├Áes (Sprint 8)

### CT-S01 ÔÇö Pareamento Remoto Bem-Sucedido com Handshake e WebSocket

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF10 ÔÇö Pareamento Remoto via Session Token (Fig. 3) |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Sess├úo criada com status `aguardando_conexao`; terapeuta conectado na sala WebSocket |

**Entrada ÔÇö `POST /api/sessao/parear`**

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

1. Abrir conex├úo WebSocket no namespace `/sessao` com `role: 'terapeuta'` e entrar na sala da sess├úo `849-291`.
2. O jogo remoto envia requisi├º├úo `POST /api/sessao/parear` com o token e metadados.
3. Observar a resposta HTTP e a notifica├º├úo instant├ónea no canal WebSocket.

#### Resultado Esperado

- HTTP **200 OK**
- `message: "Dispositivo pareado com sucesso"`
- `data.status_sessao: "em_andamento"`
- `data.websocket.canal: "session_849-291"`
- O terapeuta recebe via WebSocket o evento `dispositivo_conectado` com os dados do dispositivo.

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S02 ÔÇö Normaliza├º├úo Autom├ítica de Token sem H├¡fen e com Espa├ºos

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF10, RNF03 ÔÇö Usabilidade e Toler├óncia de Formato |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Sess├úo ativa com token `849-291` |

**Entrada ÔÇö `POST /api/sessao/parear`**

```json
{
  "session_token": "  849291  "
}
```

#### Passos

1. O jogador digita o PIN cont├¡nuo sem tra├ºos ou com espa├ºos residuais.
2. Executar `POST /api/sessao/parear`.

#### Resultado Esperado

- HTTP **200 OK**
- Token normalizado com sucesso e pareamento conclu├¡do.

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S03 ÔÇö Rejei├º├úo de Token Expirado (RNF03)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RNF03 ÔÇö Seguran├ºa e Expira├º├úo Ef├¬mera de 15 Minutos |
| **Tipo** | Negativo |
| **Precondi├º├úo** | Sess├úo emitida h├í mais de 15 minutos com `expira_em` no passado |

**Entrada ÔÇö `POST /api/sessao/parear`**

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
- Detalhes informando a necessidade de gerar novo c├│digo no painel web.

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S04 ÔÇö Rejei├º├úo de Token Inexistente ou Incorreto

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF10 ÔÇö Valida├º├úo de Integridade de Token |
| **Tipo** | Negativo |
| **Precondi├º├úo** | Token n├úo cadastrado no banco |

**Entrada ÔÇö `POST /api/sessao/parear`**

```json
{
  "session_token": "999-999"
}
```

#### Passos

1. Submeter c├│digo PIN inexistente ou incorreto.

#### Resultado Esperado

- HTTP **404 Not Found**
- `error: "Sess├úo n├úo encontrada para o token informado"`

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S05 ÔÇö Rejei├º├úo de Pareamento Concorrente (Sess├úo J├í em Andamento)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RF10 ÔÇö Exclusividade de Conex├úo por Sess├úo |
| **Tipo** | Negativo |
| **Precondi├º├úo** | Sess├úo j├í pareada com status `em_andamento` |

**Entrada ÔÇö `POST /api/sessao/parear`**

```json
{
  "session_token": "AND-002"
}
```

#### Passos

1. Um segundo dispositivo tenta utilizar o mesmo PIN de uma sess├úo ativa.

#### Resultado Esperado

- HTTP **409 Conflict**
- `error: "Sess├úo j├í pareada ou em andamento"`

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

### CT-S06 ÔÇö Monitoramento de Queda de Conex├úo e Reconex├úo (RNF04)

| Campo | Valor |
| :--- | :--- |
| **Requisito** | RNF04 ÔÇö Resili├¬ncia de Conex├úo e Detec├º├úo de Presen├ºa |
| **Tipo** | Positivo |
| **Precondi├º├úo** | Dispositivo pareado ativo na sala WebSocket |

#### Passos

1. Dispositivo conectado simula queda de sinal ou desconex├úo abrupta de rede.
2. Analisar o evento recebido na interface do terapeuta (`dispositivo_desconectado`).
3. O dispositivo restabelece a rede e reconecta ao WebSocket com o mesmo token.
4. Analisar o evento de reconex├úo (`dispositivo_reconectado`).

#### Resultado Esperado

- No momento da queda: evento `dispositivo_desconectado` com timestamp e causa.
- No retorno da rede: evento `dispositivo_reconectado` com m├®trica exata de `tempo_offline_ms` e status `em_andamento`.

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
- Registro criado na tabela `relatorio_sessao` vinculado ao prontuário médico
- Notificação `sessao_finalizada` emitida na sala WebSocket para desconexão ordenada do tablet
- Evento imutável gravado na trilha de auditoria clínica (`acao: "sessao_finalizada"`) com IP e User-Agent
- Segunda tentativa de finalização sumariamente rejeitada com HTTP **400 Bad Request** (_"A sessão já se encontra finalizada."_)

**Status:** `[X] Passou` `[ ] Falhou` `[ ] Pendente`

---

## Matriz de Rastreabilidade

| Requisito | Descrição | Casos de Teste |
| :--- | :--- | :--- |
| **RF06** | Cadastro e Gestão de Pacientes | CT-P01, CT-P02, CT-P03, CT-P04, CT-P14, CT-P15 |
| **RF09** | Biblioteca de Jogos Terapêuticos | CT-J01, CT-J02, CT-J03, CT-J04, CT-J05, CT-J06, CT-J12 |
| **RF10** | Pareamento Remoto via Session Token e Handshake | CT-S01, CT-S02, CT-S04, CT-S05 |
| **RF11** | Modo Livre (sem prontuário clínico) | CT-J01, CT-S10 |
| **RF12** | Gestão de Sessão Terapêutica Ativa | CT-S07, CT-S08, CT-S09, CT-S10 |
| **RF13** | Ciclo de Sessão, Comandos e Encerramento Formal | CT-S07, CT-S11, CT-S13, CT-S14 |
| **RF17** | Contexto DDA e Relatório de Síntese IA | CT-S07, CT-S14 |
| **RF18** | Gestão de Vínculos Multiterapeuta | CT-P11, CT-P12, CT-P13 |
| **RF19** | Filtros, Busca Avançada e Paginação | CT-P05, CT-J02, CT-J03, CT-J04 |
| **RF21** | Autoria Obrigatória e Controle do Terapeuta | CT-P11, CT-S11, CT-S14 |
| **RN01** | Supressão de Persistência Clínica no Modo Livre | CT-S10 |
| **RN02** | Tipagem Estrita de Métricas (sem fallback) | CT-J07, CT-J08, CT-J09, CT-J10, CT-J11, CT-S08 |
| **RN03** | Contexto DDA Pré-Sessão Entregue ao Jogo | CT-S07 |
| **RN04** | Visibilidade por Vínculo e Isolamento Institucional | CT-P06, CT-P07, CT-P08, CT-P12, CT-S14 |
| **RN05** | Inalterabilidade do Histórico Clínico (Soft Delete / Imutabilidade) | CT-P04, CT-P09, CT-P10, CT-P13, CT-S14 |
| **RNF02** | Padronização e Contratos de Dados | CT-J05, CT-J07, CT-J08, CT-J12 |
| **RNF03** | Expiração de PIN (15 min) e Rate Limiting no WebSocket | CT-S02, CT-S03, CT-S07, CT-S09, CT-S12 |
| **RNF04** | Heartbeat, Resiliência e Janela de Tolerância de 60s | CT-S06, CT-S11, CT-S12, CT-S13 |
| **RNF05** | Ingestão em Tempo Real (< 100ms) e Alta Vazão | CT-S08, CT-S09 |
| **RNF06** | Trilha de Auditoria Clínica Imutável | CT-S14 |

**Total: 41 casos de teste** — 15 Pacientes (CT-P01→P15) · 12 Jogos (CT-J01→J12) · 14 Gestão de Sessão, Pareamento e Telemetria (CT-S01→S14)

---

## Resumo de Cobertura por Código HTTP e Eventos WebSocket

| Protocolo / Código | Semântica | Casos de Teste |
| :---: | :--- | :--- |
| **HTTP 200** | Sucesso em consulta, pareamento, validação aprovada ou modo livre | CT-P04, CT-P05, CT-P06, CT-P09, CT-P10, CT-P14, CT-J01, CT-J02, CT-J03, CT-J04, CT-J05, CT-J07, CT-J09, CT-J12, CT-S01, CT-S02, CT-S06, CT-S10, CT-S14 |
| **HTTP 201** | Recurso criado (paciente, vínculo, início de sessão, telemetria persistida) | CT-P01, CT-P11, CT-S07, CT-S08, CT-S09 |
| **HTTP 400** | Parâmetros inválidos, lote excedido ou transição inválida de FSM | CT-P02, CT-P12, CT-P13, CT-P15, CT-J08, CT-S09, CT-S14 |
| **HTTP 401** | Sem autenticação / Token JWT ausente ou inválido | CT-P08 |
| **HTTP 403** | Acesso negado por falta de vínculo clínico institucional (RN04) | CT-P07, CT-S14 |
| **HTTP 404** | Recurso não encontrado (paciente, jogo ou sessão inexistente) | CT-J06, CT-S04 |
| **HTTP 409** | Conflito de integridade única ou sessão já em andamento | CT-P03, CT-S05 |
| **HTTP 410** | Token PIN expirado (TTL 15 min) ou sessão terminal | CT-S03 |
| **HTTP 422** | Violação de regra clínica de tipagem estrita RN02 | CT-J10, CT-J11 |
| **WebSocket** | Streaming de telemetria contínua (`sessao:telemetria` < 100ms) | CT-S08, CT-S09, CT-S10 |
| **WebSocket** | Canal bidirecional de comandos clínicos (`sessao:comando`) e Acks | CT-S11 |
| **WebSocket** | Rate limiting e prevenção de flood (`erro_rate_limit`) | CT-S12 |
| **WebSocket** | Presença, queda, reconexão de 60s e interrupção (`sessao:alerta_conexao`) | CT-S01, CT-S06, CT-S13 |
| **WebSocket** | Sinalização de encerramento de sessão (`sessao_finalizada`) | CT-S14 |

