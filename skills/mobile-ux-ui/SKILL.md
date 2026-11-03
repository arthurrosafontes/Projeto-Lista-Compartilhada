---
name: mobile-ux-ui
description: Diretrizes de ergonomia mobile estrita, design system monocromático (Branco, Preto, Cinza Claro e Chumbo) e fluxo de compartilhamento por link único.
---

# 📱 SKILL: Mobile UX/UI Monocromático & Ergonomia para Supermercado

Esta skill estabelece os padrões obrigatórios de interface, estética minimalista monocromática e ergonomia mobile para a aplicação **Lista de Compras Compartilhada Inteligente**.

---

## 🎨 1. Paleta Monocromática Estrita

Toda a interface base deve utilizar exclusivamente tons acromáticos elegantes de alto contraste:
- **Branco (`#FFFFFF` / `bg-white`):** Fundo principal dos cartões, cabeçalhos, inputs ativos e rodapé fixo.
- **Cinza Claro (`#F4F4F5` / `bg-zinc-100`, `border-zinc-200`):** Fundo da aplicação, badges de preço e superfícies secundárias.
- **Chumbo (`#27272A` / `text-zinc-700`, `bg-zinc-800`):** Textos secundários, subtítulos, autor do item e botões de apoio.
- **Preto (`#09090B` / `bg-zinc-950`, `text-zinc-950`):** Títulos principais, botões primários (`Criar Nova Lista`, `Salvar Lista Atualizada`), checkboxes e destaques.

---

## 🎯 2. Ergonomia Mobile-First

1. **Container Smartphone:** `max-w-md mx-auto min-h-screen bg-zinc-50 text-zinc-950 flex flex-col shadow-xl border-x border-zinc-200 relative`.
2. **Alvos de Toque >= 44x44px:** Todos os botões (`←`, `+`, `-`, `Compartilhar Lista`, `Sair da Lista`, `Salvar Lista Atualizada` e checkboxes) respeitam `min-w-[44px] min-h-[44px]`.
3. **Fontes >= 16px em Inputs:** Impede zoom automático no iOS/Android.

---

## 🧭 3. Regras de Interface das 3 Telas

1. **Tela 1 (Login e Cadastro):**
   - Campos de Nome de Usuário e Senha.
   - Novos usuários iniciam com a Home **100% vazia** (sem listas pré-carregadas).
2. **Tela 2 (Home — Gestão de Listas):**
   - Saudação **"Bem-vindo(a), [Nome do Usuário]"** e botão de Logout.
   - Estado vazio elegante quando o usuário não participa de nenhuma lista, com botão **"Criar Nova Lista"** e campo para colar um Link/Código de Convite.
   - Cada card de lista exibe:
     - Clique para abrir a lista.
     - Botão **"Compartilhar Lista"** (copia o Link de Convite Único `?convite=HASH` para a área de transferência).
     - Botão **"Sair da Lista"**.
3. **Tela 3 (Dentro da Lista de Compras):**
   - Seta `←` no canto superior esquerdo.
   - Exibição obrigatória do autor ao lado do nome do alimento: **"Nome do Alimento - [Nome de quem adicionou]"** (ex: `"Pão Francês - André"`).
   - Exibição obrigatória do preço regional: **"Aproximadamente: R$ X,XX"**.
   - Sticky Footer com **"Valor aproximado da lista: R$ XX,XX"** e botão **"Salvar Lista Atualizada"**.
