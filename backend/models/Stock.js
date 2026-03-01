const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  sector: {
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

stockSchema.index({ user: 1, symbol: 1 }, { unique: true });
stockSchema.index({ user: 1, symbol: 'text', name: 'text' });

module.exports = mongoose.model('Stock', stockSchema);
