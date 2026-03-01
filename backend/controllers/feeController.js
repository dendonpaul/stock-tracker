const FeeConfig = require('../models/FeeConfig');

const GST_RATE = 0.18;

const DEFAULT_INTRADAY_FEES = [
  { name: 'Exchange Transaction Charge (NSE)', feeType: 'percentage', value: 0.003, appliesTo: 'both', gstApplicable: true, description: 'NSE exchange charges' },
  { name: 'Groww Charges', feeType: 'percentage', value: 0.1, appliesTo: 'both', gstApplicable: true, description: 'Groww broker charges' },
  { name: 'IPFT (Investor Protection Fund)', feeType: 'percentage', value: 0.0001, appliesTo: 'both', gstApplicable: true, description: 'Investor Protection Fund Trust' },
  { name: 'SEBI Turnover Charge', feeType: 'percentage', value: 0.0001, appliesTo: 'both', gstApplicable: true, description: 'SEBI regulatory fee' },
  { name: 'Stamp Duty', feeType: 'percentage', value: 0.003, appliesTo: 'buy', gstApplicable: false, description: 'State stamp duty' },
  { name: 'STT (Securities Transaction Tax)', feeType: 'percentage', value: 0.025, appliesTo: 'sell', gstApplicable: false, description: 'Securities Transaction Tax' }
];

const DEFAULT_DELIVERY_FEES = [
  { name: 'DP Charges', feeType: 'flat', value: 20, appliesTo: 'sell', gstApplicable: true, description: 'Depository participant charges' },
  { name: 'Exchange Transaction Charge (NSE)', feeType: 'percentage', value: 0.003, appliesTo: 'both', gstApplicable: true, description: 'NSE exchange charges' },
  { name: 'Groww Charges', feeType: 'percentage', value: 0.1, appliesTo: 'both', gstApplicable: true, description: 'Groww broker charges' },
  { name: 'IPFT (Investor Protection Fund)', feeType: 'percentage', value: 0.0001, appliesTo: 'both', gstApplicable: true, description: 'Investor Protection Fund Trust' },
  { name: 'SEBI Turnover Charge', feeType: 'percentage', value: 0.0001, appliesTo: 'both', gstApplicable: true, description: 'SEBI regulatory fee' },
  { name: 'Stamp Duty', feeType: 'percentage', value: 0.015, appliesTo: 'buy', gstApplicable: false, description: 'State stamp duty' },
  { name: 'STT (Securities Transaction Tax)', feeType: 'percentage', value: 0.1, appliesTo: 'both', gstApplicable: false, description: 'Securities Transaction Tax' }
];

const getFees = async (req, res) => {
  try {
    const { tradeType, active } = req.query;
    let query = { user: req.userId };
    
    if (tradeType) {
      query.tradeType = tradeType;
    }
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    const fees = await FeeConfig.find(query).sort({ tradeType: 1, name: 1 });
    res.json(fees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFee = async (req, res) => {
  try {
    const fee = await FeeConfig.findOne({ _id: req.params.id, user: req.userId });
    if (!fee) {
      return res.status(404).json({ message: 'Fee configuration not found' });
    }
    res.json(fee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createFee = async (req, res) => {
  try {
    const { name, tradeType, feeType, value, appliesTo, gstApplicable, description } = req.body;
    
    const fee = await FeeConfig.create({
      user: req.userId,
      name,
      tradeType,
      feeType,
      value,
      appliesTo,
      gstApplicable: gstApplicable || false,
      description
    });
    
    res.status(201).json(fee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateFee = async (req, res) => {
  try {
    const { name, tradeType, feeType, value, appliesTo, gstApplicable, description, isActive } = req.body;
    
    const fee = await FeeConfig.findOne({ _id: req.params.id, user: req.userId });
    if (!fee) {
      return res.status(404).json({ message: 'Fee configuration not found' });
    }
    
    fee.name = name || fee.name;
    fee.tradeType = tradeType || fee.tradeType;
    fee.feeType = feeType || fee.feeType;
    fee.value = value !== undefined ? value : fee.value;
    fee.appliesTo = appliesTo || fee.appliesTo;
    fee.gstApplicable = gstApplicable !== undefined ? gstApplicable : fee.gstApplicable;
    fee.description = description !== undefined ? description : fee.description;
    fee.isActive = isActive !== undefined ? isActive : fee.isActive;
    
    const updatedFee = await fee.save();
    res.json(updatedFee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteFee = async (req, res) => {
  try {
    const fee = await FeeConfig.findOne({ _id: req.params.id, user: req.userId });
    if (!fee) {
      return res.status(404).json({ message: 'Fee configuration not found' });
    }
    
    await fee.deleteOne();
    res.json({ message: 'Fee configuration deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const calculateFeesForTrade = async (userId, tradeType, buyPrice, sellPrice, quantity) => {
  const fees = await FeeConfig.find({ user: userId, tradeType, isActive: true });
  
  let buyFees = 0;
  let sellFees = 0;
  let totalGst = 0;
  const feeBreakdown = [];
  
  const buyValue = buyPrice * quantity;
  const sellValue = sellPrice ? sellPrice * quantity : 0;
  
  for (const fee of fees) {
    if (fee.appliesTo === 'buy' || fee.appliesTo === 'both') {
      let amount = 0;
      if (fee.feeType === 'percentage') {
        amount = (buyValue * fee.value) / 100;
      } else if (fee.feeType === 'flat') {
        amount = fee.value;
      }
      
      let gst = 0;
      if (fee.gstApplicable && amount > 0) {
        gst = amount * GST_RATE;
        totalGst += gst;
      }
      
      buyFees += amount + gst;
      if (amount > 0 || fee.value > 0) {
        feeBreakdown.push({ 
          name: fee.name, 
          amount: Math.round(amount * 100) / 100, 
          gst: Math.round(gst * 100) / 100,
          side: 'buy' 
        });
      }
    }
    
    if (sellPrice && (fee.appliesTo === 'sell' || fee.appliesTo === 'both')) {
      let amount = 0;
      if (fee.feeType === 'percentage') {
        amount = (sellValue * fee.value) / 100;
      } else if (fee.feeType === 'flat') {
        amount = fee.value;
      }
      
      let gst = 0;
      if (fee.gstApplicable && amount > 0) {
        gst = amount * GST_RATE;
        totalGst += gst;
      }
      
      sellFees += amount + gst;
      if (amount > 0 || fee.value > 0) {
        feeBreakdown.push({ 
          name: fee.name, 
          amount: Math.round(amount * 100) / 100, 
          gst: Math.round(gst * 100) / 100,
          side: 'sell' 
        });
      }
    }
  }
  
  return {
    buyFees: Math.round(buyFees * 100) / 100,
    sellFees: Math.round(sellFees * 100) / 100,
    totalFees: Math.round((buyFees + sellFees) * 100) / 100,
    totalGst: Math.round(totalGst * 100) / 100,
    feeBreakdown
  };
};

const calculateFees = async (req, res) => {
  try {
    const { tradeType, buyPrice, sellPrice, quantity } = req.body;
    const result = await calculateFeesForTrade(req.userId, tradeType, buyPrice, sellPrice, quantity);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loadDefaults = async (req, res) => {
  try {
    let added = 0;
    
    for (const feeData of DEFAULT_INTRADAY_FEES) {
      const existing = await FeeConfig.findOne({ 
        user: req.userId, 
        tradeType: 'intraday',
        name: feeData.name 
      });
      if (!existing) {
        await FeeConfig.create({ ...feeData, user: req.userId, tradeType: 'intraday' });
        added++;
      }
    }
    
    for (const feeData of DEFAULT_DELIVERY_FEES) {
      const existing = await FeeConfig.findOne({ 
        user: req.userId, 
        tradeType: 'delivery',
        name: feeData.name 
      });
      if (!existing) {
        await FeeConfig.create({ ...feeData, user: req.userId, tradeType: 'delivery' });
        added++;
      }
    }
    
    res.json({ message: `Added ${added} default fee configurations`, added });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearAll = async (req, res) => {
  try {
    const result = await FeeConfig.deleteMany({ user: req.userId });
    res.json({ message: `Deleted ${result.deletedCount} fee configurations`, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getFees,
  getFee,
  createFee,
  updateFee,
  deleteFee,
  calculateFees,
  calculateFeesForTrade,
  loadDefaults,
  clearAll
};
