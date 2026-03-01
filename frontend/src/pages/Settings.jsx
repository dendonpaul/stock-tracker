import { useState, useEffect } from 'react';
import { stockApi, feeApi } from '../services/api';

function Settings() {
  const [activeTab, setActiveTab] = useState('stocks');
  const [stocks, setStocks] = useState([]);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockSearch, setStockSearch] = useState('');
  const [stockPage, setStockPage] = useState(1);
  const stocksPerPage = 25;
  
  const [showStockModal, setShowStockModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [editingFee, setEditingFee] = useState(null);

  const initialStockForm = { symbol: '', name: '', sector: '' };
  const initialFeeForm = {
    name: '',
    tradeType: 'delivery',
    feeType: 'percentage',
    value: '',
    appliesTo: 'both',
    gstApplicable: false,
    description: ''
  };

  const [stockForm, setStockForm] = useState(initialStockForm);
  const [feeForm, setFeeForm] = useState(initialFeeForm);

  useEffect(() => {
    fetchData();
  }, []);

  // Filter and paginate stocks
  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(stockSearch.toLowerCase()) ||
    stock.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    (stock.sector && stock.sector.toLowerCase().includes(stockSearch.toLowerCase()))
  );
  
  const totalStockPages = Math.ceil(filteredStocks.length / stocksPerPage);
  const paginatedStocks = filteredStocks.slice(
    (stockPage - 1) * stocksPerPage,
    stockPage * stocksPerPage
  );

  // Reset page when search changes
  useEffect(() => {
    setStockPage(1);
  }, [stockSearch]);

  const fetchData = async () => {
    try {
      const [stocksRes, feesRes] = await Promise.all([
        stockApi.getAll(),
        feeApi.getAll()
      ]);
      setStocks(stocksRes.data);
      setFees(feesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStock) {
        await stockApi.update(editingStock._id, stockForm);
      } else {
        await stockApi.create(stockForm);
      }
      setShowStockModal(false);
      setEditingStock(null);
      setStockForm(initialStockForm);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving stock');
    }
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...feeForm,
        value: parseFloat(feeForm.value)
      };
      
      if (editingFee) {
        await feeApi.update(editingFee._id, data);
      } else {
        await feeApi.create(data);
      }
      setShowFeeModal(false);
      setEditingFee(null);
      setFeeForm(initialFeeForm);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving fee');
    }
  };

  const loadStockDefaults = async () => {
    if (window.confirm('This will add 305 default stocks to your list. Continue?')) {
      try {
        const response = await stockApi.loadDefaults();
        alert(response.data.message);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.message || 'Error loading defaults');
      }
    }
  };

  const clearAllStocks = async () => {
    if (window.confirm('This will delete ALL stocks. Are you sure?')) {
      try {
        const response = await stockApi.clearAll();
        alert(response.data.message);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.message || 'Error clearing stocks');
      }
    }
  };

  const loadFeeDefaults = async () => {
    if (window.confirm('This will add default Indian market fees. Continue?')) {
      try {
        const response = await feeApi.loadDefaults();
        alert(response.data.message);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.message || 'Error loading defaults');
      }
    }
  };

  const clearAllFees = async () => {
    if (window.confirm('This will delete ALL fee configurations. Are you sure?')) {
      try {
        const response = await feeApi.clearAll();
        alert(response.data.message);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.message || 'Error clearing fees');
      }
    }
  };

  const editStock = (stock) => {
    setEditingStock(stock);
    setStockForm({
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector || ''
    });
    setShowStockModal(true);
  };

  const deleteStock = async (id) => {
    if (window.confirm('Delete this stock?')) {
      try {
        await stockApi.delete(id);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting stock');
      }
    }
  };

  const editFee = (fee) => {
    setEditingFee(fee);
    setFeeForm({
      name: fee.name,
      tradeType: fee.tradeType,
      feeType: fee.feeType,
      value: fee.value.toString(),
      appliesTo: fee.appliesTo,
      gstApplicable: fee.gstApplicable || false,
      description: fee.description || ''
    });
    setShowFeeModal(true);
  };

  const deleteFee = async (id) => {
    if (window.confirm('Delete this fee configuration?')) {
      try {
        await feeApi.delete(id);
        fetchData();
      } catch (error) {
        alert(error.response?.data?.message || 'Error deleting fee');
      }
    }
  };

  const toggleFeeActive = async (fee) => {
    try {
      await feeApi.update(fee._id, { isActive: !fee.isActive });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating fee');
    }
  };

  const intradayFees = fees.filter(f => f.tradeType === 'intraday');
  const deliveryFees = fees.filter(f => f.tradeType === 'delivery');

  if (loading) {
    return <div className="text-center mt-3">Loading...</div>;
  }

  return (
    <div>
      <h1 className="page-title mb-3">Settings</h1>

      <div className="tabs">
        <button className={`tab ${activeTab === 'stocks' ? 'active' : ''}`} onClick={() => setActiveTab('stocks')}>
          Stocks ({stocks.length})
        </button>
        <button className={`tab ${activeTab === 'fees' ? 'active' : ''}`} onClick={() => setActiveTab('fees')}>
          Fee Configuration ({fees.length})
        </button>
      </div>

      {activeTab === 'stocks' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Manage Stocks ({stocks.length})</h2>
            <div className="quick-actions">
              <button className="btn btn-secondary btn-sm" onClick={loadStockDefaults}>Load Default Stocks</button>
              <button className="btn btn-danger btn-sm" onClick={clearAllStocks}>Clear All</button>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingStock(null); setStockForm(initialStockForm); setShowStockModal(true); }}>
                + Add Stock
              </button>
            </div>
          </div>
          <div className="card-body">
            {stocks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No stocks added</div>
                <p>Add stocks manually or load 305 default stocks.</p>
              </div>
            ) : (
              <>
                <div className="filter-bar" style={{ marginBottom: '1rem' }}>
                  <div className="filter-search">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      className="filter-search-input"
                      placeholder="Search by symbol, name, or sector..."
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                    />
                  </div>
                  <span className="text-secondary" style={{ fontSize: '0.875rem' }}>
                    Showing {paginatedStocks.length} of {filteredStocks.length} stocks
                  </span>
                </div>

                <div className="table-container">
                  <table className="table table-compact">
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Name</th>
                        <th>Sector</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStocks.map((stock) => (
                        <tr key={stock._id}>
                          <td><strong>{stock.symbol}</strong></td>
                          <td>{stock.name}</td>
                          <td>{stock.sector || '-'}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn btn-secondary btn-sm" onClick={() => editStock(stock)}>Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteStock(stock._id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalStockPages > 1 && (
                  <div className="pagination" style={{ marginTop: '1rem' }}>
                    <div className="pagination-info">
                      Page {stockPage} of {totalStockPages}
                    </div>
                    <div className="pagination-controls">
                      <button
                        className="pagination-btn"
                        onClick={() => setStockPage(p => Math.max(1, p - 1))}
                        disabled={stockPage <= 1}
                      >
                        Previous
                      </button>
                      <button
                        className="pagination-btn"
                        onClick={() => setStockPage(p => Math.min(totalStockPages, p + 1))}
                        disabled={stockPage >= totalStockPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'fees' && (
        <div>
          <div className="card mb-3">
            <div className="card-header">
              <h2 className="card-title">Quick Actions</h2>
            </div>
            <div className="card-body">
              <div className="quick-actions">
                <button className="btn btn-secondary" onClick={loadFeeDefaults}>Load Default Indian Market Fees</button>
                <button className="btn btn-danger" onClick={clearAllFees}>Clear All Fees</button>
              </div>
              <p className="text-secondary mt-2" style={{ fontSize: '0.8rem' }}>
                Defaults include: Brokerage, STT, Exchange Charges, SEBI Charges, Stamp Duty, DP Charges with appropriate GST settings.
              </p>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Intraday Fees</h2>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingFee(null); setFeeForm({ ...initialFeeForm, tradeType: 'intraday' }); setShowFeeModal(true); }}>
                  + Add Fee
                </button>
              </div>
              <div className="card-body">
                {intradayFees.length === 0 ? (
                  <p className="text-secondary text-center">No intraday fees configured</p>
                ) : (
                  <div className="table-container">
                    <table className="table table-compact">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Rate</th>
                          <th>Applies</th>
                          <th>GST</th>
                          <th>Active</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {intradayFees.map((fee) => (
                          <tr key={fee._id}>
                            <td>{fee.name}</td>
                            <td>
                              {fee.feeType === 'percentage' ? `${fee.value}%` : `₹${fee.value}`}
                            </td>
                            <td>{fee.appliesTo}</td>
                            <td>{fee.gstApplicable ? '18%' : '-'}</td>
                            <td>
                              <label className="toggle">
                                <input type="checkbox" checked={fee.isActive} onChange={() => toggleFeeActive(fee)} />
                                <span className="toggle-slider"></span>
                              </label>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button className="btn btn-secondary btn-sm" onClick={() => editFee(fee)}>Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => deleteFee(fee._id)}>Del</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Delivery Fees</h2>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingFee(null); setFeeForm({ ...initialFeeForm, tradeType: 'delivery' }); setShowFeeModal(true); }}>
                  + Add Fee
                </button>
              </div>
              <div className="card-body">
                {deliveryFees.length === 0 ? (
                  <p className="text-secondary text-center">No delivery fees configured</p>
                ) : (
                  <div className="table-container">
                    <table className="table table-compact">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Rate</th>
                          <th>Applies</th>
                          <th>GST</th>
                          <th>Active</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryFees.map((fee) => (
                          <tr key={fee._id}>
                            <td>{fee.name}</td>
                            <td>
                              {fee.feeType === 'percentage' ? `${fee.value}%` : `₹${fee.value}`}
                            </td>
                            <td>{fee.appliesTo}</td>
                            <td>{fee.gstApplicable ? '18%' : '-'}</td>
                            <td>
                              <label className="toggle">
                                <input type="checkbox" checked={fee.isActive} onChange={() => toggleFeeActive(fee)} />
                                <span className="toggle-slider"></span>
                              </label>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button className="btn btn-secondary btn-sm" onClick={() => editFee(fee)}>Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => deleteFee(fee._id)}>Del</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {showStockModal && (
        <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingStock ? 'Edit Stock' : 'Add Stock'}</h3>
              <button className="modal-close" onClick={() => setShowStockModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleStockSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Symbol *</label>
                  <input type="text" className="form-control" value={stockForm.symbol} onChange={(e) => setStockForm({ ...stockForm, symbol: e.target.value.toUpperCase() })} placeholder="e.g., RELIANCE" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input type="text" className="form-control" value={stockForm.name} onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })} placeholder="e.g., Reliance Industries Ltd" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Sector</label>
                  <input type="text" className="form-control" value={stockForm.sector} onChange={(e) => setStockForm({ ...stockForm, sector: e.target.value })} placeholder="e.g., Oil & Gas" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStockModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingStock ? 'Update' : 'Add'} Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fee Modal */}
      {showFeeModal && (
        <div className="modal-overlay" onClick={() => setShowFeeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingFee ? 'Edit Fee' : 'Add Fee'}</h3>
              <button className="modal-close" onClick={() => setShowFeeModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleFeeSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Fee Name *</label>
                  <input type="text" className="form-control" value={feeForm.name} onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })} placeholder="e.g., STT, Brokerage" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Trade Type *</label>
                    <select className="form-control" value={feeForm.tradeType} onChange={(e) => setFeeForm({ ...feeForm, tradeType: e.target.value })} required>
                      <option value="delivery">Delivery</option>
                      <option value="intraday">Intraday</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fee Type *</label>
                    <select className="form-control" value={feeForm.feeType} onChange={(e) => setFeeForm({ ...feeForm, feeType: e.target.value })} required>
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Value * {feeForm.feeType === 'percentage' ? '(%)' : '(₹)'}</label>
                    <input type="number" className="form-control" value={feeForm.value} onChange={(e) => setFeeForm({ ...feeForm, value: e.target.value })} step="0.0001" min="0" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Applies To *</label>
                    <select className="form-control" value={feeForm.appliesTo} onChange={(e) => setFeeForm({ ...feeForm, appliesTo: e.target.value })} required>
                      <option value="both">Both Buy & Sell</option>
                      <option value="buy">Buy Only</option>
                      <option value="sell">Sell Only</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span>GST Applicable (18%)</span>
                    <label className="toggle">
                      <input type="checkbox" checked={feeForm.gstApplicable} onChange={(e) => setFeeForm({ ...feeForm, gstApplicable: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                  </label>
                  <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    If enabled, 18% GST will be added to this fee amount.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input type="text" className="form-control" value={feeForm.description} onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })} placeholder="Optional description" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFeeModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingFee ? 'Update' : 'Add'} Fee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
