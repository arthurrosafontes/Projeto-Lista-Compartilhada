const Item = require('../models/Item');
const ShoppingList = require('../models/ShoppingList');
const { isMongoConnected } = require('../config/database');
const {
  memoryStore,
  carregarStoreDoDisco,
  salvarStoreNoDisco,
  gerarObjectIdHex,
} = require('../utils/memoryStore');
const { obterPrecoAproximado } = require('../utils/precificadorZL');

/**
 * Verifica se o usuário autenticado faz parte do array `participantes` da lista.
 */
async function usuarioEhParticipanteDaLista(listaId, userId) {
  if (!listaId || !userId) return false;
  const userIdStr = String(userId);

  if (isMongoConnected()) {
    const lista = await ShoppingList.findById(listaId).lean();
    if (!lista || lista.ativa === false) return false;
    return (lista.participantes || []).some((p) => String(p) === userIdStr);
  }

  carregarStoreDoDisco();
  const memLista = memoryStore.lists.find(
    (l) => String(l._id) === String(listaId) && l.ativa !== false
  );
  if (!memLista) return false;
  return (memLista.participantes || []).map(String).includes(userIdStr);
}

/**
 * GET /api/items ou GET /api/lists/:listId/items
 * Lista apenas os itens pendentes das listas em que o usuário é participante,
 * com o nome de quem adicionou ("Nome do Alimento - [Nome de quem adicionou]").
 */
async function getItems(req, res) {
  try {
    const listaId = req.params.listId || req.query.listaId;
    const statusFiltro = req.query.status || 'pendente';
    const userIdStr = String(req.user._id || req.user.id);

    if (listaId) {
      const autorizado = await usuarioEhParticipanteDaLista(listaId, userIdStr);
      if (!autorizado) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado. Você não participa desta lista de compras.',
        });
      }
    }

    if (isMongoConnected()) {
      let listaIdsPermitidas = [];
      if (listaId) {
        listaIdsPermitidas = [listaId];
      } else {
        const listasDoUsuario = await ShoppingList.find({
          ativa: true,
          participantes: req.user._id,
        })
          .select('_id')
          .lean();
        listaIdsPermitidas = listasDoUsuario.map((l) => l._id);
      }

      const items = listaIdsPermitidas.length
        ? await Item.find({
            status: statusFiltro,
            listaId: { $in: listaIdsPermitidas },
          })
            .populate('criadoPor', 'nome')
            .sort({ createdAt: -1 })
            .lean()
        : [];

      const formatados = items.map((i) => ({
        ...i,
        id: String(i._id),
        criadoPorNome:
          i.criadoPorNome || (i.criadoPor && i.criadoPor.nome) || 'Participante',
      }));

      const valorTotalAproximado = Number(
        formatados
          .reduce((acc, item) => acc + (Number(item.precoTotalAproximado) || 0), 0)
          .toFixed(2)
      );

      return res.status(200).json({
        success: true,
        data: formatados,
        valorTotalAproximado,
      });
    }

    // Fallback em memória
    carregarStoreDoDisco();

    const listasPermitidasSet = new Set(
      memoryStore.lists
        .filter(
          (l) =>
            l.ativa !== false &&
            Array.isArray(l.participantes) &&
            l.participantes.map(String).includes(userIdStr)
        )
        .map((l) => String(l._id))
    );

    const itemsMem = memoryStore.items
      .filter((i) => {
        if (i.status !== statusFiltro) return false;
        if (listaId && String(i.listaId) !== String(listaId)) return false;
        if (!listasPermitidasSet.has(String(i.listaId))) return false;
        return true;
      })
      .map((i) => ({
        ...i,
        id: String(i._id),
        criadoPorNome: i.criadoPorNome || 'Participante',
      }));

    const valorTotalAproximado = Number(
      itemsMem
        .reduce((acc, item) => acc + (Number(item.precoTotalAproximado) || 0), 0)
        .toFixed(2)
    );

    return res.status(200).json({
      success: true,
      data: itemsMem,
      valorTotalAproximado,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao listar itens.',
    });
  }
}

/**
 * POST /api/items ou POST /api/lists/:listId/items
 * Adiciona um novo alimento registrando obrigatoriamente quem o adicionou (`criadoPor` e `criadoPorNome`)
 * e calculando automaticamente o preço médio na Mooca, Belém e Tatuapé.
 */
async function createItem(req, res) {
  try {
    const listaId = req.params.listId || req.body.listaId;
    const nome = String(req.body.nome || '').trim();
    const quantidade = Math.max(1, Number(req.body.quantidade) || 1);
    const observacao = String(req.body.observacao || '').trim();
    const userIdStr = String(req.user._id || req.user.id);
    const autorNome = String(req.user.nome || 'Participante').trim();

    if (!nome) {
      return res.status(400).json({
        success: false,
        error: 'Digite o nome do alimento para adicionar à lista.',
      });
    }

    if (!listaId) {
      return res.status(400).json({
        success: false,
        error: 'ID da lista de compras é obrigatório.',
      });
    }

    const autorizado = await usuarioEhParticipanteDaLista(listaId, userIdStr);
    if (!autorizado) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Você precisa ser participante desta lista para adicionar itens.',
      });
    }

    const estimativa = obterPrecoAproximado(nome, quantidade);

    if (isMongoConnected()) {
      const novoItem = await Item.create({
        listaId,
        nome,
        quantidade,
        unidade: req.body.unidade || estimativa.unidadeSugerida,
        categoria: req.body.categoria || estimativa.categoriaSugerida,
        precoUnitario: estimativa.precoUnitario,
        precoTotalAproximado: estimativa.precoTotalAproximado,
        marcadoParaCompra: false,
        status: 'pendente',
        observacao,
        criadoPor: req.user._id,
        criadoPorNome: autorNome,
      });

      await ShoppingList.findByIdAndUpdate(listaId, { updatedAt: new Date() });

      return res.status(201).json({
        success: true,
        data: {
          ...novoItem.toObject(),
          id: String(novoItem._id),
          criadoPor: userIdStr,
          criadoPorNome: autorNome,
          produtoReferencia: estimativa.produtoReferencia,
        },
      });
    }

    // Fallback em memória
    carregarStoreDoDisco();

    const novoItemMem = {
      _id: gerarObjectIdHex(),
      listaId: String(listaId),
      nome,
      quantidade,
      unidade: req.body.unidade || estimativa.unidadeSugerida,
      categoria: req.body.categoria || estimativa.categoriaSugerida,
      precoUnitario: estimativa.precoUnitario,
      precoTotalAproximado: estimativa.precoTotalAproximado,
      marcadoParaCompra: false,
      status: 'pendente',
      observacao,
      criadoPor: userIdStr,
      criadoPorNome: autorNome,
      compradoPor: null,
      compradoPorNome: null,
      compradoEm: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryStore.items.unshift(novoItemMem);
    salvarStoreNoDisco();

    return res.status(201).json({
      success: true,
      data: {
        ...novoItemMem,
        id: String(novoItemMem._id),
        criadoPor: userIdStr,
        criadoPorNome: autorNome,
        produtoReferencia: estimativa.produtoReferencia,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao adicionar alimento na lista.',
    });
  }
}

/**
 * PATCH /api/items/:id ou PUT /api/items/:id
 * Permite a qualquer participante da lista editar o nome do alimento, alterar quantidade (+ / -)
 * ou marcar/desmarcar checkbox. Recalcula automaticamente o valor aproximado.
 */
async function updateItem(req, res) {
  try {
    const { id } = req.params;
    const userIdStr = String(req.user._id || req.user.id);

    if (isMongoConnected()) {
      const item = await Item.findById(id).populate('criadoPor', 'nome');
      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item não encontrado na lista.',
        });
      }

      const autorizado = await usuarioEhParticipanteDaLista(item.listaId, userIdStr);
      if (!autorizado) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado. Você não participa desta lista.',
        });
      }

      if (typeof req.body.nome === 'string' && req.body.nome.trim()) {
        const novoNome = req.body.nome.trim();
        item.nome = novoNome;
        const novaEstimativa = obterPrecoAproximado(novoNome, item.quantidade);
        item.precoUnitario = novaEstimativa.precoUnitario;
        item.categoria = novaEstimativa.categoriaSugerida;
        item.unidade = novaEstimativa.unidadeSugerida;
      }

      if (req.body.quantidade !== undefined) {
        const novaQtd = Math.max(1, Number(req.body.quantidade) || 1);
        item.quantidade = novaQtd;
      }

      if (typeof req.body.marcadoParaCompra === 'boolean') {
        item.marcadoParaCompra = req.body.marcadoParaCompra;
      }

      item.precoTotalAproximado = Number(
        (Number(item.precoUnitario) * Number(item.quantidade)).toFixed(2)
      );

      await item.save();

      const obj = item.toObject();
      return res.status(200).json({
        success: true,
        data: {
          ...obj,
          id: String(item._id),
          criadoPorNome:
            obj.criadoPorNome ||
            (obj.criadoPor && obj.criadoPor.nome) ||
            'Participante',
        },
      });
    }

    // Fallback em memória
    carregarStoreDoDisco();

    const idx = memoryStore.items.findIndex((i) => String(i._id) === String(id));
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item não encontrado na lista.',
      });
    }

    const itemMem = memoryStore.items[idx];
    const autorizadoMem = await usuarioEhParticipanteDaLista(itemMem.listaId, userIdStr);
    if (!autorizadoMem) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Você não participa desta lista.',
      });
    }

    if (typeof req.body.nome === 'string' && req.body.nome.trim()) {
      const novoNome = req.body.nome.trim();
      itemMem.nome = novoNome;
      const novaEstimativa = obterPrecoAproximado(novoNome, itemMem.quantidade);
      itemMem.precoUnitario = novaEstimativa.precoUnitario;
      itemMem.categoria = novaEstimativa.categoriaSugerida;
      itemMem.unidade = novaEstimativa.unidadeSugerida;
    }

    if (req.body.quantidade !== undefined) {
      itemMem.quantidade = Math.max(1, Number(req.body.quantidade) || 1);
    }

    if (typeof req.body.marcadoParaCompra === 'boolean') {
      itemMem.marcadoParaCompra = req.body.marcadoParaCompra;
    }

    itemMem.precoTotalAproximado = Number(
      (Number(itemMem.precoUnitario) * Number(itemMem.quantidade)).toFixed(2)
    );
    itemMem.updatedAt = new Date().toISOString();

    salvarStoreNoDisco();

    return res.status(200).json({
      success: true,
      data: {
        ...itemMem,
        id: String(itemMem._id),
        criadoPorNome: itemMem.criadoPorNome || 'Participante',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao atualizar item.',
    });
  }
}

/**
 * DELETE /api/items/:id
 * Exclui definitivamente um item da lista (apenas participantes)
 */
async function deleteItem(req, res) {
  try {
    const { id } = req.params;
    const userIdStr = String(req.user._id || req.user.id);

    if (isMongoConnected()) {
      const item = await Item.findById(id);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item não encontrado.',
        });
      }

      const autorizado = await usuarioEhParticipanteDaLista(item.listaId, userIdStr);
      if (!autorizado) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado. Você não participa desta lista.',
        });
      }

      await Item.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        data: { deletedId: id },
      });
    }

    carregarStoreDoDisco();

    const itemMem = memoryStore.items.find((i) => String(i._id) === String(id));
    if (!itemMem) {
      return res.status(404).json({
        success: false,
        error: 'Item não encontrado.',
      });
    }

    const autorizadoMem = await usuarioEhParticipanteDaLista(itemMem.listaId, userIdStr);
    if (!autorizadoMem) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Você não participa desta lista.',
      });
    }

    memoryStore.items = memoryStore.items.filter((i) => String(i._id) !== String(id));
    salvarStoreNoDisco();

    return res.status(200).json({
      success: true,
      data: { deletedId: id },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao excluir item.',
    });
  }
}

/**
 * POST /api/lists/:listId/salvar ou PATCH /api/items/comprar-em-lote
 * "Salvar Lista Atualizada": Dá baixa atômica em todos os itens marcados como comprados,
 * removendo-os definitivamente da lista ativa de todos os participantes.
 */
async function salvarListaAtualizada(req, res) {
  try {
    const listaId = req.params.listId || req.body.listaId;
    const itemIds = Array.isArray(req.body.itemIds) ? req.body.itemIds : null;
    const userIdStr = String(req.user._id || req.user.id);
    const agora = new Date();

    if (listaId) {
      const autorizado = await usuarioEhParticipanteDaLista(listaId, userIdStr);
      if (!autorizado) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado. Você não participa desta lista.',
        });
      }
    }

    if (isMongoConnected()) {
      const filtro = { status: 'pendente' };
      if (listaId) filtro.listaId = listaId;

      if (itemIds && itemIds.length > 0) {
        filtro._id = { $in: itemIds };
      } else {
        filtro.marcadoParaCompra = true;
      }

      const resultado = await Item.updateMany(filtro, {
        $set: {
          status: 'comprado',
          compradoPor: req.user._id,
          compradoPorNome: req.user.nome,
          compradoEm: agora,
          marcadoParaCompra: true,
        },
      });

      const filtroRestantes = { status: 'pendente' };
      if (listaId) filtroRestantes.listaId = listaId;

      const itensRestantes = await Item.find(filtroRestantes)
        .populate('criadoPor', 'nome')
        .sort({ createdAt: -1 })
        .lean();

      const formatados = itensRestantes.map((i) => ({
        ...i,
        id: String(i._id),
        criadoPorNome:
          i.criadoPorNome || (i.criadoPor && i.criadoPor.nome) || 'Participante',
      }));

      const valorTotalAproximado = Number(
        formatados
          .reduce((acc, item) => acc + (Number(item.precoTotalAproximado) || 0), 0)
          .toFixed(2)
      );

      return res.status(200).json({
        success: true,
        data: {
          itensBaixados: resultado.modifiedCount || 0,
          items: formatados,
          valorTotalAproximado,
        },
      });
    }

    // Fallback em memória
    carregarStoreDoDisco();

    let baixadosCount = 0;
    const idSet = itemIds && itemIds.length > 0 ? new Set(itemIds.map(String)) : null;

    for (const item of memoryStore.items) {
      if (item.status !== 'pendente') continue;
      if (listaId && String(item.listaId) !== String(listaId)) continue;

      const deveDarBaixa = idSet
        ? idSet.has(String(item._id))
        : Boolean(item.marcadoParaCompra);

      if (deveDarBaixa) {
        item.status = 'comprado';
        item.compradoPor = userIdStr;
        item.compradoPorNome = req.user.nome;
        item.compradoEm = agora.toISOString();
        item.marcadoParaCompra = true;
        item.updatedAt = agora.toISOString();
        baixadosCount += 1;
      }
    }

    salvarStoreNoDisco();

    const itensRestantesMem = memoryStore.items
      .filter((i) => {
        if (i.status !== 'pendente') return false;
        if (listaId && String(i.listaId) !== String(listaId)) return false;
        return true;
      })
      .map((i) => ({
        ...i,
        id: String(i._id),
        criadoPorNome: i.criadoPorNome || 'Participante',
      }));

    const valorTotalAproximado = Number(
      itensRestantesMem
        .reduce((acc, item) => acc + (Number(item.precoTotalAproximado) || 0), 0)
        .toFixed(2)
    );

    return res.status(200).json({
      success: true,
      data: {
        itensBaixados: baixadosCount,
        items: itensRestantesMem,
        valorTotalAproximado,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao salvar lista atualizada.',
    });
  }
}

module.exports = {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  salvarListaAtualizada,
};
