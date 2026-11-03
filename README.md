# 🛒 Lista de Compras Compartilhada Inteligente — Zona Leste SP

Aplicativo web **Mobile-First**, com design system **Monocromático Clean (Branco, Preto, Cinza Claro e Chumbo)**, construído com **Node.js, Express, MongoDB (Mongoose)** e **HTML5, Tailwind CSS e JavaScript Puro (Vanilla ES6+)** para gerenciamento colaborativo de listas de compras com cálculo automático de preços médios praticados nos supermercados dos bairros **Mooca, Belém e Tatuapé (São Paulo - SP)**.

---

## 🎨 Design System Monocromático & UX Mobile

- **Paleta Estrita:**
  - **Branco (`#FFFFFF`):** Superfícies principais, cartões de listas, inputs ativos e rodapé fixo.
  - **Cinza Claro (`#F4F4F5` / `#E4E4E7`):** Fundo geral da aplicação, badges de preço aproximado e botões secundários.
  - **Chumbo (`#27272A` / `#52525B`):** Textos secundários, subtítulos e controles auxiliares.
  - **Preto (`#09090B` / `#000000`):** Títulos principais, botões primários de ação (`Criar Nova Lista`, `+ Adicionar`, `Salvar Lista Atualizada`) e checkboxes selecionados.
- **Ergonomia Mobile:** Alvos de toque mínimos de `44x44px` (`min-w-[44px] min-h-[44px]`), fontes `>= 16px` nos campos de texto para impedir zoom forçado no celular e navegação ao alcance do polegar.

---

## ✨ Regras de Negócio e Fluxo de Telas

### 1. Tela 1 — Login e Cadastro (`#screen-auth`)
- Autenticação direta utilizando apenas **Nome de Usuário** e **Senha** (`bcryptjs` + JWT).
- **Regra de Inicialização Vazia:** Quando um usuário faz login ou se cadastra pela primeira vez, ele **NÃO** é adicionado a nenhuma lista pré-definida ou aleatória. O painel inicia **100% vazio**.

### 2. Tela 2 — Tela Inicial / Gestão de Listas (`#screen-home`)
- **Cabeçalho:** Exibe **`"Bem-vindo(a), [Nome do Usuário]"`** e botão de Logout (`Sair`).
- **Estado Vazio Amigável:** Caso o usuário não participe de nenhuma lista, exibe mensagem clara indicando que a área está vazia com botão de destaque **`+ Criar Nova Lista`**.
- **Ações no Card da Lista:**
  - Clicar no card para abrir a lista.
  - **`🔗 Compartilhar Lista`:** Gera um **Link de Convite Único** (`http://localhost:3000/?convite=<hash>`) e copia automaticamente para a área de transferência (`navigator.clipboard.writeText`) para envio via WhatsApp, Instagram, etc.
  - **`Sair da Lista`:** Remove o usuário daquela lista compartilhada (`POST /api/lists/:id/sair`).
- **Regra de Acesso a Listas de Terceiros:** Um usuário só pode entrar na lista de outra pessoa acessando através do **Link de Convite Único** gerado pelo dono/participante (`POST /api/lists/convite/:codigo` ou abrindo a URL `?convite=<hash>`).

### 3. Tela 3 — Dentro da Lista de Compras (`#screen-list`)
- **Navegação Topo:** Seta de voltar (`←`) no canto superior esquerdo retornando à Home.
- **Adição e Atribuição Obrigatória de Autor:** Ao adicionar um alimento, o sistema registra quem o adicionou e exibe na lista no formato:
  **`"Nome do Alimento - [Nome de quem adicionou]"`** (ex: `"Pão Francês - André"`).
- **Colaboração Completa:** Qualquer participante da lista pode editar o nome do item, alterar a quantidade nos botões `-` e `+`, remover itens (`✕`) ou marcar o checkbox de comprado.
- **Preços Inteligentes (Mooca, Belém e Tatuapé):** Ao lado de cada item, exibe obrigatoriamente **`"Aproximadamente: R$ X,XX"`**.
- **Rodapé Fixo (Sticky Footer):** Exibe **`"Valor aproximado da lista: R$ XX,XX"`** e o botão **`"Salvar Lista Atualizada"`**, que limpa definitivamente os itens marcados como comprados.

---

## 🚀 Toque Especial ("Fator Uau" no Mercado)

1. **📊 Resumo de Pedidos por Participante & Comparador Zona Leste:**
   - Exibe o subtotal de itens já colocados no carrinho (`🛒 No Carrinho: R$ XX,XX`) com barra de progresso monocromática.
   - Mostra a **divisão de pedidos por participante** (quantos itens e qual valor aproximado cada membro adicionou na lista).
   - Compara o valor estimado da lista entre **Atacarejo** (*Assaí / Atacadão*), **Varejo de Bairro** (*Sonda / Chama*) e **Premium** (*Pão de Açúcar*).
2. **🧭 Modo Setores do Supermercado (`🧭 Setores`):**
   - Agrupa os alimentos por corredor (*Hortifruti, Açougue, Laticínios, Padaria, Mercearia, Bebidas, Limpeza & Higiene*) com 1 toque.
3. **🎙️ Ditado por Voz ("Mãos Livres") + Chips Rápidos de 1 Toque:**
   - Permite adicionar alimentos falando pelo microfone do celular (`Web Speech API pt-BR`) ou tocando nos chips de sugestão rápida.

---

## 🛠️ Como Executar Localmente

### 1. Instalar as dependências:
```bash
npm install
```

### 2. Configurar as variáveis de ambiente (`.env`):
```bash
cp .env.example .env
```

### 3. Iniciar o servidor:
```bash
npm start
```
Acesse no navegador: **`http://localhost:3000`**

---

## 🔌 Endpoints da API REST

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Cria uma nova conta com `nome` e `senha` (inicia com 0 listas) |
| `POST` | `/api/auth/login` | Autentica o usuário e retorna o token JWT |
| `GET` | `/api/lists` | Retorna apenas as listas das quais o usuário participa |
| `POST` | `/api/lists` | Cria uma nova lista com hash único `codigoConvite` |
| `GET` | `/api/lists/:id/convite` | Obtém o `codigoConvite` único da lista para compartilhamento |
| `POST` | `/api/lists/convite/:codigo` | Ingressa em uma lista compartilhada através do Link/Código de Convite Único |
| `POST` | `/api/lists/:id/sair` | Remove o usuário atual da lista compartilhada |
| `GET` | `/api/lists/:id` | Retorna a lista e seus itens ativos com `criadoPorNome` |
| `POST` | `/api/lists/:listId/items` | Adiciona alimento registrando `criadoPorNome` e calculando preço regional ZL |
| `PATCH` | `/api/items/:id` | Edita nome, altera quantidade (`+`/`-`) ou marca/desmarca checkbox |
| `DELETE` | `/api/items/:id` | Remove um item da lista |
| `POST` | `/api/lists/:listId/salvar` | **"Salvar Lista Atualizada"**: dá baixa atômica nos itens marcados como comprados |
