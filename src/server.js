const path = require('path');
const dotenv = require('dotenv');

// Carrega variáveis do .env (ou .env.example caso .env ainda não exista)
dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.JWT_SECRET) {
  dotenv.config({ path: path.join(__dirname, '..', '.env.example') });
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'lista_compras_zl_jwt_secret_fallback_2026_9f8e7d6c5b4a';
}

const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const listRoutes = require('./routes/listRoutes');
const itemRoutes = require('./routes/itemRoutes');
const priceRoutes = require('./routes/priceRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do Frontend Mobile-First (public/)
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));
app.use('/public', express.static(publicPath));

// Rotas da API REST (com suporte a aliases PT/EN: /api/listas e /api/lists)
app.use('/api/auth', authRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/listas', listRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/itens', itemRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/precos', priceRoutes);

// Rota de Healthcheck
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      app: 'Lista de Compras Compartilhada Inteligente',
      regiaoPrecos: 'Mooca, Belém e Tatuapé (Zona Leste - SP)',
      status: 'online',
    },
  });
});

// Fallback SPA para o Frontend Mobile
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Middleware Global de Tratamento de Erros
app.use((err, req, res, next) => {
  console.error('❌ [Erro Express]:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erro interno no servidor.',
  });
});

async function iniciarServidor() {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log('============================================================');
    console.log(`🛒 Lista de Compras Compartilhada Inteligente (Zona Leste SP)`);
    console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
    console.log('============================================================');
  });
}

if (require.main === module) {
  iniciarServidor();
}

module.exports = app;
