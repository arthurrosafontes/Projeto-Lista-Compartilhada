const express = require('express');
const router = express.Router();
const {
  carregarTabelaPrecos,
  obterPrecoAproximado,
} = require('../utils/precificadorZL');

// GET /api/prices - Retorna a tabela de preços médios de Mooca, Belém e Tatuapé
router.get('/', (req, res) => {
  const tabela = carregarTabelaPrecos();
  return res.status(200).json({
    success: true,
    data: tabela,
  });
});

// GET /api/prices/estimate?nome=Arroz&quantidade=2
router.get('/estimate', (req, res) => {
  const nome = req.query.nome || '';
  const quantidade = Number(req.query.quantidade) || 1;
  const resultado = obterPrecoAproximado(nome, quantidade);
  return res.status(200).json({
    success: true,
    data: resultado,
  });
});

module.exports = router;
