const express = require('express');
const router = express.Router();
const {
  getFees,
  getFee,
  createFee,
  updateFee,
  deleteFee,
  calculateFees,
  loadDefaults,
  clearAll
} = require('../controllers/feeController');

router.post('/calculate', calculateFees);
router.post('/load-defaults', loadDefaults);
router.delete('/clear-all', clearAll);

router.route('/')
  .get(getFees)
  .post(createFee);

router.route('/:id')
  .get(getFee)
  .put(updateFee)
  .delete(deleteFee);

module.exports = router;
