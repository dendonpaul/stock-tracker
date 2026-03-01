const { GoogleGenerativeAI } = require('@google/generative-ai');
const Trade = require('../models/Trade');
const Analysis = require('../models/Analysis');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const suggestionCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

const getCacheKey = (tradeId, buyPrice) => `${tradeId}_${buyPrice}`;

const getTradeExitSuggestion = async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, user: req.userId });
    
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    if (trade.status !== 'open') {
      return res.status(400).json({ message: 'Trade is already closed' });
    }

    const cacheKey = getCacheKey(trade._id.toString(), trade.buyPrice);
    const cachedSuggestion = suggestionCache.get(cacheKey);
    
    if (cachedSuggestion && (Date.now() - cachedSuggestion.timestamp) < CACHE_DURATION) {
      console.log('Returning cached AI suggestion for trade:', trade._id);
      return res.json({ ...cachedSuggestion.data, cached: true });
    }

    const holdingDays = Math.floor((new Date() - new Date(trade.buyDate)) / (1000 * 60 * 60 * 24));
    const currentInvestment = trade.buyPrice * trade.quantity;

    const prompt = `You are a stock trading advisor. Analyze this open trade and provide exit strategy suggestions.

Trade Details:
- Stock: ${trade.stockName} (${trade.stockSymbol})
- Trade Type: ${trade.tradeType}
- Buy Price: ₹${trade.buyPrice}
- Quantity: ${trade.quantity}
- Total Investment: ₹${currentInvestment}
- Buy Date: ${new Date(trade.buyDate).toLocaleDateString('en-IN')}
- Days Held: ${holdingDays} days

Based on general stock trading principles and risk management, provide:
1. A suggested target exit price range (as a percentage gain from buy price)
2. A suggested stop-loss price (as a percentage loss from buy price)
3. Key factors to consider before exiting
4. Risk assessment (Low/Medium/High)
5. A brief recommendation (Hold/Consider Selling/Set Stop-Loss)

Important: This is for educational purposes. Provide practical, actionable advice based on standard trading strategies. Consider the holding period and trade type (intraday vs delivery).

Format your response as JSON with these exact keys:
{
  "targetPriceRange": { "min": number, "max": number, "percentageGain": "X% to Y%" },
  "stopLoss": { "price": number, "percentageLoss": "X%" },
  "keyFactors": ["factor1", "factor2", "factor3"],
  "riskLevel": "Low|Medium|High",
  "recommendation": "Hold|Consider Selling|Set Stop-Loss",
  "reasoning": "Brief explanation",
  "disclaimer": "Standard investment disclaimer"
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let suggestion;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      suggestion = {
        targetPriceRange: {
          min: Math.round(trade.buyPrice * 1.05 * 100) / 100,
          max: Math.round(trade.buyPrice * 1.15 * 100) / 100,
          percentageGain: "5% to 15%"
        },
        stopLoss: {
          price: Math.round(trade.buyPrice * 0.95 * 100) / 100,
          percentageLoss: "5%"
        },
        keyFactors: [
          "Monitor market trends",
          "Check company news and announcements",
          "Review sector performance"
        ],
        riskLevel: "Medium",
        recommendation: "Hold",
        reasoning: text.substring(0, 500),
        disclaimer: "This is AI-generated advice for educational purposes only. Always do your own research before making investment decisions."
      };
    }

    suggestion.tradeInfo = {
      stockName: trade.stockName,
      stockSymbol: trade.stockSymbol,
      buyPrice: trade.buyPrice,
      quantity: trade.quantity,
      investment: currentInvestment,
      holdingDays
    };

    suggestionCache.set(cacheKey, {
      data: suggestion,
      timestamp: Date.now()
    });

    res.json(suggestion);
  } catch (error) {
    console.error('AI Suggestion Error:', error);
    
    if (error.message?.includes('API_KEY')) {
      return res.status(500).json({ message: 'Gemini API key not configured' });
    }
    
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
      return res.status(429).json({ 
        message: 'Gemini API daily quota exceeded. Free tier allows limited requests per day. Try again tomorrow or use a different Google account for a new API key.',
        retryAfter: 86400
      });
    }
    
    res.status(500).json({ message: 'Failed to generate suggestion', error: error.message });
  }
};

const clearSuggestionCache = (tradeId) => {
  for (const key of suggestionCache.keys()) {
    if (key.startsWith(tradeId)) {
      suggestionCache.delete(key);
    }
  }
};

const saveAnalysis = async (req, res) => {
  try {
    const { tradeId, suggestion } = req.body;
    
    const trade = await Trade.findOne({ _id: tradeId, user: req.userId });
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    const holdingDays = Math.floor((new Date() - new Date(trade.buyDate)) / (1000 * 60 * 60 * 24));
    const investment = trade.buyPrice * trade.quantity;

    const analysis = new Analysis({
      user: req.userId,
      trade: tradeId,
      stockName: trade.stockName,
      stockSymbol: trade.stockSymbol,
      tradeType: trade.tradeType,
      buyPrice: trade.buyPrice,
      quantity: trade.quantity,
      investment,
      holdingDays,
      suggestion: {
        targetPriceRange: suggestion.targetPriceRange,
        stopLoss: suggestion.stopLoss,
        keyFactors: suggestion.keyFactors,
        riskLevel: suggestion.riskLevel,
        recommendation: suggestion.recommendation,
        reasoning: suggestion.reasoning,
        disclaimer: suggestion.disclaimer
      }
    });

    await analysis.save();
    res.status(201).json(analysis);
  } catch (error) {
    console.error('Save Analysis Error:', error);
    res.status(500).json({ message: 'Failed to save analysis', error: error.message });
  }
};

const getAnalyses = async (req, res) => {
  try {
    const { page = 1, limit = 20, stockSymbol, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const query = { user: req.userId };
    if (stockSymbol) {
      query.stockSymbol = stockSymbol;
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const analyses = await Analysis.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('trade', 'status sellPrice sellDate');

    const total = await Analysis.countDocuments(query);

    res.json({
      analyses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get Analyses Error:', error);
    res.status(500).json({ message: 'Failed to fetch analyses', error: error.message });
  }
};

const getAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({ _id: req.params.id, user: req.userId })
      .populate('trade', 'status sellPrice sellDate netProfit profitPercentage');
    
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Get Analysis Error:', error);
    res.status(500).json({ message: 'Failed to fetch analysis', error: error.message });
  }
};

const getAnalysisByTrade = async (req, res) => {
  try {
    const analysis = await Analysis.findOne({ 
      trade: req.params.tradeId, 
      user: req.userId 
    })
      .sort({ createdAt: -1 });
    
    if (!analysis) {
      return res.status(404).json({ message: 'No analysis found for this trade' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Get Analysis By Trade Error:', error);
    res.status(500).json({ message: 'Failed to fetch analysis', error: error.message });
  }
};

const deleteAnalysis = async (req, res) => {
  try {
    const analysis = await Analysis.findOneAndDelete({ _id: req.params.id, user: req.userId });
    
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    res.json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Delete Analysis Error:', error);
    res.status(500).json({ message: 'Failed to delete analysis', error: error.message });
  }
};

const deleteAllAnalyses = async (req, res) => {
  try {
    const result = await Analysis.deleteMany({ user: req.userId });
    res.json({ message: `Deleted ${result.deletedCount} analyses` });
  } catch (error) {
    console.error('Delete All Analyses Error:', error);
    res.status(500).json({ message: 'Failed to delete analyses', error: error.message });
  }
};

module.exports = { 
  getTradeExitSuggestion, 
  clearSuggestionCache,
  saveAnalysis,
  getAnalyses,
  getAnalysis,
  getAnalysisByTrade,
  deleteAnalysis,
  deleteAllAnalyses
};
