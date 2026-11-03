const crypto = require('crypto');
const ShoppingList = require('../models/ShoppingList');
const Item = require('../models/Item');
const { isMongoConnected } = require('../config/database');
const {
  memoryStore,
  carregarStoreDoDisco,
  salvarStoreNoDisco,
  gerarObjectIdHex,
  gerarHashConvite,
} = require('../utils/memoryStore');

function extrairCodigoDeConvite(input = '') {
  const texto = String(input || '').trim();
  if (!texto) return '';

  // Se o usuário colou a URL completa (ex: https://.../convite/abc ou ?convite=abc)
  const matchQuery = texto.match(/[?&]convite=([a-zA-Z0-9_-]+)/i);
  if (matchQuery && matchQuery[1]) return matchQuery[1].toLowerCase();

  const matchPath = texto.match(/\/convite\/([a-zA-Z0-9_-]+)/i);
  if (matchPath && matchPath[1]) return matchPath[1].toLowerCase();

  return texto.toLowerCase();
}

/**
 * GET /api/lists ou GET /api/listas
 * Retorna ESTRITAMENTE as listas onde o ID do usuário autenticado consta em `participantes`.
 * Novos usuários iniciam com array de listas 100% vazio [].
 */
async function getLists(req, res) {
  try {
    const userIdStr = String(req.user._id || req.user.id);

    if (isMongoConnected()) {
      const listas = await ShoppingList.find({
        ativa: true,
        participantes: req.user._id,
      })
        .sort({ updatedAt: -1 })
        .lean();

      const listaIds = listas.map((l) => l._id);
      const itensPendentes = listaIds.length
        ? await Item.find({ listaId: { $in: listaIds }, status: 'pendente' }).lean()
        : [];

      const resultado = listas.map((lista) => {
        const itensDaLista = itensPendentes.filter(
          (i) => String(i.listaId) === String(lista._id)
        );
        const valorTotalAproximado = Number(
          itensDaLista
            .reduce((acc, item) => acc + (Number(item.precoTotalAproximado) || 0), 0)
            .toFixed(2)
        );

        return {
          ...lista,
          id: String(lista._id),
          codigoConvite: lista.codigoConvite,
          quantidadePendentes: itensDaLista.length,
          quantidadeParticipantes: Array.isArray(lista.participantes)
            ? lista.participantes.length
            : 1,
          valorTotalAproximado,
        };
      });

      return res.status(200).json({
        success: true,
        data: resultado,
      });
    }

    // Fallback em memória com isolamento estrito por participante
    carregarStoreDoDisco();

    const resultadoMem = memoryStore.lists
      .filter((l) => {
        if (l.ativa === false) return false;
        const parts = Array.isArray(l.participantes) ? l.participantes.map(String) : [];
        return parts.includes(userIdStr);
      })
      .map((lista) => {
        const itensDaLista = memoryStore.items.filter(
          (i) => String(i.listaId) === String(lista._id) && i.status === 'pendente'
        );
        const valorTotalAproximado = Number(
          itensDaLista
            .reduce((acc, item) => acc + (Number(item.precoTotalAproximado) || 0), 0)
            .toFixed(2)
        );

        return {
          ...lista,
          id: String(lista._id),
          codigoConvite: lista.codigoConvite,
          quantidadePendentes: itensDaLista.length,
          quantidadeParticipantes: Array.isArray(lista.participantes)
            ? lista.participantes.length
            : 1,
          valorTotalAproximado,
        };
      });

    return res.status(200).json({
      success: true,
      data: resultadoMem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao buscar listas compartilhadas.',
    });
  }
}

/**
 * POST /api/lists ou POST /api/listas
 * Cria uma NOVA lista pertencente exclusivamente ao usuário atual, gerando um hash único de convite.
 */
async function createList(req, res) {
  try {
    const nome = String(req.body.nome || '').trim();
    const descricao = String(
      req.body.descricao || 'Preços médios: Mooca, Belém e Tatuapé'
    ).trim();
    const userIdStr = String(req.user._id || req.user.id);

    if (!nome) {
      return res.status(400).json({
        success: false,
        error: 'Informe um nome para criar a nova lista.',
      });
    }

    const codigoConvite = crypto.randomBytes(6).toString('hex');

    if (isMongoConnected()) {
      const novaLista = await ShoppingList.create({
        nome,
        descricao,
        codigoConvite,
        criadoPor: req.user._id,
        criadoPorNome: req.user.nome,
        participantes: [req.user._id],
        ativa: true,
      });

      return res.status(201).json({
        success: true,
        data: {
          ...novaLista.toObject(),
          id: String(novaLista._id),
          codigoConvite: novaLista.codigoConvite,
          quantidadePendentes: 0,
          quantidadeParticipantes: 1,
          valorTotalAproximado: 0,
        },
      });
    }

    // Fallback em memória
    carregarStoreDoDisco();

    const novaMemLista = {
      _id: gerarObjectIdHex(),
      nome,
      descricao,
      codigoConvite: gerarHashConvite(),
      criadoPor: userIdStr,
      criadoPorNome: req.user.nome,
      participantes: [userIdStr],
      ativa: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.lists.unshift(novaMemLista);

    // Sincroniza array lists do usuário se existir
    const memUser = memoryStore.users.find((u) => String(u._id) === userIdStr);
    if (memUser) {
      if (!Array.isArray(memUser.lists)) memUser.lists = [];
      if (!memUser.lists.includes(String(novaMemLista._id))) {
        memUser.lists.push(String(novaMemLista._id));
      }
    }

    salvarStoreNoDisco();

    return res.status(201).json({
      success: true,
      data: {
        ...novaMemLista,
        id: String(novaMemLista._id),
        quantidadePendentes: 0,
        quantidadeParticipantes: 1,
        valorTotalAproximado: 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao criar nova lista.',
    });
  }
}

/**
 * POST /api/listas/entrar, POST /api/lists/entrar, POST /api/lists/convite/:codigo ou POST /api/lists/entrar-convite
 * Regra de Acesso: Único meio pelo qual um usuário pode ingressar na lista de terceiros.
 * Vincula o ID do usuário autenticado ao array `participantes` da lista correspondente ao código.
 */
async function joinListByInvite(req, res) {
  try {
    const rawCodigo =
      req.params.codigo ||
      req.body.convite ||
      req.body.codigoConvite ||
      req.body.codigo ||
      req.body.link ||
      '';
    const codigo = extrairCodigoDeConvite(rawCodigo);
    const userIdStr = String(req.user._id || req.user.id);

    if (!codigo) {
      return res.status(400).json({
        success: false,
        error: 'Link ou código de convite inválido.',
      });
    }

    if (isMongoConnected()) {
      const lista = await ShoppingList.findOne({
        ativa: true,
        codigoConvite: codigo,
      });

      if (!lista) {
        return res.status(404).json({
          success: false,
          error: 'Convite não encontrado ou lista inativa.',
        });
      }

      const jaParticipa = (lista.participantes || []).some(
        (p) => String(p) === userIdStr
      );

      if (!jaParticipa) {
        lista.participantes.push(req.user._id);
        await lista.save();
      }

      const itensPendentes = await Item.find({
        listaId: lista._id,
        status: 'pendente',
      }).lean();

      const valorTotalAproximado = Number(
        itensPendentes
          .reduce((acc, i) => acc + (Number(i.precoTotalAproximado) || 0), 0)
          .toFixed(2)
      );

      return res.status(200).json({
        success: true,
        data: {
          ...lista.toObject(),
          id: String(lista._id),
          codigoConvite: lista.codigoConvite,
          quantidadePendentes: itensPendentes.length,
          quantidadeParticipantes: lista.participantes.length,
          valorTotalAproximado,
        },
      });
    }

    // Fallback em memória
    carregarStoreDoDisco();

    const memLista = memoryStore.lists.find(
      (l) => l.ativa !== false && String(l.codigoConvite).toLowerCase() === codigo
    );

    if (!memLista) {
      return res.status(404).json({
        success: false,
        error: 'Convite não encontrado ou lista inativa.',
      });
    }

    memLista.participantes = Array.isArray(memLista.participantes)
      ? memLista.participantes.map(String)
      : [];

    if (!memLista.participantes.includes(userIdStr)) {
      memLista.participantes.push(userIdStr);
    }
    memLista.updatedAt = new Date().toISOString();

    const memUser = memoryStore.users.find((u) => String(u._id) === userIdStr);
    if (memUser) {
      if (!Array.isArray(memUser.lists)) memUser.lists = [];
      if (!memUser.lists.includes(String(memLista._id))) {
        memUser.lists.push(String(memLista._id));
      }
    }

    salvarStoreNoDisco();

    const itensDaLista = memoryStore.items.filter(
      (i) => String(i.listaId) === String(memLista._id) && i.status === 'pendente'
    );

    return res.status(200).json({
      success: true,
      data: {
        ...memLista,
        id: String(memLista._id),
        quantidadePendentes: itensDaLista.length,
        quantidadeParticipantes: memLista.participantes.length,
        valorTotalAproximado: Number(
          itensDaLista
            .reduce((acc, i) => acc + (Number(i.precoTotalAproximado) || 0), 0)
            .toFixed(2)
        ),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao ingressar na lista via link de convite.',
    });
  }
}

/**
 * GET /api/lists/:id/convite
 * Retorna o código/link de convite único de uma lista para um participante
 */
async function getInviteLink(req, res) {
  try {
    const { id } = req.params;
    const userIdStr = String(req.user._id || req.user.id);

    if (isMongoConnected()) {
      const lista = await ShoppingList.findById(id);
      if (!lista) {
        return res.status(404).json({
          success: false,
          error: 'Lista não encontrada.',
        });
      }

      const ehParticipante = (lista.participantes || []).some(
        (p) => String(p) === userIdStr
      );
      if (!ehParticipante) {
        return res.status(403).json({
          success: false,
          error: 'Apenas participantes desta lista podem gerar o link de convite.',
        });
      }

      if (!lista.codigoConvite) {
        lista.codigoConvite = crypto.randomBytes(6).toString('hex');
        await lista.save();
      }

      return res.status(200).json({
        success: true,
        data: {
          listaId: String(lista._id),
          nome: lista.nome,
          codigoConvite: lista.codigoConvite,
        },
      });
    }

    carregarStoreDoDisco();

    const memLista = memoryStore.lists.find((l) => String(l._id) === String(id));
    if (!memLista) {
      return res.status(404).json({
        success: false,
        error: 'Lista não encontrada.',
      });
    }

    const ehParticipanteMem = (memLista.participantes || [])
      .map(String)
      .includes(userIdStr);
    if (!ehParticipanteMem) {
      return res.status(403).json({
        success: false,
        error: 'Apenas participantes desta lista podem gerar o link de convite.',
      });
    }

    if (!memLista.codigoConvite) {
      memLista.codigoConvite = gerarHashConvite();
      salvarStoreNoDisco();
    }

    return res.status(200).json({
      success: true,
      data: {
        listaId: String(memLista._id),
        nome: memLista.nome,
        codigoConvite: memLista.codigoConvite,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao gerar link de convite.',
    });
  }
}

/**
 * POST /api/lists/:id/sair ou DELETE /api/lists/:id/sair
 * Remove o usuário autenticado da lista compartilhada ("Sair da Lista")
 */
async function leaveList(req, res) {
  try {
    const { id } = req.params;
    const userIdStr = String(req.user._id || req.user.id);

    if (isMongoConnected()) {
      const lista = await ShoppingList.findById(id);
      if (!lista) {
        return res.status(404).json({
          success: false,
          error: 'Lista não encontrada.',
        });
      }

      const ehParticipante = (lista.participantes || []).some(
        (p) => String(p) === userIdStr
      );
      if (!ehParticipante) {
        return res.status(403).json({
          success: false,
          error: 'Você não faz parte desta lista.',
        });
      }

      lista.participantes = (lista.participantes || []).filter(
        (p) => String(p) !== userIdStr
      );
      await lista.save();

      return res.status(200).json({
        success: true,
        data: {
          leftListId: String(lista._id),
          nome: lista.nome,
          message: `Você saiu da lista "${lista.nome}".`,
        },
      });
    }

    // Fallback em memória
    carregarStoreDoDisco();

    const memLista = memoryStore.lists.find((l) => String(l._id) === String(id));
    if (!memLista) {
      return res.status(404).json({
        success: false,
        error: 'Lista não encontrada.',
      });
    }

    const ehParticipanteMem = (memLista.participantes || [])
      .map(String)
      .includes(userIdStr);
    if (!ehParticipanteMem) {
      return res.status(403).json({
        success: false,
        error: 'Você não faz parte desta lista.',
      });
    }

    memLista.participantes = (memLista.participantes || []).filter(
      (p) => String(p) !== userIdStr
    );
    memLista.updatedAt = new Date().toISOString();

    const memUser = memoryStore.users.find((u) => String(u._id) === userIdStr);
    if (memUser && Array.isArray(memUser.lists)) {
      memUser.lists = memUser.lists.filter((listId) => String(listId) !== String(id));
    }

    salvarStoreNoDisco();

    return res.status(200).json({
      success: true,
      data: {
        leftListId: String(memLista._id),
        nome: memLista.nome,
        message: `Você saiu da lista "${memLista.nome}".`,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao sair da lista compartilhada.',
    });
  }
}

/**
 * GET /api/lists/:id
 * Retorna os detalhes de uma lista (SOMENTE se o usuário for participante) e seus itens pendentes
 */
async function getListById(req, res) {
  try {
    const { id } = req.params;
    const userIdStr = String(req.user._id || req.user.id);

    if (isMongoConnected()) {
      const lista = await ShoppingList.findById(id).lean();
      if (!lista) {
        return res.status(404).json({
          success: false,
          error: 'Lista de compras não encontrada.',
        });
      }

      const ehParticipante = (lista.participantes || []).some(
        (p) => String(p) === userIdStr
      );
      if (!ehParticipante) {
        return res.status(403).json({
          success: false,
          error: 'Acesso restrito. Utilize um Link de Convite válido para entrar nesta lista.',
        });
      }

      const itens = await Item.find({
        listaId: lista._id,
        status: 'pendente',
      })
        .populate('criadoPor', 'nome')
        .sort({ createdAt: -1 })
        .lean();

      const itensFormatados = itens.map((item) => {
        const autorNome =
          item.criadoPorNome ||
          (item.criadoPor && item.criadoPor.nome) ||
          'Participante';
        return {
          ...item,
          id: String(item._id),
          criadoPorNome: autorNome,
        };
      });

      const valorTotalAproximado = Number(
        itensFormatados
          .reduce((acc, item) => acc + (Number(item.precoTotalAproximado) || 0), 0)
          .toFixed(2)
      );

      const valorNoCarrinho = Number(
        itensFormatados
          .filter((item) => item.marcadoParaCompra)
          .reduce((acc, item) => acc + (Number(item.precoTotalAproximado) || 0), 0)
          .toFixed(2)
      );

      return res.status(200).json({
        success: true,
        data: {
          lista: {
            ...lista,
            id: String(lista._id),
          },
          items: itensFormatados,
          valorTotalAproximado,
          valorNoCarrinho,
          comparativoZonaLeste: {
            atacarejo: Number((valorTotalAproximado * 0.88).toFixed(2)),
            varejoRegional: valorTotalAproximado,
            premium: Number((valorTotalAproximado * 1.14).toFixed(2)),
          },
        },
      });
    }

    // Fallback em memória
    carregarStoreDoDisco();

    const memLista = memoryStore.lists.find((l) => String(l._id) === String(id));
    if (!memLista) {
      return res.status(404).json({
        success: false,
        error: 'Lista de compras não encontrada.',
      });
    }

    const ehParticipanteMem = (memLista.participantes || [])
      .map(String)
      .includes(userIdStr);
    if (!ehParticipanteMem) {
      return res.status(403).json({
        success: false,
        error: 'Acesso restrito. Utilize um Link de Convite válido para entrar nesta lista.',
      });
    }

    const itensMem = memoryStore.items
      .filter((i) => String(i.listaId) === String(id) && i.status === 'pendente')
      .map((i) => ({
        ...i,
        id: String(i._id),
        criadoPorNome: i.criadoPorNome || 'Participante',
      }));

    const valorTotalAproximado = Number(
      itensMem
        .reduce((acc, item) => acc + (Number(item.precoTotalAproximado) || 0), 0)
        .toFixed(2)
    );

    const valorNoCarrinho = Number(
      itensMem
        .filter((item) => item.marcadoParaCompra)
        .reduce((acc, item) => acc + (Number(item.precoTotalAproximado) || 0), 0)
        .toFixed(2)
    );

    return res.status(200).json({
      success: true,
      data: {
        lista: {
          ...memLista,
          id: String(memLista._id),
        },
        items: itensMem,
        valorTotalAproximado,
        valorNoCarrinho,
        comparativoZonaLeste: {
          atacarejo: Number((valorTotalAproximado * 0.88).toFixed(2)),
          varejoRegional: valorTotalAproximado,
          premium: Number((valorTotalAproximado * 1.14).toFixed(2)),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao carregar a lista de compras.',
    });
  }
}

/**
 * DELETE /api/lists/:id
 * Remove uma lista compartilhada (apenas participantes)
 */
async function deleteList(req, res) {
  try {
    const { id } = req.params;
    const userIdStr = String(req.user._id || req.user.id);

    if (isMongoConnected()) {
      const lista = await ShoppingList.findById(id);
      if (!lista) {
        return res.status(404).json({
          success: false,
          error: 'Lista não encontrada.',
        });
      }

      const ehParticipante = (lista.participantes || []).some(
        (p) => String(p) === userIdStr
      );
      if (!ehParticipante) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado.',
        });
      }

      await ShoppingList.findByIdAndDelete(id);
      await Item.deleteMany({ listaId: id });
      return res.status(200).json({
        success: true,
        data: { deletedId: id },
      });
    }

    carregarStoreDoDisco();

    const memLista = memoryStore.lists.find((l) => String(l._id) === String(id));
    if (!memLista) {
      return res.status(404).json({
        success: false,
        error: 'Lista não encontrada.',
      });
    }

    const ehParticipanteMem = (memLista.participantes || [])
      .map(String)
      .includes(userIdStr);
    if (!ehParticipanteMem) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado.',
      });
    }

    memoryStore.lists = memoryStore.lists.filter((l) => String(l._id) !== String(id));
    memoryStore.items = memoryStore.items.filter((i) => String(i.listaId) !== String(id));
    salvarStoreNoDisco();

    return res.status(200).json({
      success: true,
      data: { deletedId: id },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao remover lista.',
    });
  }
}

module.exports = {
  getLists,
  createList,
  joinListByInvite,
  getInviteLink,
  leaveList,
  getListById,
  deleteList,
};
