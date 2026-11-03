const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', itemController.getItems);
router.post('/', itemController.createItem);
router.patch('/comprar-em-lote', itemController.salvarListaAtualizada);
router.patch('/comprar', itemController.salvarListaAtualizada);
router.post('/salvar', itemController.salvarListaAtualizada);
router.put('/:id', itemController.updateItem);
router.patch('/:id', itemController.updateItem);
router.delete('/:id', itemController.deleteItem);

module.exports = router;
