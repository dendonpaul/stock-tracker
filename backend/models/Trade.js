const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stock: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true
  },
  stockSymbol: {
    type: String,
    required: true
  },
  stockName: {
    type: String,
    required: true
  },
  tradeType: {
    type: String,
    required: true,
    enum: ['intraday', 'delivery']
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  buyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  buyDate: {
    type: Date,
    required: true
  },
  sellPrice: {
    type: Number,
    min: 0,
    default: null
  },
  sellDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  buyFees: {
    type: Number,
    default: 0
  },
  sellFees: {
    type: Number,
    default: 0
  },
  totalFees: {
    type: Number,
    default: 0
  },
  totalGst: {
    type: Number,
    default: 0
  },
  feeBreakdown: [{
    name: String,
    amount: Number,
    gst: Number,
    side: String
  }],
  grossProfit: {
    type: Number,
    default: null
  },
  netProfit: {
    type: Number,
    default: null
  },
  profitPercentage: {
    type: Number,
    default: null
  },
  holdingDays: {
    type: Number,
    default: null
  },
  annualizedROI: {
    type: Number,
    default: null
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

tradeSchema.index({ user: 1, buyDate: -1 });
tradeSchema.index({ user: 1, sellDate: -1 });
tradeSchema.index({ user: 1, status: 1 });
tradeSchema.index({ user: 1, tradeType: 1 });
tradeSchema.index({ user: 1, stockSymbol: 1 });

module.exports = mongoose.model('Trade', tradeSchema);
