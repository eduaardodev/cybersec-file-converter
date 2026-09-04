# File System Converter — Full Stack com Foco em Segurança, Auditoria e Alta Concorrência

> **Projeto Acadêmico Demonstrativo:** Plataforma full stack para conversão segura de arquivos com resiliência, governança de concorrência e proteção contra vetores de ataque comuns em sistemas distribuídos.

---

## 1. Visão Geral do Projeto

O **File System Converter** foi projetado para demonstrar como construir uma aplicação web robusta, auditável e resiliente capaz de lidar com requisições concorrentes e tráfego intenso sem comprometer a segurança ou degradar a infraestrutura.

A aplicação oferece conversão assíncrona entre diversos formatos de arquivo comuns (**CSV, JSON, Markdown, HTML, TXT, PDF, YAML**) sob um modelo de **Zero-Trust File Ingestion**, onde nenhum arquivo é aceito ou executado sem passar por validações criptográficas, estruturais e de permissão.

---

## 2. Arquitetura da Aplicação

O sistema adota uma arquitetura full-stack moderna e desacoplada:

```
[ Frontend: React 18 + Vite + Tailwind CSS ]
                  │
                  ▼  (JWT Bearer / Multipart-Form / JSON)
[ Camada de Entrada & Middleware: Express ]
   ├── Request Correlation Logger (X-Request-Id)
   ├── Sliding Window Rate Limiter (Multi-Tier)
   ├── Auth Middleware (JWT + Bcrypt)
   └── Centralized Error Handling (Redaction Barrier)
                  │
         ┌────────┴────────┐
         ▼                 ▼
[ File Security Engine ]  [ Conversion Queue / Concurrency Governor ]
  - Path Traversal Guard     - Fila assíncrona de workers em memória
  - Extension Whitelist      - Limite global de 4 workers simultâneos
  - MIME Verification        - Limite de 2 conversões ativas por usuário
  - Null Byte Scan           - Timeouts por tarefa e descarte controlado
         │                 │
         ▼                 ▼
[ Storage Isolado ]       [ Registry de Conversores ]
  - ./storage/uploads/       - CSV ⇄ JSON
  - ./storage/converted/     - Markdown → HTML
  (Nomes UUID seguros)      - TXT → PDF / TXT → HTML
                            - JSON ⇄ YAML
                  │
                  ▼
[ Camada de Persistência & Auditoria: SQLite / sql.js ]
  - Queries 100% parametrizadas (Prepared Statements)
  - Trilha de auditoria permanente
  - Registro de eventos de segurança com IPs anonimizados via SHA-256
```

---

## 3. Tecnologias Utilizadas

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide React, Vite.
- **Backend:** Node.js, Express, TypeScript (`tsx` em desenvolvimento, `esbuild` em produção).
- **Banco de Dados:** SQLite (`sql.js` WASM engine) com queries preparadas parametrizadas (`?` / `$1`).
- **Segurança & Criptografia:** `bcryptjs` (salt 10 rounds), `jsonwebtoken`, `crypto` (hashing SHA-256).
- **Motor de Conversão:** `pdfkit` (geração de PDF vetorial), `marked` (processamento de Markdown), `js-yaml` (YAML parser).
- **Testes & Automação:** Suíte de testes automatizados integrada em TypeScript (`assert`).

---

## 4. Como Executar Localmente

### Pré-requisitos
- Node.js 18+ (ou Docker)
- NPM

### Método 1: Execução com Node.js / NPM

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Popular o banco de dados com dados para demonstração:**
   ```bash
   npm run seed
   ```

3. **Executar a suíte de testes de segurança e conversão:**
   ```bash
   npm test
   ```

4. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:3000`

---

### Método 2: Execução com Docker

1. **Construir e subir o container:**
   ```bash
   docker compose up --build
   ```
   Acesse no navegador: `http://localhost:3000`

---

## 5. Credenciais Padrão para Demonstração

O banco de dados pré-semeado (`npm run seed`) disponibiliza um usuário com perfil de administrador:

- **E-mail:** `demo@converter.local`
- **Senha:** `Demo1234!`
- **Perfil:** `admin`

> *Dica:* Na interface, ao clicar em **"Demo Account"** no cabeçalho ou no botão **"Fill Demo"** no modal de login, as credenciais são preenchidas e autenticadas instantaneamente em 1 clique.

---

## 6. Mecanismos de Segurança Implementados

### 6.1 Proteção contra SQL Injection (SQLi)
- **Princípio:** O código **nunca concatena** strings em comandos SQL.
- **Implementação:** Toda e qualquer consulta utiliza prepared statements com vinculação de parâmetros (`SELECT * FROM users WHERE email = ?`, `[email]`).
- **Resultado:** Mesmo se o usuário submeter `' OR '1'='1` ou `; DROP TABLE users;`, o motor do banco de dados trata o texto exclusivamente como um valor escalar literal, impossibilitando a manipulação da Árvore Sintática Abstrata (AST) do SQL.

### 6.2 Rate Limiting em Múltiplas Camadas (Sliding Window)
- **Autenticação:** 5 tentativas por 60 segundos por IP (mitigação de força bruta).
- **Upload de Arquivos:** 10 uploads por 60 segundos por usuário/IP.
- **Conversões:** 20 requisições por 60 segundos.
- **Endpoint de Teste (Demo):** 5 requisições por 10 segundos para demonstração visual em tempo real do status HTTP 429 com contadores de reset.

### 6.3 Zero-Trust File Upload & Defesa contra Path Traversal
- **Path Traversal Barrier:** Rejeição de `../`, `..\`, caminhos absolutos (`/etc/`, `C:\`) e injeção de byte nulo (`\0`).
- **Sanitização de Nomes:** Os arquivos físicos no disco são gravados sob nomes UUID (`c3f29b4e-...`) em diretórios privados fora da raiz pública.
- **Lista Branca de Extensões:** Apenas formatos permitidos (`.csv`, `.json`, `.md`, `.txt`, `.yaml`).
- **Lista Negra de Executáveis:** Bloqueio direto de `.exe`, `.sh`, `.bat`, `.cmd`, `.py`, `.php`, etc.
- **Cota de Tamanho:** Limite rígido de 10 MB por arquivo.
- **Detecção de Conteúdo Nulo:** Verificação de bytes nulos em buffers de texto puro para evitar execução de payloads disfarçados.

### 6.4 Tratamento Centralizado de Erros (Leak Redaction Barrier)
- **Contrato Único:** Todas as respostas de erro seguem o esquema `{ error: { code, message, details? } }`.
- **Prevenção de Vazamento:** Em caso de exceções internas (HTTP 500), stack traces, caminhos de diretórios do servidor (`/app/server/...`) e credenciais de banco de dados são **redigidos**. O cliente recebe apenas uma mensagem sanitizada opaca, enquanto o erro real é registrado de forma segura nos logs internos do servidor.

### 6.5 Auditoria e Anonimização de Dados
- **Hash de IP:** Os endereços IP dos clientes não são salvos em formato legível; passam por um hash criptográfico **SHA-256** truncado, garantindo conformidade com normas de privacidade (LGPD/GDPR) mantendo rastreabilidade para investigação de abusos.
- **Sanitização de Metadados:** Senhas, tokens JWT e buffers de arquivos são automaticamente filtrados antes de qualquer persistência no log de auditoria.

---

## 7. Estratégia de Concorrência e Resiliência

Para evitar exaustão de CPU e travamento do Node.js por operações intensivas de conversão e parsing:

1. **Fila Assíncrona de Workers:** As requisições de conversão não bloqueiam o ciclo de resposta HTTP. A rota `POST /api/conversions` valida permissões, coloca a tarefa na fila com prioridade e responde imediatamente com `HTTP 202 Accepted` acompanhado do ID do Job.
2. **Governança de Concorrência Global:** O sistema executa no máximo **4 workers em paralelo**. Se novos trabalhos chegarem, aguardam na fila de prontos.
3. **Governança por Usuário:** Cada usuário pode ter no máximo **2 conversões ativas em paralelo**, impedindo que um único usuário monopolize a capacidade do servidor.
4. **Timeouts por Tarefa:** Cada conversão tem um tempo limite estrito de 30 segundos. Tarefas que excedem o tempo limite são canceladas e limpas para evitar "memory leaks" ou processos zumbis.

---

## 8. Roteiro Sugerido para Apresentação Acadêmica

### Etapa 1: Visão Geral e Arquitetura (2 minutos)
- Abrir a aplicação e mostrar o cabeçalho com o status dos defensores ativos.
- Explicar brevemente o objetivo do projeto: converter arquivos com foco em resiliência, concorrência e segurança defensiva.

### Etapa 2: Conversão Real de Arquivo (2 minutos)
- Ir na aba **"Convert File"**.
- Clicar em um dos botões de exemplo rápido: **"CSV Sample"**.
- Selecionar o formato de destino: **"JSON"**.
- Clicar em **"Convert Now"**.
- Observar a transição visual das 5 etapas: *1. Uploading → 2. Validating → 3. Queued → 4. Converting → 5. Completed*.
- Clicar em **"Download File"** para comprovar o arquivo resultante transformado.

### Etapa 3: Laboratório de Segurança e Auditoria (5 minutos) — Ponto Central!
Acessar a aba **"Security & Audit Demo"**:

1. **Módulo 1: SQL Injection Guard**
   - Selecionar o payload `' OR '1'='1`.
   - Clicar em **"Execute Defense Verification"**.
   - Mostrar o pipeline: a entrada é vinculada como parâmetro `$1`, a query executada retorna 0 linhas e a tabela permanece segura, comparando com o que aconteceria em uma query vulnerável.

2. **Módulo 2: Rate Limiter Blast**
   - Escolher **10 Reqs** ou **20 Reqs**.
   - Clicar em **"Launch Requests"**.
   - Observar a barra de requisições: as primeiras 5 são aceitas (200 OK em verde), e as seguintes são imediatamente bloqueadas com status **429 Too Many Requests** (em vermelho).

3. **Módulo 3: File Upload Sandbox**
   - Clicar nos cenários maliciosos:
     - **Path Traversal** (`../../../../etc/shadow`) → Bloqueado pelo filtro de caminhos.
     - **Executable Payload** (`trojan_payload.exe`) → Bloqueado pela lista negra de extensões.
     - **Oversized Archive** (25 MB) → Bloqueado pela cota de 10 MB.
   - Mostrar os 4 checkpoints de segurança avaliados pelo pipeline.

4. **Módulo 4: Error Sanitization**
   - Clicar em **"500 Internal Error (Sanitization Test)"**.
   - Mostrar como o backend redige informações sensíveis (senhas, caminhos de arquivo) e retorna um JSON limpo e seguro ao cliente.

5. **Módulo 5: Trilha de Auditoria em Tempo Real**
   - Clicar em **"5. Audit & Security Trail"**.
   - Mostrar os eventos registrados durante os testes anteriores com hash de IP, data/hora e metadados sanitizados.
   - Mostrar a seção de **"Security Threat Interceptions"** com os alertas de ameaça interceptados.

### Etapa 4: Testes Automatizados no Terminal (1 minuto)
- Abrir o terminal e executar:
  ```bash
  npm test
  ```
- Mostrar os **18 testes automatizados** passando com sucesso:
  - 3 testes de proteção contra SQL Injection
  - 5 testes de segurança de upload e path traversal
  - 3 testes de autenticação e hashing bcrypt
  - 6 testes de integridade do motor de conversão
  - 1 teste de sanitização e anonimização da trilha de auditoria.

---

## 9. Estrutura de Diretórios

```
├── server.ts                       # Ponto de entrada do servidor Express & Vite
├── Dockerfile                      # Definição do container Docker
├── docker-compose.yml              # Orquestração do container
├── server/
│   ├── auth/                       # Serviço de autenticação & middleware JWT
│   ├── converters/                 # Registry & implementações de conversão
│   ├── db/                         # DatabaseService com SQLite & queries parametrizadas
│   ├── errors/                     # Centralized AppError & error handler
│   ├── logger/                     # Structured Request Logger & correlation IDs
│   ├── queue/                      # Fila assíncrona de concorrência com workers
│   ├── routes/                     # Rotas da API (auth, files, conversions, audit, demo)
│   ├── security/                   # FileSecurity & RateLimiter sliding window
│   ├── services/                   # AuditService & eventos de segurança
│   ├── tests/                      # Suíte de testes automatizados
│   └── seed.ts                     # Script de semeadura de dados
├── src/                            # Frontend React 18 + Tailwind
│   ├── components/                 # Header, Sidebar, Dashboard, Converter, History, SecurityDemo
│   ├── services/                   # Typed API Client
│   └── types/                      # Interfaces TypeScript do cliente
└── storage/                        # Armazenamento privado (uploads & converted)
```

---

## 10. Licença e Uso Acadêmico

Desenvolvido para fins de estudo, demonstração acadêmica e pesquisa sobre arquiteturas de software resilientes, auditáveis e de alta concorrência.
