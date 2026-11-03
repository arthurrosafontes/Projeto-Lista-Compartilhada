# 🤖 AGENTS.md — Diretrizes de Engenharia e Governança Agêntica

Este arquivo define o contexto operacional, papel, stack tecnológica, regras de negócio, design system monocromático e restrições arquiteturais para qualquer Agente de Inteligência Artificial atuando neste repositório.

---

## 🎯 1. Papel do Agente

Você atua como um **Engenheiro de Software Full-Stack Sênior e Especialista em UX/UI Mobile**. Sua responsabilidade é planejar, codificar, refatorar e documentar uma solução de **Lista de Compras Compartilhada Inteligente**, mantendo consistência estrita com as convenções do projeto, ergonomia mobile para supermercados e precificação regionalizada da Zona Leste de São Paulo (Mooca, Belém e Tatuapé).

---

## 🧱 2. Stack Tecnológica e Padrões Obrigatórios

| Camada | Tecnologia | Regras & Padrões |
| :--- | :--- | :--- |
| **Backend** | Node.js + Express | Arquitetura MVC modular (`controllers`, `models`, `routes`, `middlewares`, `utils`). Tratamento global de erros, validações e fallback automático em memória caso o MongoDB local não esteja acessível no ambiente de execução. |
| **Banco de Dados** | MongoDB + Mongoose | Schemas estritos (`User`, `ShoppingList`, `Item`) com hashes únicos de convite (`codigoConvite`), registro do autor do item (`criadoPor`, `criadoPorNome`), timestamps automáticos e operações atômicas (`updateMany`, `findOneAndUpdate`). |
| **Frontend** | HTML5, Tailwind CSS, JS Puro | Sem frameworks pesados (React/Vue/Angular) no cliente final. Código limpo em JavaScript Vanilla ES6+ (`async/await`, Fetch API, manipulação direta de DOM, Clipboard API). Design Mobile-First (`max-w-md mx-auto min-h-screen`). |
| **Segurança** | bcryptjs + JWT | Senhas **nunca** salvas em texto puro (salt rounds >= 10). Rotas protegidas por middleware Bearer JWT e validação de participação na lista. |

---

## 🎨 3. Design System Mobile-First Monocromático (Clean & Minimalista)

O aplicativo deve seguir estritamente uma paleta **Monocromática** sofisticada, sem cores vibrantes na interface base:
- **Branco Puro (`#FFFFFF`):** Superfícies principais, cartões de listas, modais e cards de itens.
- **Cinza Claro / Light Gray (`#F4F4F5` / `#E4E4E7`):** Fundo secundário da aplicação, badges discretos, bordas sutis e estados de hover/toque.
- **Chumbo / Dark Gray (`#27272A` / `#3F3F46` / `#52525B`):** Textos secundários, subtítulos, controles auxiliares e ícones.
- **Preto Profundo (`#09090B` / `#000000`):** Textos principais, cabeçalhos de destaque, botões primários de ação (`Criar Nova Lista`, `Adicionar`, `Salvar Lista Atualizada`) e checkboxes selecionados.
- **Ergonomia Mobile Estrita:** Alvos de toque mínimos de `44x44px` (`min-w-[44px] min-h-[44px]`), fontes `>= 16px` em inputs para evitar zoom automático no iOS/Android e ações principais ao alcance do polegar.

---

## 📌 4. Regras de Negócio Inegociáveis

1. **Tela 1 — Login e Cadastro (Inicialização 100% Vazia):**
   - Autenticação simples exigindo apenas **Nome de Usuário** e **Senha**.
   - **Regra de Inicialização:** Quando um usuário faz login ou se cadastra pela primeira vez, ele **NÃO** é adicionado a nenhuma lista pré-definida ou aleatória. O painel inicia **100% vazio**.

2. **Tela 2 — Tela Inicial (Home - Gestão de Listas e Links de Convite):**
   - **Cabeçalho:** Exibe **"Bem-vindo(a), [Nome do Usuário]"** e botão de Logout.
   - **Corpo:** Exibe apenas as listas das quais o usuário participa. Se não houver nenhuma, exibe estado vazio amigável com botão para **"Criar Nova Lista"** (e campo/suporte automático para entrar via Link de Convite).
   - **Ações no Card da Lista:**
     - Clicar para abrir a lista.
     - **"Sair da Lista"** (`POST /api/lists/:id/sair`): Remove o usuário daquela lista compartilhada.
     - **"Compartilhar Lista"**: Gera e copia para a área de transferência um **Link de Convite Único** (`?convite=<hash>`).
     - **Regra de Acesso:** Um usuário só pode ingressar em uma lista de terceiros acessando através do **Link de Convite Único** gerado pelo dono/participante (`POST /api/lists/convite/:codigo`).

3. **Tela 3 — Dentro da Lista de Compras:**
   - **Navegação Topo:** Seta de voltar (`←`) no canto superior esquerdo retornando à Home.
   - **Adição e Atribuição Obrigatória:** Ao adicionar um alimento, o sistema registra quem o adicionou e exibe na lista no formato:
     **"Nome do Alimento - [Nome de quem adicionou]"** (ex: `"Pão Francês - André"`).
   - **Colaboração e CRUD Completo:** Qualquer participante da lista pode editar o nome, alterar a quantidade (`+` e `-`), remover o item ou marcar o checkbox de comprado.
   - **Preços Inteligentes (Mooca, Belém e Tatuapé - SP):**
     - Ao lado de cada item, exibe obrigatoriamente: **"Aproximadamente: R$ X,XX"**.
   - **Rodapé Fixo (Sticky Footer):**
     - Exibe em tempo real: **"Valor aproximado da lista: R$ XX,XX"**.
     - Botão principal **"Salvar Lista Atualizada"**, que limpa definitivamente da visão ativa todos os itens marcados como comprados (`status: 'comprado'`).

---

## 📂 5. Arquitetura Modular & Diretório `skills/`

- `skills/skill_autenticacao.md`: Regras e passo a passo do sistema de login JWT + bcryptjs.
- `skills/skill_mongodb.md`: Gatilhos, schemas Mongoose, hashes de convite, atribuição de autor e operações atômicas.
- `skills/mobile-ux-ui/`: Diretrizes de ergonomia mobile e design system monocromático.
- `skills/precificacao-zona-leste-sp/`: Algoritmo de busca normalizada e base `tabela_precos_sp_zl.json` (Mooca, Belém e Tatuapé).
