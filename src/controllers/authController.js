const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { isMongoConnected } = require('../config/database');
const {
  memoryStore,
  carregarStoreDoDisco,
  salvarStoreNoDisco,
  gerarObjectIdHex,
  revogarToken,
} = require('../utils/memoryStore');

function gerarTokenJWT(user) {
  const secret = process.env.JWT_SECRET || 'lista_compras_zona_leste_sp_secret_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    {
      id: String(user._id),
      nome: user.nome,
      jti: gerarObjectIdHex(),
    },
    secret,
    { algorithm: 'HS256', expiresIn }
  );
}

/**
 * POST /api/auth/register
 * Cria novo usuário com lista de compras estritamente vazia []
 */
async function register(req, res) {
  try {
    carregarStoreDoDisco();
    const nome = String(req.body.nome || '').trim();
    const senha = String(req.body.senha || '');

    if (nome.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'O nome de usuário deve ter pelo menos 3 caracteres.',
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'A senha deve ter pelo menos 6 caracteres.',
      });
    }

    if (isMongoConnected()) {
      const usuarioExistente = await User.findOne({
        nome: { $regex: new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });

      if (usuarioExistente) {
        return res.status(400).json({
          success: false,
          error: 'Este nome de usuário já está em uso.',
        });
      }

      const novoUsuario = await User.create({ nome, senha });
      const token = gerarTokenJWT(novoUsuario);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: String(novoUsuario._id),
          nome: novoUsuario.nome,
          lists: [],
        },
        data: {
          token,
          user: {
            id: String(novoUsuario._id),
            nome: novoUsuario.nome,
            lists: [],
          },
        },
      });
    }

    // Armazenamento em memória
    const existeMem = memoryStore.users.find(
      (u) => u.nome.toLowerCase() === nome.toLowerCase()
    );
    if (existeMem) {
      return res.status(400).json({
        success: false,
        error: 'Este nome de usuário já está em uso.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    const novoMemUser = {
      _id: gerarObjectIdHex(),
      nome,
      senha: senhaHash,
      lists: [],
      createdAt: new Date().toISOString(),
    };
    memoryStore.users.push(novoMemUser);
    salvarStoreNoDisco();

    const token = gerarTokenJWT(novoMemUser);
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: String(novoMemUser._id),
        nome: novoMemUser.nome,
        lists: [],
      },
      data: {
        token,
        user: {
          id: String(novoMemUser._id),
          nome: novoMemUser.nome,
          lists: [],
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao registrar usuário.',
    });
  }
}

/**
 * POST /api/auth/login
 * Autentica o usuário; se não existir e autoRegister !== false, cria com listas: []
 */
async function login(req, res) {
  try {
    carregarStoreDoDisco();
    const nome = String(req.body.nome || '').trim();
    const senha = String(req.body.senha || '');
    const autoRegister = req.body.autoRegister !== false;

    if (nome.length < 3 || senha.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Informe um nome (mín. 3 letras) e senha (mín. 6 caracteres).',
      });
    }

    if (isMongoConnected()) {
      let user = await User.findOne({
        nome: { $regex: new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      }).select('+senha');

      if (!user) {
        if (autoRegister) {
          user = await User.create({ nome, senha });
          const token = gerarTokenJWT(user);
          return res.status(201).json({
            success: true,
            isNewUser: true,
            token,
            user: {
              id: String(user._id),
              nome: user.nome,
              lists: [],
            },
            data: {
              token,
              user: {
                id: String(user._id),
                nome: user.nome,
                lists: [],
              },
            },
          });
        }
        return res.status(401).json({
          success: false,
          error: 'Nome ou senha incorretos.',
        });
      }

      const senhaValida = await user.comparePassword(senha);
      if (!senhaValida) {
        return res.status(401).json({
          success: false,
          error: 'Nome ou senha incorretos.',
        });
      }

      const token = gerarTokenJWT(user);
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: String(user._id),
          nome: user.nome,
        },
        data: {
          token,
          user: {
            id: String(user._id),
            nome: user.nome,
          },
        },
      });
    }

    // Armazenamento em memória
    let memUser = memoryStore.users.find(
      (u) => u.nome.toLowerCase() === nome.toLowerCase()
    );

    if (!memUser) {
      if (autoRegister) {
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        memUser = {
          _id: gerarObjectIdHex(),
          nome,
          senha: senhaHash,
          lists: [],
          createdAt: new Date().toISOString(),
        };
        memoryStore.users.push(memUser);
        salvarStoreNoDisco();

        const token = gerarTokenJWT(memUser);
        return res.status(201).json({
          success: true,
          isNewUser: true,
          token,
          user: {
            id: String(memUser._id),
            nome: memUser.nome,
            lists: [],
          },
          data: {
            token,
            user: {
              id: String(memUser._id),
              nome: memUser.nome,
              lists: [],
            },
          },
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Nome ou senha incorretos.',
      });
    }

    const senhaCorreta = await bcrypt.compare(senha, memUser.senha);
    if (!senhaCorreta) {
      return res.status(401).json({
        success: false,
        error: 'Nome ou senha incorretos.',
      });
    }

    const token = gerarTokenJWT(memUser);
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: String(memUser._id),
        nome: memUser.nome,
      },
      data: {
        token,
        user: {
          id: String(memUser._id),
          nome: memUser.nome,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao realizar login.',
    });
  }
}

/**
 * POST /api/auth/logout
 * Invalida imediatamente o token JWT da sessão no backend
 */
async function logout(req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        revogarToken(token);
      }
    }
    return res.status(200).json({
      success: true,
      data: { message: 'Sessão invalidada com sucesso.' },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Erro ao encerrar sessão.',
    });
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user,
    data: req.user,
  });
}

module.exports = {
  register,
  login,
  logout,
  getMe,
};
