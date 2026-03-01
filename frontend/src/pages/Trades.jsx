import { useState, useEffect, useRef } from 'react';
import { tradeApi, stockApi, feeApi, aiApi } from '../services/api';
import { format } from 'date-fns';

function Trades() {
  const [trades, setTrades] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [closingTrade, setClosingTrade] = useState(null);
  const [viewingTrade, setViewingTrade] = useState(null);
  const [closePreview, setClosePreview] = useState(null);
  const [filter, setFilter] = useState({ status: '', tradeType: '', search: '' });
  const [sortBy, setSortBy] = useState('buyDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [csvData, setCsvData] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [savedAnalysis, setSavedAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const dropdownRef = useRef(null);

  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const initialFormState = {
    stockId: '',
    stockDisplay: '',
    tradeType: 'delivery',
    quantity: '',
    buyPrice: '',
    buyDate: format(new Date(), 'yyyy-MM-dd'),
    sellPrice: '',
    sellDate: '',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [closeFormData, setCloseFormData] = useState({
    sellPrice: '',
    sellDate: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchTrades();
  }, [filter, sortBy, sortOrder, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowStockDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    calculateFees();
  }, [formData.tradeType, formData.buyPrice, formData.sellPrice, formData.quantity]);

  useEffect(() => {
    if (closingTrade && closeFormData.sellPrice) {
      fetchClosePreview();
    }
  }, [closeFormData.sellPrice, closeFormData.sellDate]);

  const fetchTrades = async () => {
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder
      };
      if (filter.status) params.status = filter.status;
      if (filter.tradeType) params.tradeType = filter.tradeType;
      if (filter.search) params.search = filter.search;
      
      const response = await tradeApi.getAll(params);
      setTrades(response.data.trades);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
      setSelectedTrades([]);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStocks = async () => {
    try {
      const response = await stockApi.getAll({ active: true });
      setStocks(response.data);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  const calculateFees = async () => {
    if (!formData.tradeType || !formData.buyPrice || !formData.quantity) {
      setFeeBreakdown(null);
      return;
    }

    try {
      const response = await feeApi.calculate({
        tradeType: formData.tradeType,
        buyPrice: parseFloat(formData.buyPrice),
        sellPrice: formData.sellPrice ? parseFloat(formData.sellPrice) : null,
        quantity: parseInt(formData.quantity)
      });
      setFeeBreakdown(response.data);
    } catch (error) {
      console.error('Error calculating fees:', error);
    }
  };

  const fetchClosePreview = async () => {
    if (!closingTrade || !closeFormData.sellPrice) return;
    try {
      const response = await tradeApi.previewClose(closingTrade._id, {
        sellPrice: parseFloat(closeFormData.sellPrice),
        sellDate: closeFormData.sellDate
      });
      setClosePreview(response.data);
    } catch (error) {
      console.error('Error fetching close preview:', error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value);
  };

  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStockSelect = (stock) => {
    setFormData({
      ...formData,
      stockId: stock._id,
      stockDisplay: `${stock.symbol} - ${stock.name}`
    });
    setSearchQuery('');
    setShowStockDropdown(false);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        stockId: formData.stockId,
        tradeType: formData.tradeType,
        quantity: parseInt(formData.quantity),
        buyPrice: parseFloat(formData.buyPrice),
        buyDate: formData.buyDate,
        notes: formData.notes
      };

      if (formData.sellPrice && formData.sellDate) {
        data.sellPrice = parseFloat(formData.sellPrice);
        data.sellDate = formData.sellDate;
      }

      if (editingTrade) {
        await tradeApi.update(editingTrade._id, data);
      } else {
        await tradeApi.create(data);
      }

      setShowModal(false);
      setEditingTrade(null);
      setFormData(initialFormState);
      setFeeBreakdown(null);
      fetchTrades();
    } catch (error) {
      console.error('Error saving trade:', error);
      alert(error.response?.data?.message || 'Error saving trade');
    }
  };

  const handleCloseTrade = async (e) => {
    e.preventDefault();
    
    try {
      await tradeApi.close(closingTrade._id, {
        sellPrice: parseFloat(closeFormData.sellPrice),
        sellDate: closeFormData.sellDate
      });

      setShowCloseModal(false);
      setClosingTrade(null);
      setClosePreview(null);
      setCloseFormData({ sellPrice: '', sellDate: format(new Date(), 'yyyy-MM-dd') });
      fetchTrades();
    } catch (error) {
      console.error('Error closing trade:', error);
      alert(error.response?.data?.message || 'Error closing trade');
    }
  };

  const handleImport = async () => {
    setImportLoading(true);
    try {
      const response = await tradeApi.importCSV({ csvData });
      const result = response.data;
      
      setShowImportModal(false);
      setCsvData('');
      
      if (result.success > 0) {
        addNotification(`Successfully imported ${result.success} trades`, 'success');
        fetchTrades();
        fetchStocks();
      }
      
      if (result.errors && result.errors.length > 0) {
        const errorCount = result.errors.length;
        addNotification(`${errorCount} row(s) had errors during import`, 'error');
      }
      
      if (result.success === 0 && (!result.errors || result.errors.length === 0)) {
        addNotification('No trades were imported', 'warning');
      }
    } catch (error) {
      setShowImportModal(false);
      setCsvData('');
      addNotification(error.response?.data?.message || 'Error importing CSV', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const handleEdit = (trade) => {
    setEditingTrade(trade);
    setFormData({
      stockId: trade.stock._id || trade.stock,
      stockDisplay: `${trade.stockSymbol} - ${trade.stockName}`,
      tradeType: trade.tradeType,
      quantity: trade.quantity.toString(),
      buyPrice: trade.buyPrice.toString(),
      buyDate: format(new Date(trade.buyDate), 'yyyy-MM-dd'),
      sellPrice: trade.sellPrice ? trade.sellPrice.toString() : '',
      sellDate: trade.sellDate ? format(new Date(trade.sellDate), 'yyyy-MM-dd') : '',
      notes: trade.notes || ''
    });
    setShowModal(true);
  };

  const handleView = async (trade) => {
    try {
      const response = await tradeApi.getOne(trade._id);
      setViewingTrade(response.data);
      setAiSuggestion(null);
      setSavedAnalysis(null);
      setShowDetailModal(true);
      
      // Fetch saved analysis for this trade
      try {
        const analysisResponse = await aiApi.getAnalysisByTrade(trade._id);
        setSavedAnalysis(analysisResponse.data);
      } catch (analysisError) {
        // No saved analysis found - that's ok
        if (analysisError.response?.status !== 404) {
          console.error('Error fetching saved analysis:', analysisError);
        }
      }
    } catch (error) {
      console.error('Error fetching trade details:', error);
    }
  };

  const fetchAiSuggestion = async (tradeId, isReanalyze = false) => {
    setAiLoading(true);
    try {
      const response = await aiApi.getTradeExitSuggestion(tradeId);
      setAiSuggestion(response.data);
      
      if (response.data.cached && !isReanalyze) {
        addNotification('Showing cached suggestion (refreshes hourly)', 'warning');
      } else {
        // Auto-save new analysis
        try {
          const saveResponse = await aiApi.saveAnalysis({
            tradeId: tradeId,
            suggestion: response.data
          });
          setSavedAnalysis(saveResponse.data);
          addNotification('AI analysis generated and saved to AI Insights', 'success');
        } catch (saveError) {
          console.error('Error auto-saving AI suggestion:', saveError);
        }
      }
    } catch (error) {
      console.error('Error fetching AI suggestion:', error);
      if (error.response?.status === 429) {
        addNotification('Rate limit reached. Please wait 30 seconds and try again.', 'warning');
      } else {
        addNotification(error.response?.data?.message || 'Failed to get AI suggestion', 'error');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      try {
        await tradeApi.delete(id);
        fetchTrades();
      } catch (error) {
        console.error('Error deleting trade:', error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTrades.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedTrades.length} selected trade(s)?`)) {
      try {
        const response = await tradeApi.bulkDelete(selectedTrades);
        alert(response.data.message);
        setSelectedTrades([]);
        fetchTrades();
      } catch (error) {
        console.error('Error bulk deleting trades:', error);
        alert('Error deleting trades');
      }
    }
  };

  const toggleSelectTrade = (id) => {
    setSelectedTrades(prev => 
      prev.includes(id) 
        ? prev.filter(t => t !== id) 
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTrades.length === trades.length) {
      setSelectedTrades([]);
    } else {
      setSelectedTrades(trades.map(t => t._id));
    }
  };

  const openCloseModal = (trade) => {
    setClosingTrade(trade);
    setClosePreview(null);
    setCloseFormData({ sellPrice: '', sellDate: format(new Date(), 'yyyy-MM-dd') });
    setShowCloseModal(true);
  };

  const openNewTradeModal = () => {
    setEditingTrade(null);
    setFormData(initialFormState);
    setFeeBreakdown(null);
    setShowModal(true);
  };

  const SortHeader = ({ field, children }) => (
    <th className="sortable-header" onClick={() => handleSort(field)}>
      {children}
      <span className={`sort-icon ${sortBy === field ? 'active' : ''}`}>
        {sortBy === field ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Trades</h1>
        <div className="quick-actions">
          {selectedTrades.length > 0 && (
            <button className="btn btn-danger" onClick={handleBulkDelete}>
              Delete Selected ({selectedTrades.length})
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => { setShowImportModal(true); setCsvData(''); }}>
            Import CSV
          </button>
          <button className="btn btn-primary" onClick={openNewTradeModal}>
            + Add Trade
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search by stock name or symbol..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>
        
        <div className="filter-toggles">
          <button 
            className={`filter-toggle ${filter.status === '' ? 'active' : ''}`}
            onClick={() => setFilter({ ...filter, status: '' })}
          >
            All
          </button>
          <button 
            className={`filter-toggle ${filter.status === 'open' ? 'active' : ''}`}
            onClick={() => setFilter({ ...filter, status: 'open' })}
          >
            Open
          </button>
          <button 
            className={`filter-toggle ${filter.status === 'closed' ? 'active' : ''}`}
            onClick={() => setFilter({ ...filter, status: 'closed' })}
          >
            Closed
          </button>
        </div>

        <div className="filter-toggles">
          <button 
            className={`filter-toggle ${filter.tradeType === '' ? 'active' : ''}`}
            onClick={() => setFilter({ ...filter, tradeType: '' })}
          >
            All Types
          </button>
          <button 
            className={`filter-toggle ${filter.tradeType === 'intraday' ? 'active' : ''}`}
            onClick={() => setFilter({ ...filter, tradeType: 'intraday' })}
          >
            Intraday
          </button>
          <button 
            className={`filter-toggle ${filter.tradeType === 'delivery' ? 'active' : ''}`}
            onClick={() => setFilter({ ...filter, tradeType: 'delivery' })}
          >
            Delivery
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center">Loading...</div>
          ) : trades.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No trades found</div>
              <p>Add your first trade to start tracking.</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={trades.length > 0 && selectedTrades.length === trades.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <SortHeader field="stockName">Stock</SortHeader>
                      <th>Type</th>
                      <SortHeader field="quantity">Qty</SortHeader>
                      <SortHeader field="buyPrice">Buy Price</SortHeader>
                      <SortHeader field="buyDate">Buy Date</SortHeader>
                      <th>Sell Price</th>
                      <SortHeader field="sellDate">Sell Date</SortHeader>
                      <th>Fees</th>
                      <th>Status</th>
                      <SortHeader field="netProfit">P&L</SortHeader>
                      <SortHeader field="annualizedROI">ROI</SortHeader>
                      <th>Days</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade._id} className={selectedTrades.includes(trade._id) ? 'selected-row' : ''}>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={selectedTrades.includes(trade._id)}
                            onChange={() => toggleSelectTrade(trade._id)}
                          />
                        </td>
                        <td><strong>{trade.stockName}</strong></td>
                        <td>
                          <span className={`badge ${trade.tradeType === 'intraday' ? 'badge-info' : 'badge-secondary'}`}>
                            {trade.tradeType}
                          </span>
                        </td>
                        <td>{trade.quantity}</td>
                        <td>{formatCurrency(trade.buyPrice)}</td>
                        <td>{format(new Date(trade.buyDate), 'dd MMM yy')}</td>
                        <td>{trade.sellPrice ? formatCurrency(trade.sellPrice) : '-'}</td>
                        <td>{trade.sellDate ? format(new Date(trade.sellDate), 'dd MMM yy') : '-'}</td>
                        <td>{formatCurrency(trade.totalFees)}</td>
                        <td>
                          <span className={`badge ${trade.status === 'open' ? 'badge-warning' : 'badge-success'}`}>
                            {trade.status}
                          </span>
                        </td>
                        <td className="text-right">
                          {trade.status === 'closed' ? (
                            <div>
                              <span className={`profit-display ${trade.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                                {formatCurrency(trade.netProfit)}
                              </span>
                              <div className="text-secondary" style={{ fontSize: '0.7rem' }}>
                                {trade.profitPercentage >= 0 ? '+' : ''}{trade.profitPercentage}%
                              </div>
                            </div>
                          ) : '-'}
                        </td>
                        <td>
                          {trade.status === 'closed' ? (
                            <span className={trade.annualizedROI >= 0 ? 'text-success' : 'text-danger'}>
                              {trade.annualizedROI >= 0 ? '+' : ''}{trade.annualizedROI}%
                            </span>
                          ) : '-'}
                        </td>
                        <td>{trade.holdingDays !== null ? trade.holdingDays : '-'}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn btn-secondary btn-sm" onClick={() => handleView(trade)} title="View">
                              👁
                            </button>
                            {trade.status === 'open' && (
                              <button className="btn btn-success btn-sm" onClick={() => openCloseModal(trade)} title="Close">
                                ✓
                              </button>
                            )}
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(trade)} title="Edit">
                              ✎
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(trade._id)} title="Delete">
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <div className="pagination-info">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '0 0.5rem', color: 'var(--text-secondary)' }}>
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    className="pagination-btn"
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= pagination.pages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Trade Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTrade ? 'Edit Trade' : 'Add New Trade'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Stock *</label>
                  <div className="search-dropdown" ref={dropdownRef}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search stock..."
                      value={formData.stockDisplay || searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setFormData({ ...formData, stockDisplay: '', stockId: '' });
                        setShowStockDropdown(true);
                      }}
                      onFocus={() => setShowStockDropdown(true)}
                      required
                    />
                    {showStockDropdown && (searchQuery || !formData.stockId) && (
                      <div className="search-dropdown-menu">
                        {filteredStocks.length === 0 ? (
                          <div className="search-dropdown-item text-secondary">
                            No stocks found. Add in Settings.
                          </div>
                        ) : (
                          filteredStocks.map((stock) => (
                            <div key={stock._id} className="search-dropdown-item" onClick={() => handleStockSelect(stock)}>
                              <span className="search-dropdown-item-symbol">{stock.symbol}</span>
                              <span className="search-dropdown-item-name">{stock.name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Trade Type *</label>
                    <select className="form-control" value={formData.tradeType} onChange={(e) => setFormData({ ...formData, tradeType: e.target.value })} required>
                      <option value="delivery">Delivery</option>
                      <option value="intraday">Intraday</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input type="number" className="form-control" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} min="1" required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Buy Price *</label>
                    <input type="number" className="form-control" value={formData.buyPrice} onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })} step="0.01" min="0" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Buy Date *</label>
                    <input type="date" className="form-control" value={formData.buyDate} onChange={(e) => setFormData({ ...formData, buyDate: e.target.value })} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Sell Price</label>
                    <input type="number" className="form-control" value={formData.sellPrice} onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })} step="0.01" min="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sell Date</label>
                    <input type="date" className="form-control" value={formData.sellDate} onChange={(e) => setFormData({ ...formData, sellDate: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2" />
                </div>

                {feeBreakdown && (
                  <div className="fee-breakdown">
                    <div className="fee-breakdown-title">Fee Preview</div>
                    {feeBreakdown.feeBreakdown.map((fee, index) => (
                      <div key={index} className="fee-breakdown-item">
                        <span>{fee.name} ({fee.side})</span>
                        <span>{formatCurrency(fee.amount)} {fee.gst > 0 && <small>+ GST {formatCurrency(fee.gst)}</small>}</span>
                      </div>
                    ))}
                    <div className="fee-breakdown-total">
                      <span>Total Fees (incl. GST)</span>
                      <span>{formatCurrency(feeBreakdown.totalFees)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!formData.stockId}>{editingTrade ? 'Update' : 'Add'} Trade</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Trade Modal */}
      {showCloseModal && closingTrade && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Close Trade - {closingTrade.stockName}</h3>
              <button className="modal-close" onClick={() => setShowCloseModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCloseTrade}>
              <div className="modal-body">
                <div className="mb-2">
                  <strong>Buy:</strong> {closingTrade.quantity} shares @ {formatCurrency(closingTrade.buyPrice)} on {format(new Date(closingTrade.buyDate), 'dd MMM yyyy')}
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Sell Price *</label>
                    <input type="number" className="form-control" value={closeFormData.sellPrice} onChange={(e) => setCloseFormData({ ...closeFormData, sellPrice: e.target.value })} step="0.01" min="0" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sell Date *</label>
                    <input type="date" className="form-control" value={closeFormData.sellDate} onChange={(e) => setCloseFormData({ ...closeFormData, sellDate: e.target.value })} required />
                  </div>
                </div>

                {closePreview && (
                  <div className="fee-breakdown">
                    <div className="fee-breakdown-title">P&L Preview</div>
                    <div className="fee-breakdown-item">
                      <span>Gross Profit</span>
                      <span className={closePreview.grossProfit >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(closePreview.grossProfit)}</span>
                    </div>
                    <div className="fee-breakdown-item">
                      <span>Estimated Fees</span>
                      <span>{formatCurrency(closePreview.totalFees)}</span>
                    </div>
                    <div className="fee-breakdown-total">
                      <span>Net Profit</span>
                      <span className={closePreview.netProfit >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(closePreview.netProfit)}</span>
                    </div>
                    <div className="fee-breakdown-item">
                      <span>Return %</span>
                      <span className={closePreview.profitPercentage >= 0 ? 'text-success' : 'text-danger'}>{closePreview.profitPercentage}%</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCloseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">Close Trade</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trade Detail Modal */}
      {showDetailModal && viewingTrade && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{viewingTrade.stockName} - Trade Details</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="trade-detail-section">
                <div className="trade-detail-title">Buy Details</div>
                <div className="trade-detail-grid">
                  <div className="trade-detail-item">
                    <div className="trade-detail-label">Price</div>
                    <div className="trade-detail-value">{formatCurrency(viewingTrade.buyPrice)}</div>
                  </div>
                  <div className="trade-detail-item">
                    <div className="trade-detail-label">Quantity</div>
                    <div className="trade-detail-value">{viewingTrade.quantity}</div>
                  </div>
                  <div className="trade-detail-item">
                    <div className="trade-detail-label">Date</div>
                    <div className="trade-detail-value">{format(new Date(viewingTrade.buyDate), 'dd MMM yyyy')}</div>
                  </div>
                  <div className="trade-detail-item">
                    <div className="trade-detail-label">Buy Value</div>
                    <div className="trade-detail-value">{formatCurrency(viewingTrade.buyPrice * viewingTrade.quantity)}</div>
                  </div>
                </div>
              </div>

              {viewingTrade.status === 'closed' && (
                <div className="trade-detail-section">
                  <div className="trade-detail-title">Sell Details</div>
                  <div className="trade-detail-grid">
                    <div className="trade-detail-item">
                      <div className="trade-detail-label">Price</div>
                      <div className="trade-detail-value">{formatCurrency(viewingTrade.sellPrice)}</div>
                    </div>
                    <div className="trade-detail-item">
                      <div className="trade-detail-label">Date</div>
                      <div className="trade-detail-value">{format(new Date(viewingTrade.sellDate), 'dd MMM yyyy')}</div>
                    </div>
                    <div className="trade-detail-item">
                      <div className="trade-detail-label">Sell Value</div>
                      <div className="trade-detail-value">{formatCurrency(viewingTrade.sellPrice * viewingTrade.quantity)}</div>
                    </div>
                    <div className="trade-detail-item">
                      <div className="trade-detail-label">Holding Days</div>
                      <div className="trade-detail-value">{viewingTrade.holdingDays}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="trade-detail-section">
                <div className="trade-detail-title">Fee Breakdown</div>
                <table className="fee-table">
                  <tbody>
                    {viewingTrade.feeBreakdown?.map((fee, idx) => (
                      <tr key={idx}>
                        <td>{fee.name} ({fee.side})</td>
                        <td>{formatCurrency(fee.amount)}</td>
                      </tr>
                    ))}
                    {viewingTrade.feeBreakdown?.filter(f => f.gst > 0).map((fee, idx) => (
                      <tr key={`gst-${idx}`}>
                        <td>GST on {fee.name}</td>
                        <td>{formatCurrency(fee.gst)}</td>
                      </tr>
                    ))}
                    <tr className="fee-total">
                      <td><strong>Total Fees</strong></td>
                      <td><strong>{formatCurrency(viewingTrade.totalFees)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {viewingTrade.status === 'closed' && (
                <div className="trade-detail-section">
                  <div className="trade-detail-title">Profit Summary</div>
                  <div className="trade-detail-grid">
                    <div className="trade-detail-item">
                      <div className="trade-detail-label">Gross Profit</div>
                      <div className={`trade-detail-value ${viewingTrade.grossProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(viewingTrade.grossProfit)}
                      </div>
                    </div>
                    <div className="trade-detail-item">
                      <div className="trade-detail-label">Total Fees</div>
                      <div className="trade-detail-value">{formatCurrency(viewingTrade.totalFees)}</div>
                    </div>
                    <div className="trade-detail-item">
                      <div className="trade-detail-label">Net Profit</div>
                      <div className={`trade-detail-value ${viewingTrade.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(viewingTrade.netProfit)}
                      </div>
                    </div>
                    <div className="trade-detail-item">
                      <div className="trade-detail-label">Return %</div>
                      <div className={`trade-detail-value ${viewingTrade.profitPercentage >= 0 ? 'text-success' : 'text-danger'}`}>
                        {viewingTrade.profitPercentage}%
                      </div>
                    </div>
                    <div className="trade-detail-item">
                      <div className="trade-detail-label">Annualized ROI</div>
                      <div className={`trade-detail-value ${viewingTrade.annualizedROI >= 0 ? 'text-success' : 'text-danger'}`}>
                        {viewingTrade.annualizedROI}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewingTrade.notes && (
                <div className="trade-detail-section">
                  <div className="trade-detail-title">Notes</div>
                  <p>{viewingTrade.notes}</p>
                </div>
              )}

              {viewingTrade.status === 'open' && (
                <div className="trade-detail-section">
                  <div className="trade-detail-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      AI Exit Suggestion
                      {savedAnalysis && !aiSuggestion && (
                        <span className="badge badge-secondary" style={{ marginLeft: '0.5rem' }}>
                          Saved {format(new Date(savedAnalysis.createdAt), 'MMM dd, HH:mm')}
                        </span>
                      )}
                      {aiSuggestion?.cached && <span className="badge badge-secondary" style={{ marginLeft: '0.5rem' }}>Cached</span>}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!aiSuggestion && !savedAnalysis && !aiLoading && (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => fetchAiSuggestion(viewingTrade._id)}
                        >
                          Get AI Suggestion
                        </button>
                      )}
                      {(aiSuggestion || savedAnalysis) && !aiLoading && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => fetchAiSuggestion(viewingTrade._id, true)}
                        >
                          Re-analyze
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {aiLoading && (
                    <div className="ai-loading">
                      <div className="loading-spinner" style={{ width: 24, height: 24 }}></div>
                      <span>Analyzing trade...</span>
                    </div>
                  )}

                  {(aiSuggestion || savedAnalysis?.suggestion) && !aiLoading && (
                    <div className="ai-suggestion">
                      {(() => {
                        const suggestion = aiSuggestion || savedAnalysis?.suggestion;
                        return (
                          <>
                            <div className="ai-suggestion-grid">
                              <div className="ai-suggestion-item">
                                <div className="ai-suggestion-label">Recommendation</div>
                                <div className={`ai-suggestion-value recommendation ${
                                  suggestion.recommendation === 'Hold' ? 'hold' : 
                                  suggestion.recommendation === 'Consider Selling' ? 'sell' : 'caution'
                                }`}>
                                  {suggestion.recommendation}
                                </div>
                              </div>
                              <div className="ai-suggestion-item">
                                <div className="ai-suggestion-label">Risk Level</div>
                                <div className={`ai-suggestion-value risk ${suggestion.riskLevel?.toLowerCase()}`}>
                                  {suggestion.riskLevel}
                                </div>
                              </div>
                              <div className="ai-suggestion-item">
                                <div className="ai-suggestion-label">Target Price Range</div>
                                <div className="ai-suggestion-value text-success">
                                  {formatCurrency(suggestion.targetPriceRange?.min)} - {formatCurrency(suggestion.targetPriceRange?.max)}
                                  <span className="ai-percentage">({suggestion.targetPriceRange?.percentageGain})</span>
                                </div>
                              </div>
                              <div className="ai-suggestion-item">
                                <div className="ai-suggestion-label">Stop Loss</div>
                                <div className="ai-suggestion-value text-danger">
                                  {formatCurrency(suggestion.stopLoss?.price)}
                                  <span className="ai-percentage">(-{suggestion.stopLoss?.percentageLoss})</span>
                                </div>
                              </div>
                            </div>

                            <div className="ai-reasoning">
                              <strong>Analysis:</strong> {suggestion.reasoning}
                            </div>

                            <div className="ai-factors">
                              <strong>Key Factors:</strong>
                              <ul>
                                {suggestion.keyFactors?.map((factor, idx) => (
                                  <li key={idx}>{factor}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="ai-disclaimer">
                              {suggestion.disclaimer}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => !importLoading && setShowImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', position: 'relative' }}>
            {importLoading && (
              <div className="import-loading-overlay">
                <div className="import-spinner"></div>
                <p>Importing trades... Please wait</p>
              </div>
            )}
            <div className="modal-header">
              <h3 className="modal-title">Import Trades from CSV</h3>
              <button className="modal-close" onClick={() => setShowImportModal(false)} disabled={importLoading}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="mb-2">Upload a CSV file or paste data below.</p>
              <p className="mb-2">Required columns: <code>symbol</code>, <code>quantity</code>, <code>buy_price</code>, <code>buy_date</code></p>
              <p className="mb-2 text-secondary" style={{ fontSize: '0.8rem' }}>Optional: <code>name</code>, <code>trade_type</code>, <code>sell_price</code>, <code>sell_date</code>, <code>notes</code></p>
              
              <div 
                className="csv-dropzone"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');
                  const file = e.dataTransfer.files[0];
                  if (file && file.name.endsWith('.csv')) {
                    const reader = new FileReader();
                    reader.onload = (evt) => setCsvData(evt.target.result);
                    reader.readAsText(file);
                  }
                }}
                onClick={() => document.getElementById('csv-file-input').click()}
              >
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => setCsvData(evt.target.result);
                      reader.readAsText(file);
                    }
                  }}
                />
                <div className="dropzone-content">
                  <span style={{ fontSize: '2rem' }}>📄</span>
                  <p>Drag & drop a CSV file here, or click to select</p>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Or paste CSV data directly</label>
                <textarea
                  className="form-control"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  rows="8"
                  placeholder="symbol,quantity,buy_price,buy_date,trade_type,sell_price,sell_date
RELIANCE,10,2500,2024-01-15,delivery,2600,2024-02-20
TCS,5,3800,2024-01-20,intraday,3850,2024-01-20"
                />
              </div>

              {csvData && (
                <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Preview: {csvData.split('\n').length} rows loaded
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowImportModal(false); setCsvData(''); }} disabled={importLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={!csvData.trim() || importLoading}>
                {importLoading ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`notification notification-${notification.type}`}
            onClick={() => removeNotification(notification.id)}
          >
            <span className="notification-icon">
              {notification.type === 'success' && '✓'}
              {notification.type === 'error' && '✕'}
              {notification.type === 'warning' && '⚠'}
            </span>
            <span className="notification-message">{notification.message}</span>
            <button className="notification-close">&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Trades;
