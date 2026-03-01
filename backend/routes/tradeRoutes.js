const express = require('express');
const router = express.Router();
const {
  getTrades,
  getTrade,
  createTrade,
  updateTrade,
  closeTrade,
  previewClose,
  deleteTrade,
  bulkDeleteTrades,
  importCSV,
  getAnalytics,
  getMonthlySummary,
  getProfitByPeriod,
  getDashboardStats,
  getProfitTrend
} = require('../controllers/tradeController');

router.get('/analytics', getAnalytics);
router.get('/dashboard', getDashboardStats);
router.get('/monthly-summary', getMonthlySummary);
router.get('/profit-trend', getProfitTrend);
router.get('/profit/:period', getProfitByPeriod);
router.post('/import', importCSV);
router.post('/bulk-delete', bulkDeleteTrades);

router.route('/')
  .get(getTrades)
  .post(createTrade);

router.route('/:id')
  .get(getTrade)
  .put(updateTrade)
  .delete(deleteTrade);

router.put('/:id/close', closeTrade);
router.post('/:id/preview-close', previewClose);

module.exports = router;
