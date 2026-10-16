# Anotações Técnicas e Alinhamento de Rotas — Módulo de Jogos

> **Data:** 15/10/2026  
> **Módulo:** Jogos / Catálogo / Manifesto Clínico  
> **Destinatários:** Equipe InTEA (Front-end e Back-end)

---

## 1. Unificação e Consolidação de Rotas de Jogos

### Contexto do Problema
Anteriormente, existiam duas rotas concorrentes para consulta individual de jogos:
1. `GET /api/jogos/:id` (Consulta genérica com duplicação de dados entre a raiz do payload e o `manifesto_json`).
2. `GET /api/jogos/:id/manifesto` (Consulta do manifesto e laudo de conformidade clínica, porém carente do `id` do banco de dados e da `descricao` do jogo).

### Decisão Arquitetural RESTful
* **Eliminação de Sub-rota Redundante:** A sub-rota `GET /api/jogos/:id/manifesto` foi descontinuada e apagada.
* **Centralização no Endpoint Canônico CRUD:** A rota padrão RESTful `GET /api/jogos/:id` passa a ser a **rota única** para detalhes completos do jogo, unificando no mesmo payload tanto os dados cadastrais da plataforma (`id`, `nome`, `descricao`, `versao`) quanto os metadados clínicos do manifesto (`objetivo_clinico`, `metricas_suportadas`) e o laudo de validação clínica (`validacao`).

---

## 2. Estrutura Consolidada do Retorno (`GET /api/jogos/:id`)

```json
{
  "data": {
    "id": 1,
    "id_jogo": "aventura-das-cores",
    "nome": "Aventura das Cores",
    "descricao": "Estimula atenção compartilhada e reconhecimento facial através de interação cromática.",
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
  },
  "validacao": {
    "valido": true,
    "erros": []
  }
}
```

---

## 3. Diretriz para o Front-end

* **Situação Atual do Front-end:** Atualmente, a biblioteca de jogos (`jogosService.ts`) utiliza dados locais mockados (`JOGOS_MOCK`) e não realiza requisições HTTP para os endpoints individuais de jogo.
* **Próxima Etapa de Integração:** Quando a integração HTTP para exibição dos detalhes/manifesto do jogo for conectada no Front-end, deve-se consumir exclusivamente o endpoint canônico:
  $$\text{GET /api/jogos/:id}$$
  Esse endpoint já provê tudo o que o front-end, cockpit ou tablet necessitam para configurar e validar uma sessão clínica.

---

## 4. Ciclo de Vida e CRUD Operacional de Jogos (Dev / Testes)

### 4.1 Status Operacional (`status_jogo`)
O antigo campo `status_instalacao` foi removido (Migration 011) e substituído pelo estado operacional `status_jogo` (com constraint `CHECK` no banco):
* **`ativo`:** O jogo está pronto, validado e disponível para seleção em sessões clínicas.
* **`desativado`:** O jogo foi desativado (por exemplo, violação de termos ou descontinuação); fica inacessível para novos downloads ou sessões.
* **`manutencao`:** O jogo foi suspenso temporariamente para aplicação de patches de atualização ou correção de bugs.
* **`em_breve`:** O jogo está catalogado como futuro lançamento na biblioteca.

### 4.2 Endpoints CRUD e Matriz de Permissões

| Método | Endpoint | Proteção | Finalidade | Descrição / Regras |
| :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/jogos` | Acesso Livre | Listagem com filtros | Catálogo geral. Suporta filtros via query string: `?objetivo=...` e `?status=ativo\|desativado\|manutencao\|em_breve`. Sem exigência de token/admin. |
| `GET` | `/api/jogos/:id` | `authMiddleware` | Consulta unificada | Retorna dados cadastrais, `status`, manifesto clínico e laudo de conformidade clínica. Aceita UUID ou slug técnico (`id_jogo`). |
| `POST` | `/api/jogos` | `auth` + `admin` | Cadastro de novo jogo | Restrito a Administradores (Super Admin). Gera slug técnico (`id_jogo`) automático a partir do `nome`. Valida unicidade e integridade do manifesto. |
| `PATCH` / `PUT` | `/api/jogos/:id` | `auth` + `admin` | Atualização / Status | Restrito a Administradores (Super Admin). Permite editar metadados ou transicionar o status operacional. |
| `DELETE` | `/api/jogos/:id` | `auth` + `admin` | Exclusão física (Hard Delete) | Restrito a Administradores (Super Admin). Remove permanentemente o registro. Caso haja sessões clínicas vinculadas, retorna **409 Conflict**. |
| `POST` | `/api/jogos/validar-manifesto` | `authMiddleware` | Validação de manifesto | Ferramenta de validação sintática e semântica de manifestos contra o Contrato 1. |
| `POST` | `/api/jogos/:id/validar-telemetria` | Token de Sessão | Validação de telemetria | Utiliza o token da sessão clínica (`token_sessao`) emitido ao tablet do jogo, sem necessidade de credenciais de terapeuta. |

---

### 4.3 Resumo da Auditoria e Correções de Lógica Implementadas

1. **Proteção de Rotas com `authMiddleware` e `adminMiddleware`:**
   - As operações mutáveis do catálogo (`POST /api/jogos`, `PATCH /api/jogos/:id`, `PUT /api/jogos/:id` e `DELETE /api/jogos/:id`) agora exigem autenticação ativa e privilégios de super administrador.
   - A listagem geral (`GET /api/jogos`) permanece aberta para visualização do catálogo e pareamento.
   - A consulta individual canônica (`GET /api/jogos/:id`) e a validação de manifesto (`POST /api/jogos/validar-manifesto`) exigem autenticação com token JWT válido.

2. **Ativação do Filtro por Status em `JogoController.listar`:**
   - Anteriormente, o parâmetro `req.query.status` não estava sendo repassado para o `JogoModel.listar`.
   - Agora é devidamente capturado e validado. Caso seja fornecido um valor inválido, retorna imediatamente **400 Bad Request**.

3. **Resolução Polimórfica de Identificador (UUID vs. Slug `id_jogo`):**
   - Na busca por ID (`GET /api/jogos/:id`), foi implementada verificação de formato UUID. Caso o parâmetro informado seja um slug textual (ex: `aventura-das-cores`), o Supabase filtra dinamicamente via `manifesto_json->>id_jogo`, prevenindo a exceção `22P02` (invalid syntax for type uuid) do PostgreSQL.
   - O mesmo suporte foi estendido à busca local em memória no fallback.

4. **Garantia de Chave Primária nas Operações de Atualização e Exclusão:**
   - Nos métodos `atualizar` e `excluir`, a busca prévia resolve o registro e repassa explicitamente `jogo.id` (chave primária interna) para o modelo, permitindo que rotas chamadas via slug realizem o `UPDATE` ou `DELETE` com precisão.

5. **Prevenção de Duplicidade de Slug no Cadastro:**
   - O método `cadastrar` agora valida se já existe algum jogo cadastrado com o slug gerado (`id_jogo`), retornando **409 Conflict** caso haja duplicidade.

