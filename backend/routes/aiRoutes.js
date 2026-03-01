const express = require('express');
const router = express.Router();
const { 
  getTradeExitSuggestion,
  saveAnalysis,
  getAnalyses,
  getAnalysis,
  getAnalysisByTrade,
  deleteAnalysis,
  deleteAllAnalyses
} = require('../controllers/aiController');

router.get('/trade-suggestion/:id', getTradeExitSuggestion);
router.post('/analyses', saveAnalysis);
router.get('/analyses', getAnalyses);
router.get('/analyses/by-trade/:tradeId', getAnalysisByTrade);
router.get('/analyses/:id', getAnalysis);
router.delete('/analyses/:id', deleteAnalysis);
router.delete('/analyses', deleteAllAnalyses);

module.exports = router;
