# 🔄 Workflow de Implementação e Validação Mobile UX/UI

Este documento descreve o fluxo de verificação passo a passo que o agente deve seguir ao construir ou atualizar o frontend da aplicação.

---

## Passo 1: Estrutura Base e Design Clean (`public/index.html`)
1. Configurar `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />`.
2. Garantir espaçamentos generosos, cantos arredondados (`rounded-2xl`), sombras sutis e alvos de toque mínimos de `44x44px`.
3. Estruturar as 3 telas independentes (`#screen-auth`, `#screen-home`, `#screen-list`) garantindo que apenas uma tela esteja visível por vez.

## Passo 2: Fluxo de Navegação entre as 3 Telas
1. **Tela 1 (Login/Cadastro) -> Tela 2 (Home):**
   - Autenticar com Nome de Usuário e Senha (`POST /api/auth/login` ou `/api/auth/register`).
   - Redirecionar obrigatoriamente para a **Tela 2 (Home)** exibindo **"Bem Vindo, [Nome do Usuário]"**.
2. **Tela 2 (Home) — Gestão e "Sair da Lista":**
   - Listar todas as listas compartilhadas das quais o usuário participa (`GET /api/lists`).
   - Permitir criar ou ingressar em uma lista (`POST /api/lists`).
   - Permitir sair de uma lista (`POST /api/lists/:id/sair`) através do botão **"Sair da lista"**, removendo o usuário daquela lista compartilhada imediatamente.
3. **Tela 3 (Dentro da Lista) -> Tela 2 (Home):**
   - O botão com seta `←` no canto superior esquerdo retorna imediatamente para a Tela Inicial atualizando os contadores.

## Passo 3: Uso no Mercado e Funcionalidades Inteligentes
1. **Adicionar Alimento (Texto, Chip 1-Toque ou Voz `🎙️`):** Calcula o preço médio da região Mooca/Belém/Tatuapé e exibe **"Aproximadamente: R$ X,XX"** ao lado do item.
2. **Editar Nome / Quantidade (`+` e `-`):** Recalcula instantaneamente o subtotal do item e o somatório do rodapé.
3. **Alternar Modo Corredores:** Agrupa visualmente os itens por setor do supermercado para otimizar o percurso nos corredores.
4. **Salvar Lista Atualizada (Sticky Footer):** Exibe **"Valor aproximado da lista: R$ XX,XX"** e, ao clicar em **"Salvar Lista Atualizada"**, remove definitivamente todos os itens marcados como comprados e sincroniza a lista limpa para todos os participantes.
