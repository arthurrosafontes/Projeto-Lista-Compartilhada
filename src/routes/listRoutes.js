const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');
const itemController = require('../controllers/itemController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', listController.getLists);
router.post('/', listController.createList);

// Ingresso exclusivo via Link / Código de Convite Único
router.post('/entrar', listController.joinListByInvite);
router.post('/entrar/:codigo', listController.joinListByInvite);
router.post('/convite/:codigo', listController.joinListByInvite);
router.post('/entrar-convite', listController.joinListByInvite);

router.get('/:id', listController.getListById);
router.get('/:id/convite', listController.getInviteLink);
router.post('/:id/sair', listController.leaveList);
router.delete('/:id/sair', listController.leaveList);
router.delete('/:id', listController.deleteList);

// Rotas aninhadas da lista compartilhada
router.get('/:listId/items', itemController.getItems);
router.get('/:listId/itens', itemController.getItems);
router.post('/:listId/items', itemController.createItem);
router.post('/:listId/itens', itemController.createItem);
router.post('/:listId/salvar', itemController.salvarListaAtualizada);

module.exports = router;
