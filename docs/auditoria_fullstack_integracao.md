# Relatório de Auditoria Fullstack e Matriz de Integração (Sprint 12)

> **Data:** 17/10/2026  
> **Tema:** Auditoria Global do Sistema InTEA (Back-End + Front-End) e Mapeamento de Integração E2E  
> **Responsáveis:** Marcos Willian (`@MarcosWillianAP1K`), João Marcos (`@JM3L0`), Hermeson Alves (`@Hermeson69`), Luma Maiara (`@lumamaiara`), Raildom Silva (`@Raildom`)  
> **Status:** ✅ Concluída  

---

## 1. Visão Geral da Auditoria Fullstack

Esta auditoria realizou uma varredura completa em todos os módulos construídos no **Back-End** (`Backend/api/*`, `Backend/core/*`) e no **Front-End** (`Frontend/src/*`), mapeando a correspondência exata entre rotas da API Express, eventos WebSocket do Socket.IO e os serviços consumidores da interface web.

---

## 2. Matriz de Integração: Back-End vs Front-End

| Domínio / Feature | Endpoint / Evento no Backend | Método HTTP / Protocolo | Serviço no Front-End | Página / Componente Consumidor | Status de Integração |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **Autenticação** | `/api/auth/login` | `POST` | `auth.service.ts` | `useAuth`, `SidebarLayout` | ✅ Integrado |
| **Autenticação** | `/api/auth/refresh` | `POST` | `http-client.ts` | Interceptor de Renovação de Token | ✅ Integrado |
| **Autenticação** | `/api/auth/me` | `GET` | `auth.service.ts` | `NavUser`, Header | ✅ Integrado |
| **Terapeuta** | `/api/terapeuta` | `GET` | `terapeuta.service.ts` | Configurações, Perfil | ✅ Integrado |
| **Terapeuta** | `/api/terapeuta/:id` | `GET`, `PUT` | `terapeuta.service.ts` | Perfil do Terapeuta | ✅ Integrado |
| **Paciente** | `/api/paciente` | `GET` (Listar), `POST` (Criar) | `paciente.service.ts` | `ListaPacientes`, `PainelPage` | ✅ Integrado |
| **Paciente** | `/api/paciente/:id` | `GET`, `PUT` | `paciente.service.ts` | `ConteudoPacientes` | ✅ Integrado |
| **Paciente** | `/api/paciente/:id/reativar` | `PATCH` | `paciente.service.ts` | Gestão de Prontuário | ✅ Integrado |
| **Paciente** | `/api/paciente/:id/hard` | `DELETE` | `paciente.service.ts` | Bloqueado por Trigger (**RN05**) | ✅ Integrado |
| **Jogos** | `/api/jogos` | `GET` | `jogos.service.ts` | `BibliotecaJogosPage` | ✅ Integrado |
| **Jogos** | `/api/jogos/:id` | `GET` | `jogos.service.ts` | `JogoCard` | ✅ Integrado |
| **Jogos** | `/api/jogos/:id/manifesto` | `GET` | `jogos.service.ts` | Validação de Métricas (**RN02**) | ✅ Integrado |
| **Sessão** | `/api/sessao/iniciar` | `POST` | `sessao.service.ts` | `ModalPreSessao` | ✅ Integrado |
| **Sessão** | `/api/sessao/:id/finalizar` | `PATCH` | `sessao.service.ts` | `ModalFinalizarSessao`, `Cockpit` | ✅ Integrado |
| **Sessão** | `/api/sessao/:id/cancelar` | `DELETE` | `sessao.service.ts` | `ControlesClinicos`, `ModalPreSessao` | ✅ Integrado |
| **Sessão** | `/api/sessao/:id/resultado`| `GET` | `sessao.service.ts` | `ResultadoSessaoPage` | ✅ Integrado |
| **Sessão** | `/api/sessao/:id/exportar` | `GET` | `sessao.service.ts` | `BotaoExportarRelatorio` | ✅ Integrado |
| **Telemetria WS** | Namespace `/sessao` | WebSocket (Socket.IO) | `useLiveTelemetry.ts` | `CockpitSessaoPage`, `TelemetriaChart`| ✅ Integrado |
| **Telemetria REST**| `/api/telemetria/:sessaoId` | `GET` | `sessao.service.ts` | Gráfico Histórico | ✅ Integrado |
| **Anotações** | `/api/anotacao` | `POST` | `anotacao.service.ts` | `BlocoAnotacoesClinicas` | ✅ Integrado |
| **Anotações** | `/api/anotacao/paciente/:id`| `GET` | `anotacao.service.ts` | Prontuário do Paciente | ✅ Integrado |
| **Auditoria** | `/api/auditoria/sessao/:id` | `GET` | `auditoria.service.ts` | Trilha de Auditoria Forense | ✅ Integrado |

---

## 3. Conformidade com Invariantes Clínicos (RN01 a RN05)

* **RN01 (Modo Livre sem Persistência):** Sessões em modo livre possuem `paciente_id = null`. O backend e frontend tratam o fluxo sem gravar em prontuário clínico.
* **RN02 (Tipagem Estrita de Métrica):** Manifesto de jogos auditado; rejeição com HTTP 422 para métricas incompatíveis.
* **RN03 (Contexto DDA no Início da Sessão):** `ModalPreSessao` injeta parâmetros de estresse inicial e gatilhos sensoriais antes do início dos eventos de telemetria.
* **RN04 (Isolamento por Vínculo Institucional):** Prontuários e resultados protegidos por checagem em `terapeuta_paciente` e `clinica_id`, retornando HTTP 403 em acessos indevidos.
* **RN05 (Inalterabilidade e Soft Delete):** Proibido `hard delete` físico em registros clínicos; trigger de banco e flags lógicas ativas.

---

## 4. Governança da Variável de Mock (`VITE_USE_MOCK_DATA`)

A infraestrutura foi configurada para operar em modo dual:
* **Quando `VITE_USE_MOCK_DATA=true`:** Os serviços utilizam diretamente as fixtures de `bdmock.ts`. Isso viabiliza desenvolvimento offline, demonstrações rápidas e execução de testes em ambiente desacoplado.
* **Quando `VITE_USE_MOCK_DATA=false`:** Os serviços efetuam requisições HTTP reais para o servidor Express (`http://localhost:3000/api`) e conectam ao WebSocket em tempo real. Se o backend estiver temporariamente indisponível, o mecanismo `withFallback` entra em ação, prevenindo falhas na interface do usuário.
