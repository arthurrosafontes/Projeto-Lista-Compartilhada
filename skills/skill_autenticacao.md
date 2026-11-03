# 🔐 SKILL: Sistema de Autenticação Simplificada

Esta skill define as regras imperativas, arquitetura e o passo a passo obrigatório para qualquer Agente de IA implementar, refatorar ou auditar o módulo de autenticação do projeto **Lista de Compras Compartilhada**.

---

## 🎯 1. Princípios e Regras Inegociáveis

1. **Credenciais Mínimas:** O sistema exige **estritamente** `nome` (username) e `senha`. Não adicione campos de e-mail, telefone, recuperação social ou 2FA, a menos que explicitamente solicitado.
2. **Segurança de Senhas:**
   - Senhas **nunca** transitam desprotegidas ou são salvas em texto puro no banco.
   - Utilizar `bcryptjs` com fator de custo (*salt rounds*) de no mínimo `10` (recomendado: `12`).
   - O campo `senha` no Mongoose deve possuir `select: false` para evitar vazamento acidental em consultas `find()`.
3. **Mecanismo de Sessão:**
   - Baseado em **JSON Web Token (JWT)** assinado com algoritmo `HS256`.
   - Payload mínimo do JWT: `{ id: user._id, nome: user.nome }`.
   - Expiração padrão recomendada: `7d` (foco em usabilidade móvel contínua no supermercado sem deslogar frequentemente).
4. **Respostas Padronizadas da API:**
   - Sucesso: `{ success: true, token: "...", user: { id: "...", nome: "..." } }`
   - Falha: `{ success: false, error: "Mensagem descritiva" }` com status HTTP semântico (`400`, `401`, `403`).

---

## 📋 2. Passo a Passo Imperativo de Implementação

Ao receber a tarefa de implementar ou alterar a autenticação, o agente **DEVE** seguir esta sequência:

### Passo 1: Modelo de Usuário (`src/models/User.js`)
- Criar o Schema com validações estritas (`nome` único, sem espaços extras nas bordas, tamanho mínimo de 3 caracteres; `senha` com tamanho mínimo de 6 caracteres).
- Implementar gancho `pre('save')` para criptografar a senha caso tenha sido modificada.
- Implementar método de instância `comparePassword(candidatePassword)` que encapsula `bcrypt.compare`.

### Passo 2: Controlador de Autenticação (`src/controllers/authController.js`)
Implementar as seguintes funções:
1. **`register`:**
   - Sanitizar entradas (`nome.trim()`).
   - Verificar se `nome` já está em uso (`User.findOne({ nome })`). Se sim, retornar status `400` com erro amigável.
   - Criar usuário com `User.create({ nome, senha })`.
   - Gerar token JWT e responder status `201`.
2. **`login`:**
   - Buscar usuário pelo nome explicitando a seleção da senha: `User.findOne({ nome }).select('+senha')`.
   - Se não encontrar ou a senha for inválida, responder status `401` com `"Nome ou senha incorretos"`.
   - Gerar token JWT e responder status `200`.
3. **`getMe` (opcional/validação de sessão):**
   - Retornar os dados do usuário autenticado a partir de `req.user`.

### Passo 3: Middleware de Proteção (`src/middlewares/authMiddleware.js`)
- Extrair o token do cabeçalho `Authorization` no formato `Bearer <token>` (ou opcionalmente de cookies assinados).
- Se ausente, retornar `401 Unauthorized` com `{ success: false, error: "Acesso não autorizado. Token ausente." }`.
- Verificar o token usando `jwt.verify(token, process.env.JWT_SECRET)`.
- Localizar o usuário no banco: `const user = await User.findById(decoded.id)`. Se não existir, retornar `401`.
- Injetar o usuário na requisição: `req.user = user;` e chamar `next()`.

### Passo 4: Rotas do Express (`src/routes/authRoutes.js`)
- Mapear:
  - `POST /api/auth/register` -> `authController.register`
  - `POST /api/auth/login` -> `authController.login`
  - `GET /api/auth/me` -> `[authMiddleware, authController.getMe]`

### Passo 5: Cliente Frontend (JavaScript Vanilla)
- Armazenar o JWT no `localStorage` sob a chave `auth_token` e os dados do usuário em `user_data`.
- Criar wrapper utilitário `fetchWithAuth(url, options)`:
  - Injetar automaticamente `headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }`.
  - Se a resposta for `401`, limpar o armazenamento e redirecionar para a tela/modal de login.
- Se o usuário já possuir token válido salvo ao carregar a página, pular a tela de login e carregar diretamente a lista.

---

## ⚠️ 3. Tratamento de Exceções e Casos de Borda

- **Tokens expirados ou adulterados:** O middleware deve capturar `JsonWebTokenError` e `TokenExpiredError`, retornando mensagem clara de sessão expirada.
- **Caracteres especiais no nome:** Aplicar `.trim()` e sanitização contra injeção de scripts no frontend e backend.
- **Ausência de JWT_SECRET:** Se `process.env.JWT_SECRET` não estiver configurado, a aplicação deve falhar no startup com erro explícito no console, impedindo execuções vulneráveis.
