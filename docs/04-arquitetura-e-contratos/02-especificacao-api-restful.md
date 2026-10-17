# Especificação dos Contratos RESTful da API — InTEA

> **Projeto:** InTEA — Interface do Terapeuta para Orquestração do Ecossistema de Games Terapêuticos  
> **Instituição:** Sistemas de Informação — Universidade Federal do Piauí (UFPI)  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf)  
> **Especificação OpenAPI/Swagger:** [api-pacientes-jogos.md](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/api-pacientes-jogos.md)  
> **Hub de Navegação:** [Índice Geral](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/README.md)

---

## 1. Visão Geral da API e Semântica de Comunicação

A API RESTful do InTEA atua como a autoridade central de governança clínica, segurança e persistência do ecossistema. Opera sob HTTPS estrito com serialização de dados exclusivamente em **JSON**.

* **Base URL de Desenvolvimento:** `http://localhost:3000/api`
* **Documentação Viva Swagger UI:** `http://localhost:3000/api/docs`
* **Autenticação:** Padrão Bearer Token JWT via cabeçalho HTTP:
  ```http
  Authorization: Bearer <access_token>
  ```

---

## 2. Tabela Canônica de Códigos de Status HTTP do InTEA

A API adota semântica restrita de códigos de resposta, vedando qualquer uso ambíguo:

| Código HTTP | Semântica no InTEA | Cenário Obrigatório de Aplicação | Quando é PROIBIDO Usar |
| :---: | :--- | :--- | :--- |
| **`200 OK`** | Sucesso em consulta ou mutação síncrona | Resposta com dados em requisições `GET`, `PATCH` ou `PUT`. | Não usar para criação de novos recursos. |
| **`201 Created`** | Novo recurso instanciado com sucesso | Cadastro de paciente, emissão de sessão e inserção de anotação. | Não usar para consultas idempotentes simples. |
| **`204 No Content`** | Ação executada com sucesso sem payload | Exclusão lógica (*soft delete*) ou comandos de desvinculação. | Não usar quando o cliente precisa consumir o objeto resultante. |
| **`400 Bad Request`** | Erro de sintaxe, formato ou DTO | JSON quebrado, UUID inválido ou campos obrigatórios faltantes. | Não usar para falha de regra clínica de métrica (usar 422). |
| **`401 Unauthorized`** | Falha de autenticação | Token JWT ausente, expirado ou com assinatura inválida. | Não usar quando o usuário está logado mas sem acesso (usar 403). |
| **`403 Forbidden`** | Acesso negado por regra clínica (**RN04**) | Terapeuta sem vínculo com paciente ou pertencente a outra clínica. | Não usar para falha de credenciais de login (usar 401). |
| **`404 Not Found`** | Recurso inexistente ou inativo | Identificador de paciente, sessão ou jogo não localizado no banco. | Não usar para falhas semânticas de regras de negócio. |
| **`409 Conflict`** | Conflito de estado concorrente | Tentativa de parear sessão já ativa ou duplicar chave única. | Não usar para erros de validação sintática de formulário. |
| **`410 Gone`** | Recurso expirado de forma definitiva | Código PIN de pareamento cujo TTL de 15 minutos foi ultrapassado. | Não usar para tokens inexistentes ou malformatados (usar 404/400). |
| **`422 Unprocessable`** | Violação semântica de regra clínica (**RN02**) | Métrica sem `tipo_metrica` declarado ou valor fora do domínio. | Não usar para erros genéricos de sintaxe JSON. |
| **`500 Internal Error`** | Falha catastrófica de infraestrutura | Queda de rede do banco de dados ou erro inesperado de código. | **PROIBIDO** disparar 500 para regras de negócio previsíveis. |

---

## 3. Matriz de Endpoints por Domínio de Negócio

### 3.1. Módulo Terapeuta (`/api/terapeuta`)
Gerencia o ciclo de vida dos profissionais de saúde, perfis cadastrais e credenciais:

| Método | Endpoint | Middlewares de Segurança | Regra de Autorização |
| :---: | :--- | :--- | :--- |
| `POST` | `/api/terapeuta/login` | Nenhum (Público) | Autenticação via Supabase Auth com validação de conta ativa. |
| `POST` | `/api/terapeuta/logout` | `authMiddleware` | Encerramento de sessão e revogação de tokens. |
| `POST` | `/api/terapeuta/refresh` | Nenhum (Público) | Rotação segura de *refresh token* (**RF03**). |
| `GET` | `/api/terapeuta` | `authMiddleware` | Lista profissionais da mesma clínica (comum) ou global (SuperAdmin). |
| `GET` | `/api/terapeuta/:id` | `authMiddleware` | Visualização de dados profissionais com isolamento por clínica (**RN04**). |
| `POST` | `/api/terapeuta` | `authMiddleware, adminMiddleware` | **Exclusivo SuperAdmin:** Instancia novo perfil de terapeuta na clínica. |
| `PUT` | `/api/terapeuta/:id` | `authMiddleware, meMiddleware({ allowAdmin: true })` | Próprio terapeuta (sanitizado anti-IDOR) ou SuperAdmin. |
| `DELETE`| `/api/terapeuta/:id` | `authMiddleware, meMiddleware({ allowAdmin: true })` | Auto-inativação da conta (`status_ativo = false`) ou SuperAdmin. |
| `DELETE`| `/api/terapeuta/:id/hard` | `authMiddleware, adminMiddleware` | **Exclusivo SuperAdmin:** Exclusão física para ambiente de testes e CI/CD. |
| `PATCH` | `/api/terapeuta/:id/reativar` | `authMiddleware, adminMiddleware` | **Exclusivo SuperAdmin:** Reativação de conta profissional inativa. |

---

### 3.2. Módulo Paciente (`/api/paciente`)
Gerencia o prontuário dos indivíduos no espectro autista e a equipe multidisciplinar:

| Método | Endpoint | Middlewares de Segurança | Regra de Autorização |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/paciente` | `authMiddleware` | Lista pacientes com vínculo com o terapeuta autenticado na mesma clínica. |
| `GET` | `/api/paciente/:id` | `authMiddleware, verificarVisibilidadePaciente` | Consulta detalhada do prontuário exigindo vínculo em `terapeuta_paciente`. |
| `POST` | `/api/paciente` | `authMiddleware` | Cadastra paciente, força `clinica_id` do autor e auto-vincula o criador. |
| `PUT` | `/api/paciente/:id` | `authMiddleware, verificarVisibilidadePaciente` | Atualização cadastral dos dados sociodemográficos e clínicos. |
| `DELETE`| `/api/paciente/:id` | `authMiddleware, verificarVisibilidadePaciente` | Soft delete clínico inativando o registro (`status_ativo = false`, **RN05**). |
| `GET` | `/api/paciente/:id/terapeutas` | `authMiddleware, verificarVisibilidadePaciente` | Lista os membros da equipe multidisciplinar vinculados ao paciente. |
| `POST` | `/api/paciente/:id/terapeutas` | `authMiddleware, verificarVisibilidadePaciente` | Associa um coterapeuta da mesma clínica ao caso (**RF18**). |
| `DELETE`| `/api/paciente/:id/terapeutas/:terapeutaId` | `authMiddleware, verificarVisibilidadePaciente` | Revoga o vínculo de acompanhamento de um coterapeuta específico. |

---

### 3.3. Módulo Sessão (`/api/sessao`)
Governa a orquestração do pareamento remoto, máquina de estados e laudos analíticos:

| Método | Endpoint | Middlewares de Segurança | Regra de Autorização |
| :---: | :--- | :--- | :--- |
| `POST` | `/api/sessao/iniciar` | `authMiddleware` | Cria sessão, valida paciente, gera PIN de 15 min e injeta contexto (**RN03**). |
| `GET` | `/api/sessao/:id` | `authMiddleware, sessaoMiddleware` | Consulta dados da sessão com proteção anti-IDOR (**RN01**, **RN04**). |
| `PATCH` | `/api/sessao/:id/finalizar` | `authMiddleware, sessaoMiddleware` | Finaliza formalmente a intervenção, registrando o encerramento. |
| `DELETE`| `/api/sessao/:id/cancelar` | `authMiddleware, sessaoMiddleware` | Cancela sessão em andamento e fecha as salas de WebSocket. |
| `GET` | `/api/sessao/:token/status` | Nenhum (Público - Consumo pelo Tablet) | Validação via regex `/^[A-Z0-9]{3,5}-?[A-Z0-9]{3,5}$/i` com TTL de 15 min. |
| `GET` | `/api/sessao/:id/resultado` | `authMiddleware, sessaoMiddleware` | Retorna o laudo em 3FN consolidado com o parecer da IA (**RF14**). |
| `GET` | `/api/sessao/:id/exportar` | `authMiddleware, sessaoMiddleware` | Gera e faz streaming do arquivo PDF padronizado para impressão (**RF20**). |

---

### 3.4. Módulo Anotações de Prontuário (`/api/anotacao`)
Prontuário livre e evoluções de acompanhamento clínico com proteção estrita de autoria:

| Método | Endpoint | Middlewares de Segurança | Regra de Autorização |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/anotacao/:id` | `authMiddleware, resolverContextoAnotacaoPorId, verificarVisibilidadePaciente` | Consulta unificada na raiz sem queries redundantes no banco. |
| `POST` | `/api/anotacao` | `authMiddleware` | Cria anotação vinculando incondicionalmente `req.user.id` (**RF21**). |
| `PATCH` | `/api/anotacao/:id` | `authMiddleware, resolverContextoAnotacaoPorId` | Edição permitida **exclusivamente ao terapeuta autor** da anotação. |
| `DELETE`| `/api/anotacao/:id` | `authMiddleware, resolverContextoAnotacaoPorId` | Soft delete clínico (`soft_delete = true`, 204 No Content, **RN05**). |
| `DELETE`| `/api/anotacao/:id/hard` | `authMiddleware, adminMiddleware` | **Exclusivo SuperAdmin:** Remoção física em suítes de testes de CI/CD. |

---

### 3.5. Módulo Biblioteca de Jogos (`/api/jogos`)
Catálogo de jogos terapêuticos e manifestos técnicos homologados:

| Método | Endpoint | Middlewares de Segurança | Regra de Autorização |
| :---: | :--- | :--- | :--- |
| `GET` | `/api/jogos` | `authMiddleware` | Catálogo geral com filtros por objetivo clínico e status de instalação. |
| `GET` | `/api/jogos/:id` | `authMiddleware` | Retorna o manifesto técnico do jogo com declaração de `tipo_metrica` (**Contrato 1**). |
