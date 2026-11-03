---
name: precificacao-zona-leste-sp
description: Regras de armazenamento, busca normalizada por similaridade e cálculo de preços médios de supermercados da Mooca, Belém e Tatuapé (Zona Leste de São Paulo - SP).
---

# 💰 SKILL: Precificação Regional — Zona Leste SP (Mooca, Belém e Tatuapé)

Esta skill define a arquitetura e o algoritmo de cálculo de preços aproximados para os itens da **Lista de Compras Compartilhada Inteligente**, baseando-se na média praticada pelas principais redes varejistas e atacarejos dos bairros **Mooca**, **Belém** e **Tatuapé** em São Paulo - SP.

---

## 🏪 1. Redes de Referência Regional

Os preços médios consolidados em `references/tabela_precos_sp_zl.json` refletem a cesta de produtos praticada nas unidades locais de:
- **Sonda Supermercados** (Unidades Mooca / Tatuapé)
- **Supermercados Chama** (Unidades Belém / Mooca / Tatuapé)
- **Carrefour Hiper & Market** (Celso Garcia - Belém / Salim Farah Maluf - Tatuapé)
- **Pão de Açúcar / Minuto Pão de Açúcar** (Tatuapé / Mooca)
- **Supermercado Dia** (Mooca / Belém / Tatuapé)
- **Atacadão & Assaí Atacadista** (Marginal Tietê / Aricanduva / Radial Leste)

---

## 🧮 2. Algoritmo de Busca por Similaridade e Normalização

Quando um usuário adiciona ou edita o nome de um alimento (ex: `"Arroz"`, `"arroz 5kg"`, `"Leite Integral"`, `"Pão Francês"`), o sistema deve calcular o preço unitário aproximado seguindo estas etapas:

### Etapa 1: Normalização de Texto
Converter a string digitada pelo usuário e as chaves/sinônimos do catálogo para um formato canônico:
```javascript
function normalizarTexto(texto = '') {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, ' ')    // Remove pontuação especial
    .replace(/\s+/g, ' ')
    .trim();
}
```

### Etapa 2: Matching em Camadas (Prioridade de Busca)
1. **Match Exato:** O termo normalizado coincide exatamente com o `nomeNormalizado` ou qualquer item da lista de `sinonimos` do produto na tabela.
2. **Match por Inclusão Direta (Substring):** O termo digitado contém a palavra-chave principal do produto (ex: `"leite desnatado italac"` dá match com `"leite desnatado"` ou `"leite"`), priorizando a correspondência mais específica (maior número de palavras coincidentes).
3. **Match por Tokens (Palavras-Chave):** Divide o termo digitado em tokens e pontua o produto da tabela com maior interseção de tokens relevantes.
4. **Fallback Padrão (Item Inédito):** Caso nenhum alimento da base tenha similaridade com o termo digitado, aplica-se o valor médio padrão (`precoFallbackPadrao`: **R$ 8,90**), garantindo que nenhum item fique sem estimativa financeira.

---

## 💵 3. Regra de Cálculo e Exibição Obrigatória

1. **Cálculo por Item:**
   $$\text{Preço Total do Item} = \text{Preço Unitário Médio Regional} \times \text{Quantidade}$$
2. **Exibição no Card do Item:**
   - Ao lado do nome do alimento, exibir sempre:
     **`Aproximadamente: R$ X,XX`** (formatado com vírgula decimal brasileira).
3. **Cálculo do Rodapé da Lista:**
   - Somatório de $(\text{Preço Unitário} \times \text{Quantidade})$ de todos os itens presentes na lista ativa:
     **`Valor aproximado da lista: R$ XX,XX`**
4. **Recálculo Automático:**
   - Sempre que a quantidade mudar (`+` ou `-`) ou o nome do alimento for editado, o backend e o frontend atualizam imediatamente o valor aproximado do item e o somatório do rodapé.
