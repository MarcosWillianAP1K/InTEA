# Catálogo de Requisitos Não-Funcionais (RNF01 a RNF07) — InTEA

> **Projeto:** InTEA — Interface do Terapeuta para Orquestração do Ecossistema de Games Terapêuticos  
> **Instituição:** Sistemas de Informação — Universidade Federal do Piauí (UFPI)  
> **Documento Mestre:** [Projeto_de_InTEA.pdf](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/Projeto_de_InTEA.pdf) (Seção 5.2, Página 9)  
> **Hub de Navegação:** [Índice Geral](file:///c:/Users/MWSS/OneDrive/Desktop/InTEA/docs/README.md)

---

## 1. Visão Geral dos Requisitos Não-Funcionais

Os Requisitos Não-Funcionais (RNF) especificam os critérios de qualidade, desempenho, segurança, conformidade legal e restrições arquiteturais que regem o comportamento da infraestrutura do InTEA. Cada requisito apresenta métricas quantitativas, Acordos de Nível de Serviço (SLA) e procedimentos de verificação.

> [!IMPORTANT]
> **Regra de Homologação Soberana:** Todas as caixas de verificação de critérios de aceite abaixo permanecem obrigatoriamente desmarcadas (`[ ]`) para validação e auditoria manual pelo usuário no ambiente de testes.

---

## 2. Catálogo Detalhado de RNF01 a RNF07

### RNF01 — Comunicação em Tempo Real e Baixa Latência
* **Descrição Oficial:** O envio de telemetria do jogo ao Agente de IA e ao painel InTEA deve ocorrer via canal persistente bidirecional (WebSocket / Socket.IO), e não por requisições pontuais bloqueantes em lote HTTP.
* **Métrica / SLA:**
  * Latência fim-a-fim de transmissão de pacotes de telemetria $\le 100\text{ ms}$ em conexões de rede padrão.
  * Capacidade de processamento de até **20 eventos por segundo por sessão ativa** sem acúmulo de fila ou perda de pacotes.
* **Mecanismo Técnico:** Socket.IO rodando em namespaces isolados (`/sessao`) com salas efêmeras indexadas pelo `session_token`.
* **Critérios de Verificação:**
  * [ ] Estabelecimento de handshake WebSocket em menos de 500 ms após a digitação do PIN.
  * [ ] Streaming contínuo de métricas sem travamento da interface visual (React 19).
  * [ ] Disparo de alerta imediato no painel web caso a latência exceda o limiar aceitável.

---

### RNF02 — Modularidade e Interoperabilidade por Contratos Padronizados
* **Descrição Oficial:** Toda a troca de informações entre o Jogo Externo, o Agente de IA e a Interface web do terapeuta deve obrigatoriamente utilizar esquemas padronizados em formato JSON, versionados e validados por esquemas técnicos.
* **Métrica / SLA:**
  * 100% dos pacotes trafegados em conformidade com as especificações dos Contratos 1, 2, 3 e 4.
  * Rejeição imediata com código **`422 Unprocessable Entity`** de qualquer payload fora do esquema definido.
* **Mecanismo Técnico:** DTOs estritos em TypeScript, validadores estruturais e esquemas versionados em `docs/ModelosDeContratos/`.
* **Critérios de Verificação:**
  * [ ] Validação estrita do manifesto do jogo (`Contrato 1`) na inicialização.
  * [ ] Rejeição de telemetria que omita atributos clínicos essenciais (`timestamp`, `session_token`).
  * [ ] Serialização e desserialização tipadas sem conversões arbitrárias ou uso de `any`.

---

### RNF03 — Dependência de Conectividade e Resiliência a Quedas Transitórias
* **Descrição Oficial:** O sistema não deve oferecer modo terapêutico offline quando em sessão clínica, visto que o motor de Ajuste Dinâmico de Dificuldade (DDA) depende do fluxo contínuo de telemetria em tempo real; em contrapartida, deve fornecer mecanismos robustos de reconexão automática e tolerância a oscilações de sinal.
* **Métrica / SLA:**
  * Janela de tolerância a quedas transitórias de conexão de **60 segundos** (`SessaoReconnectionManager`).
  * Expiração do PIN de pareamento (*TTL*) em exatamente **15 minutos** para tokens não consumidos.
* **Mecanismo Técnico:** Mecanismo de heartbeat (ping/pong) a cada 5 segundos, buffers em memória no cliente e gerenciador de reconexão no backend.
* **Critérios de Verificação:**
  * [ ] Retenção do estado da sessão na interface web durante quedas breves de Wi-Fi (< 60s).
  * [ ] Finalização graciosa ou cancelamento automático da sessão caso o dispositivo remoto não retorne em 60s.
  * [ ] Emissão do código `410 Gone` para tentativas de pareamento com tokens com TTL expirado.

---

### RNF04 — Geração Automática de Visualizações por Tipo de Métrica
* **Descrição Oficial:** Os gráficos de evolução do paciente na tela de resultados e no histórico devem ser gerados dinamicamente com base no atributo `metric_type` (numérico contínuo, ordinal discreto, categórico, booleano) declarado no manifesto do jogo, sem exigir recodificação ou acoplamento da interface para cada novo jogo adicionado ao catálogo.
* **Métrica / SLA:**
  * Suporte a 100% dos tipos canônicos de métricas clínicas sem falhas de renderização.
  * **Proibição absoluta de fallback automático** para tipo categórico quando o tipo for omitido ou inválido (**RN02**).
* **Mecanismo Técnico:** Componentes visuais polimórficos no frontend que inspecionam o manifesto e selecionam o renderizador adequado (linhas temporais, barras ou sparklines).
* **Critérios de Verificação:**
  * [ ] Renderização de gráfico de linha contínua para métricas numéricas (ex.: tempo de reação em ms).
  * [ ] Renderização de gráfico de barras/frequência para métricas categóricas ou níveis discretos.
  * [ ] Rejeição no upload/cadastro de manifestos com métricas sem `tipo_metrica` explícito.

---

### RNF05 — Rastreabilidade, Não-Repúdio e Auditoria Clínica
* **Descrição Oficial:** Toda criação, alteração ou exclusão de registros clínicos (sessões, prontuários, anotações de evolução) deve registrar compulsoriamente a autoria do profissional responsável (`terapeuta_id`), o IP de origem e os carimbos de data/hora (*timestamps*) com fuso horário UTC padronizado.
* **Métrica / SLA:**
  * 100% dos registros de banco contendo campos auditáveis `created_at` e `updated_at` imutáveis.
  * Bloqueio físico definitivo de hard delete em tabelas clínicas via triggers de banco (**RN05**).
* **Mecanismo Técnico:** Triggers PostgreSQL (`impedir_hard_delete_clinico`), campos `TIMESTAMPTZ` e middlewares de captura de identidade autenticada (`authMiddleware`).
* **Critérios de Verificação:**
  * [ ] Tentativas de execução de `DELETE FROM relatorio_sessao` ou `DELETE FROM anotacao_clinica` abortadas pelo banco com erro de violação de integridade.
  * [ ] Inclusão do `terapeuta_id` validado pelo token JWT em todas as entidades geradas.
  * [ ] Registro auditável de logs de acesso a prontuários médicos para fins de compliance.

---

### RNF06 — Segurança da Informação e Conformidade com a LGPD
* **Descrição Oficial:** A plataforma deve garantir o mais alto nível de proteção para dados de saúde sensíveis de crianças e adolescentes no espectro autista, atendendo integralmente aos preceitos da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e às melhores práticas da OWASP API Security Top 10 (2023).
* **Métrica / SLA:**
  * Criptografia em trânsito com TLS 1.3 / HTTPS e WSS obrigatórios em todas as conexões externas.
  * Chaves e credenciais administrativas (`SUPABASE_SERVICE_ROLE_KEY`) estritamente isoladas no ambiente privado do backend.
  * Proibição de exposição de identificadores sequenciais ou dados pessoais (PII) em URLs públicas.
* **Mecanismo Técnico:** UUID v4 para todas as chaves primárias e estrangeiras, isolamento multi-tenant por clínica via `clinica_id`, políticas ativas de Row Level Security (RLS) no PostgreSQL e sanitização preventiva anti-IDOR.
* **Critérios de Verificação:**
  * [ ] Ocultação de hashes de senha e tokens nos retornos da API.
  * [ ] Rejeição com `403 Forbidden` de tentativas de acesso a prontuários de outras clínicas (**RN04**).
  * [ ] Armazenamento de laudos médicos em bucket privado do Supabase Storage com acesso exclusivo via URLs assinadas de curta duração (60s).

---

### RNF07 — Responsividade e Acessibilidade da Interface do Usuário
* **Descrição Oficial:** A aplicação web deve ser responsiva, garantindo usabilidade ergonômica e conforto visual tanto em monitores de alta resolução em consultórios clínicos quanto em tablets e smartphones utilizados por terapeutas em sessões móveis ou domiciliares.
* **Métrica / SLA:**
  * Adaptação fluida a resoluções de tela variando de **360px** (mobile) a **1920px+** (desktops UltraWide).
  * Taxa de contraste visual em conformidade com as diretrizes WCAG 2.1 nível AA para sistemas de saúde.
* **Mecanismo Técnico:** Tailwind CSS v4 com design token system (`@theme inline`), Radix UI com acessibilidade nativa (teclado e leitor de telas) e hooks responsivos (`use-mobile.ts`).
* **Critérios de Verificação:**
  * [ ] Menu lateral retrátil (*SidebarProvider*) colapsando automaticamente em telas móveis.
  * [ ] Toque mínimo de 44x44px para botões e controles operados em tablets clínicos.
  * [ ] Sem quebras de layout ou transbordamento horizontal de página (*overflow-x*) em qualquer dispositivo.
