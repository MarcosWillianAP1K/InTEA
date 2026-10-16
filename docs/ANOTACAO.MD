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
