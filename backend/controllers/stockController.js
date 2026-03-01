const Stock = require('../models/Stock');
const DEFAULT_STOCKS = require('../data/defaultStocks');

const getStocks = async (req, res) => {
  try {
    const { search, active } = req.query;
    let query = { user: req.userId };
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    if (search) {
      query.$or = [
        { symbol: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    const stocks = await Stock.find(query).sort({ symbol: 1 });
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStock = async (req, res) => {
  try {
    const stock = await Stock.findOne({ _id: req.params.id, user: req.userId });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createStock = async (req, res) => {
  try {
    const { symbol, name, sector } = req.body;
    
    const existingStock = await Stock.findOne({ 
      user: req.userId, 
      symbol: symbol.toUpperCase() 
    });
    if (existingStock) {
      return res.status(400).json({ message: 'Stock symbol already exists' });
    }
    
    const stock = await Stock.create({ 
      user: req.userId,
      symbol, 
      name, 
      sector 
    });
    res.status(201).json(stock);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateStock = async (req, res) => {
  try {
    const { symbol, name, sector, isActive } = req.body;
    
    const stock = await Stock.findOne({ _id: req.params.id, user: req.userId });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    
    if (symbol && symbol.toUpperCase() !== stock.symbol) {
      const existingStock = await Stock.findOne({ 
        user: req.userId, 
        symbol: symbol.toUpperCase() 
      });
      if (existingStock) {
        return res.status(400).json({ message: 'Stock symbol already exists' });
      }
    }
    
    stock.symbol = symbol || stock.symbol;
    stock.name = name || stock.name;
    stock.sector = sector !== undefined ? sector : stock.sector;
    stock.isActive = isActive !== undefined ? isActive : stock.isActive;
    
    const updatedStock = await stock.save();
    res.json(updatedStock);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findOne({ _id: req.params.id, user: req.userId });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    
    await stock.deleteOne();
    res.json({ message: 'Stock deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loadDefaults = async (req, res) => {
  try {
    const stocks = DEFAULT_STOCKS.map(s => ({
      ...s,
      user: req.userId
    }));
    
    let added = 0;
    for (const stockData of stocks) {
      const existing = await Stock.findOne({ 
        user: req.userId, 
        symbol: stockData.symbol 
      });
      if (!existing) {
        await Stock.create(stockData);
        added++;
      }
    }
    
    res.json({ message: `Added ${added} default stocks`, added });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearAll = async (req, res) => {
  try {
    const result = await Stock.deleteMany({ user: req.userId });
    res.json({ message: `Deleted ${result.deletedCount} stocks`, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStocks,
  getStock,
  createStock,
  updateStock,
  deleteStock,
  loadDefaults,
  clearAll
};
