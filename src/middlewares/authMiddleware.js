const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isMongoConnected } = require('../config/database');
const {
  memoryStore,
  carregarStoreDoDisco,
  isTokenRevogado,
} = require('../utils/memoryStore');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Acesso não autorizado. Token ausente.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Acesso não autorizado. Token inválido.',
      });
    }

    carregarStoreDoDisco();

    if (isTokenRevogado(token)) {
      return res.status(401).json({
        success: false,
        error: 'Sessão encerrada. Faça login novamente.',
      });
    }

    const secret = process.env.JWT_SECRET || 'lista_compras_zona_leste_sp_secret_key_2026';
    const decoded = jwt.verify(token, secret);

    if (isMongoConnected()) {
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Sessão inválida. Usuário não encontrado.',
        });
      }
      req.user = {
        _id: String(user._id),
        id: String(user._id),
        nome: user.nome,
      };
      req.token = token;
      return next();
    }

    const memUser = memoryStore.users.find(
      (u) => String(u._id) === String(decoded.id)
    );
    if (!memUser) {
      return res.status(401).json({
        success: false,
        error: 'Sessão inválida. Usuário não encontrado.',
      });
    }

    req.user = {
      _id: String(memUser._id),
      id: String(memUser._id),
      nome: memUser.nome,
    };
    req.token = token;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Sua sessão expirou. Faça login novamente.',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Token inválido ou adulterado.',
    });
  }
}

module.exports = authMiddleware;
