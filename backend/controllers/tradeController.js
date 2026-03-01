const Trade = require('../models/Trade');
const Stock = require('../models/Stock');
const { calculateFeesForTrade } = require('./feeController');
const { parse } = require('csv-parse/sync');

const calculateProfitMetrics = (buyPrice, sellPrice, quantity, totalFees, buyDate, sellDate) => {
  const buyValue = buyPrice * quantity;
  const sellValue = sellPrice * quantity;
  const grossProfit = sellValue - buyValue;
  const netProfit = grossProfit - totalFees;
  const profitPercentage = (netProfit / buyValue) * 100;
  
  const buy = new Date(buyDate);
  const sell = new Date(sellDate);
  const holdingDays = Math.max(1, Math.ceil((sell - buy) / (1000 * 60 * 60 * 24)));
  
  const annualizedROI = (profitPercentage * 365) / holdingDays;
  
  return {
    grossProfit: Math.round(grossProfit * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    profitPercentage: Math.round(profitPercentage * 100) / 100,
    holdingDays,
    annualizedROI: Math.round(annualizedROI * 100) / 100
  };
};

const getTrades = async (req, res) => {
  try {
    const { 
      status, tradeType, search, startDate, endDate,
      sortBy = 'buyDate', sortOrder = 'desc',
      page = 1, limit = 25
    } = req.query;
    
    let query = { user: req.userId };
    
    if (status) query.status = status;
    if (tradeType) query.tradeType = tradeType;
    
    if (search) {
      query.$or = [
        { stockSymbol: { $regex: search, $options: 'i' } },
        { stockName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (startDate || endDate) {
      query.buyDate = {};
      if (startDate) query.buyDate.$gte = new Date(startDate);
      if (endDate) query.buyDate.$lte = new Date(endDate);
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [trades, total] = await Promise.all([
      Trade.find(query)
        .populate('stock', 'symbol name')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Trade.countDocuments(query)
    ]);
    
    res.json({
      trades,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTrade = async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, user: req.userId })
      .populate('stock', 'symbol name');
    
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    
    res.json(trade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTrade = async (req, res) => {
  try {
    const { stockId, tradeType, quantity, buyPrice, buyDate, sellPrice, sellDate, notes } = req.body;
    
    const stock = await Stock.findOne({ _id: stockId, user: req.userId });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    
    const feeData = await calculateFeesForTrade(req.userId, tradeType, buyPrice, sellPrice, quantity);
    
    let tradeData = {
      user: req.userId,
      stock: stockId,
      stockSymbol: stock.symbol,
      stockName: stock.name,
      tradeType,
      quantity,
      buyPrice,
      buyDate,
      buyFees: feeData.buyFees,
      sellFees: feeData.sellFees,
      totalFees: feeData.totalFees,
      totalGst: feeData.totalGst,
      feeBreakdown: feeData.feeBreakdown,
      notes
    };
    
    if (sellPrice && sellDate) {
      const profitMetrics = calculateProfitMetrics(buyPrice, sellPrice, quantity, feeData.totalFees, buyDate, sellDate);
      tradeData = {
        ...tradeData,
        sellPrice,
        sellDate,
        status: 'closed',
        ...profitMetrics
      };
    }
    
    const trade = await Trade.create(tradeData);
    const populatedTrade = await Trade.findById(trade._id).populate('stock', 'symbol name');
    
    res.status(201).json(populatedTrade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateTrade = async (req, res) => {
  try {
    const { stockId, tradeType, quantity, buyPrice, buyDate, sellPrice, sellDate, notes } = req.body;
    
    const trade = await Trade.findOne({ _id: req.params.id, user: req.userId });
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    
    if (stockId && stockId !== trade.stock.toString()) {
      const stock = await Stock.findOne({ _id: stockId, user: req.userId });
      if (!stock) {
        return res.status(404).json({ message: 'Stock not found' });
      }
      trade.stock = stockId;
      trade.stockSymbol = stock.symbol;
      trade.stockName = stock.name;
    }
    
    trade.tradeType = tradeType || trade.tradeType;
    trade.quantity = quantity !== undefined ? quantity : trade.quantity;
    trade.buyPrice = buyPrice !== undefined ? buyPrice : trade.buyPrice;
    trade.buyDate = buyDate || trade.buyDate;
    trade.notes = notes !== undefined ? notes : trade.notes;
    
    const newSellPrice = sellPrice !== undefined ? sellPrice : trade.sellPrice;
    const newSellDate = sellDate || trade.sellDate;
    
    const feeData = await calculateFeesForTrade(
      req.userId,
      trade.tradeType,
      trade.buyPrice,
      newSellPrice,
      trade.quantity
    );
    
    trade.buyFees = feeData.buyFees;
    trade.sellFees = feeData.sellFees;
    trade.totalFees = feeData.totalFees;
    trade.totalGst = feeData.totalGst;
    trade.feeBreakdown = feeData.feeBreakdown;
    
    if (newSellPrice && newSellDate) {
      trade.sellPrice = newSellPrice;
      trade.sellDate = newSellDate;
      trade.status = 'closed';
      
      const profitMetrics = calculateProfitMetrics(
        trade.buyPrice,
        newSellPrice,
        trade.quantity,
        feeData.totalFees,
        trade.buyDate,
        newSellDate
      );
      
      trade.grossProfit = profitMetrics.grossProfit;
      trade.netProfit = profitMetrics.netProfit;
      trade.profitPercentage = profitMetrics.profitPercentage;
      trade.holdingDays = profitMetrics.holdingDays;
      trade.annualizedROI = profitMetrics.annualizedROI;
    }
    
    const updatedTrade = await trade.save();
    const populatedTrade = await Trade.findById(updatedTrade._id).populate('stock', 'symbol name');
    
    res.json(populatedTrade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const closeTrade = async (req, res) => {
  try {
    const { sellPrice, sellDate } = req.body;
    
    if (!sellPrice || !sellDate) {
      return res.status(400).json({ message: 'Sell price and sell date are required' });
    }
    
    const trade = await Trade.findOne({ _id: req.params.id, user: req.userId });
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    
    if (trade.status === 'closed') {
      return res.status(400).json({ message: 'Trade is already closed' });
    }
    
    const feeData = await calculateFeesForTrade(
      req.userId,
      trade.tradeType,
      trade.buyPrice,
      sellPrice,
      trade.quantity
    );
    
    const profitMetrics = calculateProfitMetrics(
      trade.buyPrice,
      sellPrice,
      trade.quantity,
      feeData.totalFees,
      trade.buyDate,
      sellDate
    );
    
    trade.sellPrice = sellPrice;
    trade.sellDate = sellDate;
    trade.status = 'closed';
    trade.buyFees = feeData.buyFees;
    trade.sellFees = feeData.sellFees;
    trade.totalFees = feeData.totalFees;
    trade.totalGst = feeData.totalGst;
    trade.feeBreakdown = feeData.feeBreakdown;
    trade.grossProfit = profitMetrics.grossProfit;
    trade.netProfit = profitMetrics.netProfit;
    trade.profitPercentage = profitMetrics.profitPercentage;
    trade.holdingDays = profitMetrics.holdingDays;
    trade.annualizedROI = profitMetrics.annualizedROI;
    
    const updatedTrade = await trade.save();
    const populatedTrade = await Trade.findById(updatedTrade._id).populate('stock', 'symbol name');
    
    res.json(populatedTrade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const previewClose = async (req, res) => {
  try {
    const { sellPrice, sellDate } = req.body;
    
    const trade = await Trade.findOne({ _id: req.params.id, user: req.userId });
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    
    const feeData = await calculateFeesForTrade(
      req.userId,
      trade.tradeType,
      trade.buyPrice,
      sellPrice,
      trade.quantity
    );
    
    const profitMetrics = calculateProfitMetrics(
      trade.buyPrice,
      sellPrice,
      trade.quantity,
      feeData.totalFees,
      trade.buyDate,
      sellDate || new Date()
    );
    
    res.json({
      buyValue: trade.buyPrice * trade.quantity,
      sellValue: sellPrice * trade.quantity,
      ...feeData,
      ...profitMetrics
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteTrade = async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, user: req.userId });
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    
    await trade.deleteOne();
    res.json({ message: 'Trade deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkDeleteTrades = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No trade IDs provided' });
    }
    
    const result = await Trade.deleteMany({ 
      _id: { $in: ids }, 
      user: req.userId 
    });
    
    res.json({ 
      message: `Deleted ${result.deletedCount} trades successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const importCSV = async (req, res) => {
  try {
    if (!req.body.csvData) {
      return res.status(400).json({ message: 'CSV data is required' });
    }
    
    const records = parse(req.body.csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    const results = { success: 0, errors: [] };
    
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        const symbol = (row.symbol || row.Symbol || row.SYMBOL || row.stock_symbol || row.stockSymbol || '').toUpperCase().trim();
        const stockName = row.name || row.Name || row.stock_name || row.stockName || symbol;
        
        if (!symbol) {
          results.errors.push({ row: i + 2, error: 'Missing stock symbol' });
          continue;
        }
        
        let stock = await Stock.findOne({ user: req.userId, symbol });
        if (!stock) {
          stock = await Stock.create({ user: req.userId, symbol, name: stockName });
        }
        
        const parseDate = (dateStr) => {
          if (!dateStr) return null;
          const formats = [
            /^(\d{4})-(\d{2})-(\d{2})$/,
            /^(\d{2})\/(\d{2})\/(\d{4})$/,
            /^(\d{2})\/(\d{2})\/(\d{2})$/,
            /^(\d{2})-(\d{2})-(\d{4})$/
          ];
          
          for (const fmt of formats) {
            const match = dateStr.match(fmt);
            if (match) {
              if (fmt === formats[0]) return new Date(match[1], match[2] - 1, match[3]);
              if (fmt === formats[1]) return new Date(match[3], match[2] - 1, match[1]);
              if (fmt === formats[2]) return new Date(2000 + parseInt(match[3]), match[2] - 1, match[1]);
              if (fmt === formats[3]) return new Date(match[3], match[2] - 1, match[1]);
            }
          }
          return new Date(dateStr);
        };
        
        const tradeType = (row.trade_type || row.tradeType || row.type || 'delivery').toLowerCase();
        const quantity = parseInt(row.quantity || row.Quantity || row.qty || 0);
        const buyPrice = parseFloat(row.buy_price || row.buyPrice || row.buy || 0);
        const buyDate = parseDate(row.buy_date || row.buyDate || row.date);
        const sellPrice = parseFloat(row.sell_price || row.sellPrice || row.sell || 0) || null;
        const sellDate = parseDate(row.sell_date || row.sellDate) || null;
        
        if (!quantity || !buyPrice || !buyDate) {
          results.errors.push({ row: i + 2, error: 'Missing required fields (quantity, buy_price, buy_date)' });
          continue;
        }
        
        const feeData = await calculateFeesForTrade(req.userId, tradeType, buyPrice, sellPrice, quantity);
        
        let tradeData = {
          user: req.userId,
          stock: stock._id,
          stockSymbol: stock.symbol,
          stockName: stock.name,
          tradeType,
          quantity,
          buyPrice,
          buyDate,
          ...feeData,
          notes: row.notes || ''
        };
        
        if (sellPrice && sellDate) {
          const profitMetrics = calculateProfitMetrics(buyPrice, sellPrice, quantity, feeData.totalFees, buyDate, sellDate);
          tradeData = { ...tradeData, sellPrice, sellDate, status: 'closed', ...profitMetrics };
        }
        
        await Trade.create(tradeData);
        results.success++;
      } catch (error) {
        results.errors.push({ row: i + 2, error: error.message });
      }
    }
    
    res.json(results);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, timeframe } = req.query;
    
    let dateFilter = { user: req.userId, status: 'closed' };
    
    if (timeframe) {
      const now = new Date();
      switch (timeframe) {
        case 'thisMonth':
          dateFilter.sellDate = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
          break;
        case 'last3Months':
          dateFilter.sellDate = { $gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) };
          break;
        case 'last6Months':
          dateFilter.sellDate = { $gte: new Date(now.getFullYear(), now.getMonth() - 6, 1) };
          break;
        case 'thisYear':
          dateFilter.sellDate = { $gte: new Date(now.getFullYear(), 0, 1) };
          break;
        case 'lastYear':
          dateFilter.sellDate = { 
            $gte: new Date(now.getFullYear() - 1, 0, 1),
            $lt: new Date(now.getFullYear(), 0, 1)
          };
          break;
      }
    } else if (startDate || endDate) {
      dateFilter.sellDate = {};
      if (startDate) dateFilter.sellDate.$gte = new Date(startDate);
      if (endDate) dateFilter.sellDate.$lte = new Date(endDate);
    }
    
    const closedTrades = await Trade.find(dateFilter);
    
    const totalTrades = closedTrades.length;
    if (totalTrades === 0) {
      return res.json({
        totalTrades: 0,
        totalNetProfit: 0,
        totalGrossProfit: 0,
        totalFees: 0,
        totalGst: 0,
        totalInvested: 0,
        overallROI: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        avgProfit: 0,
        avgWin: 0,
        avgLoss: 0,
        avgHoldingDays: 0,
        avgAnnualizedROI: 0,
        bestTrade: null,
        worstTrade: null,
        intradayStats: { trades: 0, profit: 0 },
        deliveryStats: { trades: 0, profit: 0 }
      });
    }
    
    const totalNetProfit = closedTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0);
    const totalGrossProfit = closedTrades.reduce((sum, t) => sum + (t.grossProfit || 0), 0);
    const totalFees = closedTrades.reduce((sum, t) => sum + (t.totalFees || 0), 0);
    const totalGst = closedTrades.reduce((sum, t) => sum + (t.totalGst || 0), 0);
    const totalInvested = closedTrades.reduce((sum, t) => sum + (t.buyPrice * t.quantity), 0);
    
    const winningTrades = closedTrades.filter(t => t.netProfit > 0);
    const losingTrades = closedTrades.filter(t => t.netProfit < 0);
    const winRate = (winningTrades.length / totalTrades) * 100;
    
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + t.netProfit, 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0 
      ? losingTrades.reduce((sum, t) => sum + t.netProfit, 0) / losingTrades.length 
      : 0;
    
    const avgProfit = totalNetProfit / totalTrades;
    const avgHoldingDays = closedTrades.reduce((sum, t) => sum + (t.holdingDays || 0), 0) / totalTrades;
    const avgROI = closedTrades.reduce((sum, t) => sum + (t.annualizedROI || 0), 0) / totalTrades;
    
    const sortedByProfit = [...closedTrades].sort((a, b) => b.netProfit - a.netProfit);
    const bestTrade = sortedByProfit[0];
    const worstTrade = sortedByProfit[sortedByProfit.length - 1];
    
    const intradayTrades = closedTrades.filter(t => t.tradeType === 'intraday');
    const deliveryTrades = closedTrades.filter(t => t.tradeType === 'delivery');
    
    res.json({
      totalTrades,
      totalNetProfit: Math.round(totalNetProfit * 100) / 100,
      totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      overallROI: totalInvested > 0 ? Math.round((totalNetProfit / totalInvested) * 100 * 100) / 100 : 0,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: Math.round(winRate * 100) / 100,
      avgProfit: Math.round(avgProfit * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      avgHoldingDays: Math.round(avgHoldingDays * 10) / 10,
      avgAnnualizedROI: Math.round(avgROI * 100) / 100,
      bestTrade: bestTrade ? { 
        stockSymbol: bestTrade.stockSymbol, 
        netProfit: bestTrade.netProfit,
        profitPercentage: bestTrade.profitPercentage
      } : null,
      worstTrade: worstTrade ? { 
        stockSymbol: worstTrade.stockSymbol, 
        netProfit: worstTrade.netProfit,
        profitPercentage: worstTrade.profitPercentage
      } : null,
      intradayStats: {
        trades: intradayTrades.length,
        profit: Math.round(intradayTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0) * 100) / 100
      },
      deliveryStats: {
        trades: deliveryTrades.length,
        profit: Math.round(deliveryTrades.reduce((sum, t) => sum + (t.netProfit || 0), 0) * 100) / 100
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMonthlySummary = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    
    const trades = await Trade.find({ user: req.userId, status: 'closed' });
    
    const monthlyData = {};
    trades.forEach(trade => {
      const date = new Date(trade.sellDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = { month: key, trades: 0, profit: 0, fees: 0, wins: 0 };
      }
      
      monthlyData[key].trades++;
      monthlyData[key].profit += trade.netProfit || 0;
      monthlyData[key].fees += trade.totalFees || 0;
      if (trade.netProfit > 0) monthlyData[key].wins++;
    });
    
    const sorted = Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month));
    const total = sorted.length;
    const paginated = sorted.slice((page - 1) * limit, page * limit);
    
    res.json({
      data: paginated.map(m => ({
        ...m,
        profit: Math.round(m.profit * 100) / 100,
        fees: Math.round(m.fees * 100) / 100,
        winRate: m.trades > 0 ? Math.round((m.wins / m.trades) * 100) : 0
      })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfitByPeriod = async (req, res) => {
  try {
    const { period } = req.params;
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return res.status(400).json({ message: 'Invalid period' });
    }
    
    const trades = await Trade.find({
      user: req.userId,
      status: 'closed',
      sellDate: { $gte: startDate, $lte: now }
    });
    
    const totalProfit = trades.reduce((sum, t) => sum + (t.netProfit || 0), 0);
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.netProfit > 0).length;
    
    res.json({
      period,
      startDate,
      endDate: now,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalTrades,
      winningTrades,
      losingTrades: totalTrades - winningTrades,
      winRate: totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100 * 100) / 100 : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [allTrades, openTrades, todayTrades, weekTrades, monthTrades, recentTrades] = await Promise.all([
      Trade.find({ user: req.userId, status: 'closed' }),
      Trade.find({ user: req.userId, status: 'open' }),
      Trade.find({ user: req.userId, status: 'closed', sellDate: { $gte: todayStart } }),
      Trade.find({ user: req.userId, status: 'closed', sellDate: { $gte: weekStart } }),
      Trade.find({ user: req.userId, status: 'closed', sellDate: { $gte: monthStart } }),
      Trade.find({ user: req.userId }).sort({ createdAt: -1 }).limit(5).populate('stock', 'symbol name')
    ]);
    
    const calculateStats = (trades) => ({
      count: trades.length,
      profit: Math.round(trades.reduce((sum, t) => sum + (t.netProfit || 0), 0) * 100) / 100,
      fees: Math.round(trades.reduce((sum, t) => sum + (t.totalFees || 0), 0) * 100) / 100,
      wins: trades.filter(t => t.netProfit > 0).length
    });
    
    const openValue = openTrades.reduce((sum, t) => sum + (t.buyPrice * t.quantity), 0);
    const avgOpenHoldingDays = openTrades.length > 0
      ? openTrades.reduce((sum, t) => {
          const days = Math.ceil((now - new Date(t.buyDate)) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / openTrades.length
      : 0;
    
    res.json({
      overall: calculateStats(allTrades),
      daily: calculateStats(todayTrades),
      weekly: calculateStats(weekTrades),
      monthly: calculateStats(monthTrades),
      openPositions: {
        count: openTrades.length,
        totalValue: Math.round(openValue * 100) / 100,
        avgHoldingDays: Math.round(avgOpenHoldingDays)
      },
      recentTrades
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfitTrend = async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const trades = await Trade.find({
      user: req.userId,
      status: 'closed',
      sellDate: { $gte: startDate }
    }).sort({ sellDate: 1 });
    
    const groupedData = {};
    
    trades.forEach(trade => {
      const date = new Date(trade.sellDate);
      let key;
      
      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!groupedData[key]) {
        groupedData[key] = { date: key, profit: 0, trades: 0 };
      }
      groupedData[key].profit += trade.netProfit || 0;
      groupedData[key].trades++;
    });
    
    const result = Object.values(groupedData).map(d => ({
      ...d,
      profit: Math.round(d.profit * 100) / 100
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
