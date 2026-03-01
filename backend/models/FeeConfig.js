const mongoose = require('mongoose');

const feeConfigSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  tradeType: {
    type: String,
    required: true,
    enum: ['intraday', 'delivery']
  },
  feeType: {
    type: String,
    required: true,
    enum: ['percentage', 'flat']
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  appliesTo: {
    type: String,
    required: true,
    enum: ['buy', 'sell', 'both']
  },
  gstApplicable: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

feeConfigSchema.index({ user: 1, tradeType: 1 });

module.exports = mongoose.model('FeeConfig', feeConfigSchema);
