const express = require('express');
const router = express.Router();
const {
  getStocks,
  getStock,
  createStock,
  updateStock,
  deleteStock,
  loadDefaults,
  clearAll
} = require('../controllers/stockController');

router.post('/load-defaults', loadDefaults);
router.delete('/clear-all', clearAll);

router.route('/')
  .get(getStocks)
  .post(createStock);

router.route('/:id')
  .get(getStock)
  .put(updateStock)
  .delete(deleteStock);

module.exports = router;
