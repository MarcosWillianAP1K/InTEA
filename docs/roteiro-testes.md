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
| **Passos** | Sequência de ações a executar |
| **Resultado Esperado** | Comportamento correto esperado do sistema |
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

**Passos**
1. Abrir Postman/Insomnia.
2. Configurar `POST /api/paciente` com o body acima.
3. Executar a requisição.

**Resultado Esperado**
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

**Passos**
1. Configurar `POST /api/paciente`.
2. Inserir CPF matematicamente inválido.
3. Executar a requisição.

**Resultado Esperado**
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

**Passos**
1. Executar CT-P01 com sucesso.
2. Repetir o mesmo `POST` sem alterar o CPF.

**Resultado Esperado**
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

**Passos**
1. Executar `GET /api/paciente`.
2. Verificar os registros retornados.

**Resultado Esperado**
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

**Passos**
1. Executar a `GET` com os parâmetros acima.
2. Analisar os registros e metadados retornados.

**Resultado Esperado**
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
```
Authorization: Bearer {token}
```

**Passos**
1. Obter token JWT via login.
2. Garantir que o terapeuta possui vínculo com o paciente.
3. Executar `GET /api/paciente/{id}`.

**Resultado Esperado**
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
```
Authorization: Bearer {token}
```

**Passos**
1. Autenticar terapeuta que **não** está vinculado ao paciente.
2. Executar `GET /api/paciente/{id}`.

**Resultado Esperado**
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

**Passos**
1. Executar `GET /api/paciente/{id}` sem token.

**Resultado Esperado**
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

**Passos**
1. Executar `DELETE /api/paciente/{id}`.
2. Verificar `status_ativo` na resposta.
3. Executar `GET /api/paciente` e confirmar ausência do paciente.
4. Verificar **diretamente no banco** que o registro **não foi deletado fisicamente**.

**Resultado Esperado**
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

**Passos**
1. Inativar o paciente (CT-P09).
2. Executar `PATCH /api/paciente/{id}/reativar`.
3. Confirmar `status_ativo` e visibilidade na listagem.

**Resultado Esperado**
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

**Passos**
1. Autenticar e obter token JWT.
2. Executar `POST /api/paciente/{id}/terapeutas`.
3. Confirmar com `GET /api/paciente/{id}/terapeutas`.

**Resultado Esperado**
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

**Passos**
1. Tentar vincular terapeuta de clínica diferente.

**Resultado Esperado**
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

**Passos**
1. Inativar o paciente (CT-P09).
2. Tentar vincular um terapeuta ao paciente inativo.

**Resultado Esperado**
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

**Passos**
1. Autenticar terapeuta com vínculo ativo.
2. Executar `PUT /api/paciente/{id}` com body parcial.
3. Confirmar novos valores com `GET /api/paciente/{id}`.

**Resultado Esperado**
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

**Passos**
1. Executar `GET` com string arbitrária no lugar do UUID.

**Resultado Esperado**
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

**Passos**
1. Executar `GET /api/jogos`.
2. Verificar estrutura e quantidade de registros.

**Resultado Esperado**
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

**Entradas**
- `GET /api/jogos?objetivo=foco_atencional`
- `GET /api/jogos?objetivo=regulacao_emocional`
- `GET /api/jogos?objetivo=desenvolvimento_linguagem`

**Passos**
1. Executar cada filtro separadamente.
2. Verificar qual jogo é retornado em cada consulta.

**Resultado Esperado**

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

**Passos**
1. Executar a `GET` com objetivo que não existe no catálogo.

**Resultado Esperado**
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

**Entradas**
- `GET /api/jogos?page=1&limit=2`
- `GET /api/jogos?page=2&limit=2`

**Passos**
1. Executar consulta da página 1.
2. Executar consulta da página 2.
3. Verificar que os jogos das duas páginas **não se repetem**.

**Resultado Esperado**
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

**Passos**
1. Executar `GET /api/jogos/1`.
2. Verificar presença e estrutura do `manifesto_json`.

**Resultado Esperado**
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

**Passos**
1. Executar `GET` com ID inexistente.

**Resultado Esperado**
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

**Passos**
1. Executar `POST /api/jogos/validar-manifesto` com o payload acima.

**Resultado Esperado**
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

**Passos**
1. Executar `POST` com métrica sem `tipo_metrica`.

**Resultado Esperado**
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

**Passos**
1. Executar `POST /api/jogos/1/validar-telemetria`.

**Resultado Esperado**
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

**Passos**
1. Executar `POST` com valor de tipo incompatível.

**Resultado Esperado**
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

**Passos**
1. Executar `POST` com valor fora do domínio autorizado.

**Resultado Esperado**
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

**Passos**
1. Executar `GET /api/jogos/1/manifesto`.
2. Analisar o objeto `validacao` na resposta.

**Resultado Esperado**
- HTTP **200 OK**
- Campo `data` com o manifesto JSON completo
- `validacao.valido: true`
- `validacao.erros: []`

**Status:** `[ ] Passou` `[ ] Falhou` `[ ] Pendente`

---

## Matriz de Rastreabilidade

| Requisito | Descrição | Casos de Teste |
| :--- | :--- | :--- |
| **RF06** | Cadastro e Gestão de Pacientes | CT-P01, CT-P02, CT-P03, CT-P04, CT-P14, CT-P15 |
| **RF09** | Biblioteca de Jogos Terapêuticos | CT-J01, CT-J02, CT-J03, CT-J04, CT-J05, CT-J06, CT-J12 |
| **RF11** | Modo Livre (sem prontuário clínico) | CT-J01 |
| **RF18** | Gestão de Vínculos Multiterapeuta | CT-P11, CT-P12, CT-P13 |
| **RF19** | Filtros, Busca Avançada e Paginação | CT-P05, CT-J02, CT-J03, CT-J04 |
| **RF21** | Vínculo Automático no Cadastro | CT-P11 |
| **RN02** | Tipagem Estrita de Métricas (sem fallback) | CT-J07, CT-J08, CT-J09, CT-J10, CT-J11 |
| **RN04** | Visibilidade por Vínculo e Instituição | CT-P06, CT-P07, CT-P08, CT-P12 |
| **RN05** | Inalterabilidade do Histórico (Soft Delete) | CT-P04, CT-P09, CT-P10, CT-P13 |
| **RNF02** | Padronização e Contratos de Dados | CT-J05, CT-J07, CT-J08, CT-J12 |

**Total: 27 casos de teste** — 15 do Módulo Pacientes (CT-P01→P15) · 12 do Módulo Jogos (CT-J01→J12)

---

## Resumo de Cobertura por Código HTTP

| Código | Semântica | Casos de Teste |
| :---: | :--- | :--- |
| **200** | Sucesso em consulta ou validação aprovada | CT-P04, CT-P05, CT-P06, CT-P09, CT-P10, CT-P14, CT-J01, CT-J02, CT-J03, CT-J04, CT-J05, CT-J07, CT-J09, CT-J12 |
| **201** | Recurso criado com sucesso | CT-P01, CT-P11 |
| **400** | Parâmetros inválidos / regra de negócio | CT-P02, CT-P12, CT-P13, CT-P15, CT-J08 |
| **401** | Sem autenticação / JWT inválido | CT-P08 |
| **403** | Acesso negado por RN04 | CT-P07 |
| **404** | Recurso não encontrado | CT-J06 |
| **409** | Conflito de integridade (CPF duplicado) | CT-P03 |
| **422** | Violação de regra clínica RN02 | CT-J10, CT-J11 |
