const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },
  stockName: {
    type: String,
    required: true
  },
  stockSymbol: {
    type: String,
    required: true
  },
  tradeType: {
    type: String,
    enum: ['intraday', 'delivery'],
    required: true
  },
  buyPrice: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  investment: {
    type: Number,
    required: true
  },
  holdingDays: {
    type: Number,
    required: true
  },
  suggestion: {
    targetPriceRange: {
      min: Number,
      max: Number,
      percentageGain: String
    },
    stopLoss: {
      price: Number,
      percentageLoss: String
    },
    keyFactors: [String],
    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High']
    },
    recommendation: String,
    reasoning: String,
    disclaimer: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

analysisSchema.index({ user: 1, createdAt: -1 });
analysisSchema.index({ user: 1, trade: 1 });

module.exports = mongoose.model('Analysis', analysisSchema);
