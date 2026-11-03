# 🍃 SKILL: Modelagem, Gatilhos e Restrições MongoDB (Mongoose)

Esta skill define as diretrizes imperativas, schemas de dados, hashes de convite, índices, gatilhos de ciclo de vida (hooks) e regras de integridade para o banco de dados MongoDB utilizando o Mongoose no projeto **Lista de Compras Compartilhada**.

---

## 🎯 1. Princípios de Modelagem e Banco de Dados

1. **Inicialização Limpa por Usuário:**
   - Novos usuários iniciam sem nenhuma lista pré-atribuída (`GET /api/lists` filtra estritamente `{ participantes: req.user._id, ativa: true }`).
2. **Acesso a Listas de Terceiros Exclusivo via Link de Convite Único:**
   - Toda `ShoppingList` possui um campo `codigoConvite` (hash hexadecimal único indexado).
   - Um usuário só é adicionado ao array `participantes` de uma lista de terceiros ao acessar o endpoint de convite com esse `codigoConvite`.
3. **Rastreabilidade de Autor no Item (`criadoPor` + `criadoPorNome`):**
   - Cada item armazena o `ObjectId` e o nome do usuário que o adicionou para exibição imediata no formato **"Nome do Alimento - [Nome de quem adicionou]"**.
4. **Abordagem Sem Perda de Dados (Soft Delete / Status Pattern) & Atomicidade:**
   - Itens comprados recebem `status: 'comprado'`, `compradoPor` e `compradoEm` via `Item.updateMany` atômico, saindo imediatamente da visão ativa (`status: 'pendente'`).

---

## 🏗️ 2. Especificação das Coleções

### Coleção: `users` (Modelo `User`)
- `nome`: `String`, obrigatório, `unique: true`, `trim: true`, `minlength: 3`, `maxlength: 50`.
- `senha`: `String`, obrigatório, `select: false`, `minlength: 6`.
- Hook `pre('save')` com `bcryptjs` (`salt >= 10`) e método `comparePassword`.

### Coleção: `shoppinglists` (Modelo `ShoppingList`)
- `nome`: `String`, obrigatório, `trim: true`, `maxlength: 80`.
- `descricao`: `String`, `trim: true`.
- `codigoConvite`: `String`, `unique: true`, `index: true` (gerado automaticamente via `crypto.randomBytes(6).toString('hex')`).
- `criadoPor`: `mongoose.Schema.Types.ObjectId`, `ref: 'User'`, obrigatório.
- `participantes`: `[{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]`.
- `ativa`: `Boolean`, `default: true`.

### Coleção: `items` (Modelo `Item`)
- `listaId`: `mongoose.Schema.Types.ObjectId`, `ref: 'ShoppingList'`, obrigatório, `index: true`.
- `nome`: `String`, obrigatório, `trim: true`, `maxlength: 100`.
- `quantidade`: `Number`, `default: 1`, `min: 0.01`.
- `unidade`: `String`, `default: 'un'`.
- `categoria`: `String`, `default: 'Geral'`.
- `precoUnitario`: `Number`, `default: 8.90`.
- `precoTotalAproximado`: `Number`, `default: 8.90`.
- `marcadoParaCompra`: `Boolean`, `default: false`.
- `status`: `String`, `enum: ['pendente', 'comprado']`, `default: 'pendente'`, `index: true`.
- `criadoPor`: `mongoose.Schema.Types.ObjectId`, `ref: 'User'`, obrigatório.
- `criadoPorNome`: `String`, obrigatório, `trim: true` (ex: `"André"`).
- `compradoPor`: `mongoose.Schema.Types.ObjectId`, `ref: 'User'`, `default: null`.
- `compradoPorNome`: `String`, `default: null`.
- `compradoEm`: `Date`, `default: null`.
