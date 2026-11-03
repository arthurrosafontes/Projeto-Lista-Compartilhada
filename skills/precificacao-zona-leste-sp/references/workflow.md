# 🔄 Workflow de Precificação Regional (Mooca, Belém e Tatuapé)

Este documento define o fluxo operacional que o backend e o frontend seguem para precificar cada item da lista de compras.

---

## Passo 1: Carregamento da Base de Preços
- No startup do servidor Node.js, o módulo utilitário `src/utils/precificadorZL.js` lê e indexa em memória o arquivo `skills/precificacao-zona-leste-sp/references/tabela_precos_sp_zl.json`.

## Passo 2: Criação de Item (`POST /api/lists/:listId/items`)
1. O usuário envia `{ nome, quantidade }`.
2. O backend chama `obterPrecoAproximado(nome)`.
3. A função retorna `{ precoUnitario, categoriaSugerida, unidadeSugerida, origemMatch }`.
4. O item é salvo no banco com `precoUnitario` e `precoTotalAproximado = Number((precoUnitario * quantidade).toFixed(2))`.

## Passo 3: Edição de Item ou Quantidade (`PATCH /api/items/:id`)
1. Se o campo `nome` foi alterado, o backend recalcula `precoUnitario` consultando `obterPrecoAproximado(novoNome)`.
2. Se `quantidade` foi alterada via botões `+` ou `-`, o backend recalcula `precoTotalAproximado = Number((precoUnitario * novaQuantidade).toFixed(2))`.
3. A API retorna o item atualizado e o frontend atualiza instantaneamente o badge `"Aproximadamente: R$ X,XX"` e o rodapé `"Valor aproximado da lista: R$ XX,XX"`.

## Passo 4: Consulta Direta de Preço (`GET /api/prices/estimate?nome=...`)
- Endpoint auxiliar para permitir preview instantâneo ou consulta da tabela completa de preços médios da região Mooca/Belém/Tatuapé.
