# Catálogo de Requisitos Funcionais (RF01 a RF21) — InTEA

> **Projeto:** InTEA — Interface do Terapeuta para Orquestração do Ecossistema de Games Terapêuticos  
> **Instituição:** Sistemas de Informação — Universidade Federal do Piauí (UFPI)  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) (Seção 5.1, Páginas 7 a 9)  
> **Hub de Navegação:** [Índice Geral](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/README.md)

---

## 1. Visão Geral dos Requisitos Funcionais

Os Requisitos Funcionais (RF) definem as capacidades comportamentais, operações de dados e serviços clínicos oferecidos pela interface web e pela API de retaguarda do InTEA. Cada requisito está associado a atores específicos, regras de negócio e critérios de aceite mensuráveis.

> [!IMPORTANT]
> **Regra de Homologação Soberana:** Todas as caixas de verificação de critérios de aceite abaixo permanecem obrigatoriamente desmarcadas (`[ ]`) para validação e auditoria manual pelo usuário no ambiente de testes.

---

## 2. Catálogo Detalhado de RF01 a RF21

### RF01 — Autenticação de Terapeutas
* **Descrição Oficial:** O sistema deve permitir o cadastro e login de terapeutas com credenciais seguras e verificação de perfil.
* **Atores:** Terapeuta, SuperAdmin.
* **Camada:** Backend (`api/auth/`, `api/terapeuta/`), Frontend (`features/auth/`), Supabase Auth.
* **Critérios de Aceite:**
  * [ ] Login via `POST /api/terapeuta/login` com e-mail e senha, retornando token JWT e metadados do terapeuta.
  * [ ] Bloqueio de acesso para contas marcadas com `status_ativo = false`, retornando `403 Forbidden`.
  * [ ] Retorno de código `401 Unauthorized` para credenciais inválidas ou e-mail inexistente.

---

### RF02 — Gerenciamento de Sessões Ativas e Logout
* **Descrição Oficial:** O sistema deve permitir o gerenciamento das sessões ativas do profissional, viabilizando encerramento seguro e controle de acesso simultâneo.
* **Atores:** Terapeuta, SuperAdmin.
* **Camada:** Backend (`api/auth/`), Frontend (`features/auth/store/`).
* **Critérios de Aceite:**
  * [ ] Endpoint `POST /api/auth/logout` para revogação do token ativo da sessão atual.
  * [ ] Invalidação imediata do token no cliente (limpeza do `localStorage` e stores de estado).
  * [ ] Rejeição de requisições com tokens revogados ou expirados.

---

### RF03 — Controle de Acesso e Persistência via Refresh Token
* **Descrição Oficial:** O sistema deve permitir o controle de acesso via *refresh token*, garantindo a persistência transparente da autenticação sem deslogar o usuário em tarefas clínicas ativas.
* **Atores:** Terapeuta.
* **Camada:** Backend (`api/auth/routes/auth.routes.ts`), Frontend (`shared/utils/request.ts`).
* **Critérios de Aceite:**
  * [ ] Rotação automática de tokens no endpoint `POST /api/auth/refresh`.
  * [ ] Fila de espera de requisições no `HttpClient` do frontend quando múltiplos requests concorrentes recebem 401.
  * [ ] Redirecionamento automático para a tela de login apenas quando o *refresh token* for inválido ou expirado.

---

### RF04 — Gestão de Perfil do Terapeuta
* **Descrição Oficial:** O sistema deve permitir ao profissional visualizar e editar suas informações cadastrais (nome, telefone, registro de classe/CRM/CRP e especialidades).
* **Atores:** Terapeuta, SuperAdmin.
* **Camada:** Backend (`api/terapeuta/`), Frontend (`features/settings/`).
* **Critérios de Aceite:**
  * [ ] Consulta do perfil em `GET /api/terapeuta/:id` retornando apenas colegas da mesma clínica ou o próprio usuário (**RN04**).
  * [ ] Atualização via `PUT /api/terapeuta/:id` protegida pelo `meMiddleware`, impedindo alteração de perfil de terceiros (**Anti-IDOR**).
  * [ ] Sanitização estrita impedindo o usuário comum de alterar `clinica_id`, `is_super_admin`, `email` ou `status_ativo`.

---

### RF05 — Gestão de Preferências e Configurações da Conta
* **Descrição Oficial:** O sistema deve permitir gerenciar preferências visuais e operacionais da aplicação clínica (tema visual, idioma e densidade de informação).
* **Atores:** Terapeuta.
* **Camada:** Frontend (`features/settings/store/settingsStore.ts`).
* **Critérios de Aceite:**
  * [ ] Persistência de tema claro/escuro/sistema no `localStorage` via Zustand `persist`.
  * [ ] Aplicação imediata de classes CSS utilitárias no elemento raiz sem recarregar a página.
  * [ ] Preservação das preferências mesmo após o logout e retorno do terapeuta.

---

### RF06 — Cadastro Sociodemográfico e Clínico de Pacientes
* **Descrição Oficial:** O sistema deve permitir o registro e gestão de novos pacientes, armazenando dados sociodemográficos e clínicos essenciais. O paciente atua exclusivamente como entidade de registro no sistema, sem possuir credenciais ou acesso direto à plataforma.
* **Atores:** Terapeuta, SuperAdmin.
* **Camada:** Backend (`api/paciente/`), Frontend (`features/patients/`), Banco (`paciente`, `dados_clinicos`, `responsavel`).
* **Critérios de Aceite:**
  * [ ] Cadastro completo em `POST /api/paciente` contendo nome, data de nascimento, CPF validado, contatos e dados clínicos.
  * [ ] Auto-vínculo imediato do terapeuta criador na tabela `terapeuta_paciente` para garantir acesso subsequente (**RN04**).
  * [ ] Forçamento incondicional do `clinica_id` do usuário logado contra tentativas de falsificação de instituição.
  * [ ] Exclusão exclusivamente lógica via `DELETE /api/paciente/:id` com `status_ativo = false` (**RN05**).

---

### RF07 — Gestão Administrativa Global (SuperAdmin)
* **Descrição Oficial:** O sistema deve dispor de um perfil com privilégios de administrador geral, capaz de gerenciar terapeutas, clínicas e pacientes em escala multi-institucional.
* **Atores:** SuperAdmin.
* **Camada:** Backend (`core/middlewares/admin.middleware.ts`), Banco (`terapeuta.is_super_admin`).
* **Critérios de Aceite:**
  * [ ] Bloqueio de rotas administrativas com `403 Forbidden` para qualquer usuário que não possua `is_super_admin = true`.
  * [ ] Capacidade de reativar profissionais inativados via `PATCH /api/terapeuta/:id/reativar`.
  * [ ] Visualização irrestrita de todas as clínicas e profissionais cadastrados.

---

### RF08 — Auditoria de Vínculos e Acessos Institucionais
* **Descrição Oficial:** O sistema deve permitir auditar os vínculos e acessos aos prontuários clínicos dentro da clínica, registrando data, hora, profissional e operação efetuada.
* **Atores:** SuperAdmin, Terapeuta Responsável.
* **Camada:** Backend (`core/middlewares/`, `api/auditoria/`), Banco (`auditoria_acesso`).
* **Critérios de Aceite:**
  * [ ] Registro imutável contendo `terapeuta_id`, `paciente_id`, ação executada, IP e timestamp exato (**RNF05**).
  * [ ] Consulta de logs de auditoria restrita a usuários autorizados.
  * [ ] Proibição de exclusão física ou mutação manual dos registros da trilha de auditoria.

---

### RF09 — Catálogo e Biblioteca de Jogos Terapêuticos
* **Descrição Oficial:** O sistema deve exibir um catálogo dos jogos terapêuticos compatíveis, informando nome, versão, descrição clínica, público-alvo, objetivos e status de instalação (instalado, desatualizado, não instalado, em execução).
* **Atores:** Terapeuta.
* **Camada:** Backend (`api/jogos/`), Frontend (`features/jogos/`), Banco (`jogo`).
* **Critérios de Aceite:**
  * [ ] Listagem via `GET /api/jogos` com filtros por objetivo clínico e status de instalação.
  * [ ] Consulta detalhada do manifesto técnico do jogo via `GET /api/jogos/:id` (**Contrato 1**).
  * [ ] Validação obrigatória da presença de `tipo_metrica` para cada métrica declarada no manifesto (**RN02**).

---

### RF10 — Pareamento Remoto via Session Token
* **Descrição Oficial:** O sistema deve permitir que o jogo seja executado em um dispositivo externo (ex.: tablet do paciente), vinculando-se à sessão ativa por meio de um código de pareamento seguro e efêmero (*session token*).
* **Atores:** Terapeuta, Jogo Externo (Tablet).
* **Camada:** Backend (`api/sessao/`, `core/websocket/`), Frontend (`features/sessao/`).
* **Critérios de Aceite:**
  * [ ] Geração de PIN alfanumérico amigável (formato `XXX-XXX`) com tempo de expiração de 15 minutos (TTL).
  * [ ] Validação do PIN sem necessidade de autenticação no endpoint público `GET /api/sessao/:token/status`.
  * [ ] Retorno de `410 Gone` caso o token tenha ultrapassado o TTL sem pareamento.
  * [ ] Handshake bem-sucedido alterando o status da sessão para `em_andamento` e notificando a interface web via WebSocket.

---

### RF11 — Modo Livre sem Persistência Clínica
* **Descrição Oficial:** O sistema deve permitir a execução de um jogo sem vínculo a uma sessão clínica oficial, para uso como entretenimento lúdico puro, sem gravação de telemetria em prontuário ou acionamento de IA.
* **Atores:** Terapeuta, Paciente/Família.
* **Camada:** Backend (`api/sessao/`), Frontend (`features/jogos/`), Banco (`sessao`).
* **Critérios de Aceite:**
  * [ ] Início com `modo_sessao = 'modo_livre'` e `paciente_id = NULL` (**RN01**).
  * [ ] Bloqueio absoluto de persistência de eventos de telemetria na tabela de prontuário do paciente.
  * [ ] Desativação do envio de dados ao Agente de IA para cálculo de DDA.
  * [ ] Acesso à sessão restrito exclusivamente ao terapeuta que a criou ou SuperAdmin (`sessaoMiddleware`).

---

### RF12 — Gestão e Seleção de Contexto da Sessão
* **Descrição Oficial:** O sistema deve permitir a seleção integrada do paciente atendido e do jogo terapêutico a ser executado na intervenção.
* **Atores:** Terapeuta.
* **Camada:** Frontend (`features/sessao/`), Backend (`api/sessao/`).
* **Critérios de Aceite:**
  * [ ] Seleção restrita a pacientes com vínculo ativo com o terapeuta autenticado (**RN04**).
  * [ ] Seleção de jogos homologados e com manifesto técnico válido no banco de dados.
  * [ ] Pré-carregamento dos dados clínicos relevantes do paciente (gatilhos e histórico recente).

---

### RF13 — Ciclo de Vida da Sessão Terapêutica (FSM)
* **Descrição Oficial:** O sistema deve permitir iniciar, monitorar, pausar, finalizar e cancelar formalmente uma sessão terapêutica.
* **Atores:** Terapeuta.
* **Camada:** Backend (`api/sessao/controllers/sessao.controller.ts`), Frontend (`features/sessao/`).
* **Critérios de Aceite:**
  * [ ] Transições de estado controladas: `aguardando_pareamento` $\rightarrow$ `em_andamento` $\rightarrow$ `finalizada` (ou `cancelada`).
  * [ ] Finalização controlada em `PATCH /api/sessao/:id/finalizar` registrando o timestamp de encerramento (`data_hora_fim`).
  * [ ] Cancelamento em `DELETE /api/sessao/:id/cancelar` liberando as salas de WebSocket e invalidando o token.

---

### RF14 — Tela de Resultados e Relatório Analítico Consolidado
* **Descrição Oficial:** O sistema deve exibir, imediatamente ao final da sessão, os dados consolidados organizados por categorias clínicas e a síntese analítica gerada pelo Agente de IA.
* **Atores:** Terapeuta.
* **Camada:** Frontend (`features/resultado/`), Backend (`api/sessao/`, `api/relatorio/`).
* **Critérios de Aceite:**
  * [ ] Renderização dos cartões de métricas (tempo de foco, taxa de acertos, tempo médio de reação).
  * [ ] Exibição em destaque do parecer analítico e recomendações clínicas geradas pelo Agente de IA (**Contrato 4**).
  * [ ] Persistência do resultado na tabela `relatorio_sessao` estruturada em 3ª Forma Normal (**3FN**).

---

### RF15 — Prontuário Longitudinal e Linha do Tempo Evolutiva
* **Descrição Oficial:** O sistema deve exibir a linha do tempo cronológica de sessões do paciente, com gráficos comparativos gerados automaticamente a partir do tipo de métrica declarado.
* **Atores:** Terapeuta.
* **Camada:** Frontend (`features/historico/`), Backend (`api/paciente/`).
* **Critérios de Aceite:**
  * [ ] Linha do tempo longitudinal listando todas as intervenções anteriores do paciente.
  * [ ] Gráficos adaptativos (linhas para métricas contínuas, barras para categóricas) derivados de `metric_type` (**RNF04**).
  * [ ] Isolamento de prontuário exigindo vínculo em `terapeuta_paciente` e mesma clínica (**RN04**).

---

### RF16 — Bloco de Anotações Clínicas do Terapeuta
* **Descrição Oficial:** O sistema deve permitir ao terapeuta registrar anotações textuais livres de evolução associadas ao paciente e, opcionalmente, vinculadas a uma sessão específica.
* **Atores:** Terapeuta.
* **Camada:** Backend (`api/anotacao/`), Frontend (`features/anotacao/`).
* **Critérios de Aceite:**
  * [ ] Criação via `POST /api/anotacao` ou rotas sob paciente, gravando obrigatoriamente a autoria (`terapeuta_id`, **RF21**).
  * [ ] Edição em `PATCH /api/anotacao/:id` permitida exclusivamente ao terapeuta autor da anotação.
  * [ ] Exclusão estritamente lógica (`DELETE /api/anotacao/:id`) com `soft_delete = true` (**RN05**).
  * [ ] Consulta unificada na raiz via `GET /api/anotacao/:id`.

---

### RF17 — Configuração de Contexto Clínico Pré-Sessão para o DDA
* **Descrição Oficial:** O sistema deve permitir ao terapeuta informar variáveis de contexto prévio do paciente (nível de estresse no dia, gatilhos sensoriais a evitar, objetivo clínico específico) a serem transmitidas ao Agente de IA antes do início da sessão.
* **Atores:** Terapeuta.
* **Camada:** Frontend (`features/sessao/components/`), Backend (`api/sessao/`).
* **Critérios de Aceite:**
  * [ ] Formulário modal no início da sessão para preenchimento de estresse (escala de 1 a 5), gatilhos e foco clínico.
  * [ ] Envio obrigatório do pacote ao Agente de IA antes da liberação do primeiro evento de telemetria (**RN03**, **Contrato 3**).
  * [ ] Fallback clínico parametrizado caso o terapeuta opte por utilizar parâmetros padrão homologados.

---

### RF18 — Acompanhamento Multidisciplinar (Multi-terapeuta por Paciente)
* **Descrição Oficial:** O sistema deve permitir que múltiplos terapeutas de diferentes especialidades da mesma clínica acompanhem o mesmo paciente, compartilhando a visualização do histórico e prontuário completo.
* **Atores:** Terapeuta, SuperAdmin.
* **Camada:** Backend (`api/paciente/routes/paciente.routes.ts`), Banco (`terapeuta_paciente`).
* **Critérios de Aceite:**
  * [ ] Endpoints `GET /api/paciente/:id/terapeutas`, `POST /api/paciente/:id/terapeutas` e `DELETE /api/paciente/:id/terapeutas/:terapeutaId`.
  * [ ] Proteção institucional impedindo associação de terapeutas de clínicas divergentes (**RN04**).
  * [ ] Visualização do prontuário liberada para qualquer profissional com vínculo ativo na tabela associativa.

---

### RF19 — Busca Textual e Filtragem Avançada de Dados
* **Descrição Oficial:** O sistema deve fornecer mecanismos de busca textual e filtros combinados (por período, jogo, terapeuta responsável ou tipo de métrica) para localização ágil de sessões e registros.
* **Atores:** Terapeuta.
* **Camada:** Backend (Query Params em controllers REST), Frontend (barras de busca e paginação).
* **Critérios de Aceite:**
  * [ ] Busca de pacientes por nome parcial e CPF (com e sem formatação).
  * [ ] Filtro de jogos por objetivo clínico e status de instalação.
  * [ ] Paginação consistente com parâmetros `pagina` e `limite` em todas as listagens volumosas.

---

### RF20 — Exportação de Relatórios Clínicos Padronizados (PDF)
* **Descrição Oficial:** O sistema deve permitir a exportação dos relatórios individuais de sessão e do histórico longitudinal do paciente para formatos padronizados (PDF), viabilizando compartilhamento ético com famílias e arquivamento formal.
* **Atores:** Terapeuta.
* **Camada:** Backend (`api/sessao/:id/exportar`), Frontend (`features/resultado/components/`).
* **Critérios de Aceite:**
  * [ ] Geração de documento PDF com layout profissional, cabeçalho da clínica, dados do paciente, gráficos consolidados e parecer da IA.
  * [ ] Inclusão do nome completo e registro profissional do terapeuta autor (**RF21**).
  * [ ] Disponibilização de botão de impressão direta e download seguro no navegador.

---

### RF21 — Autoria Obrigatória de Registros Clínicos
* **Descrição Oficial:** O sistema deve garantir que todas as sessões terapêuticas, anotações de evolução e relatórios estejam inviolavelmente associados ao identificador do terapeuta responsável (`terapeuta_id`), extraído diretamente do token de autenticação JWT verificado.
* **Atores:** Sistema (Regra de Segurança de Servidor).
* **Camada:** Backend (`core/middlewares/auth.middleware.ts`, `services/`).
* **Critérios de Aceite:**
  * [ ] Extração incondicional do `terapeuta_id` a partir de `req.user.id` do token decodificado pelo Supabase Auth.
  * [ ] Rejeição imediata de payloads que tentem forjar ou sobrescrever o `terapeuta_id` no corpo da requisição.
  * [ ] Gravação do identificador do autor em chave estrangeira referencial no banco de dados.
