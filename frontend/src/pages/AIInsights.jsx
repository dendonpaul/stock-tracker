import { useState, useEffect, useCallback } from 'react';
import { aiApi } from '../services/api';
import { format } from 'date-fns';

function AIInsights() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchAnalyses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await aiApi.getAnalyses({
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      setAnalyses(response.data.analyses);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Error fetching analyses:', error);
      showNotification('Failed to fetch analyses', 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const handleView = async (analysis) => {
    try {
      const response = await aiApi.getAnalysis(analysis._id);
      setSelectedAnalysis(response.data);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching analysis details:', error);
      showNotification('Failed to load analysis details', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this analysis?')) return;
    
    try {
      await aiApi.deleteAnalysis(id);
      showNotification('Analysis deleted successfully');
      fetchAnalyses();
      if (showModal) setShowModal(false);
    } catch (error) {
      console.error('Error deleting analysis:', error);
      showNotification('Failed to delete analysis', 'error');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL saved analyses? This cannot be undone.')) return;
    
    try {
      await aiApi.deleteAllAnalyses();
      showNotification('All analyses deleted successfully');
      fetchAnalyses();
    } catch (error) {
      console.error('Error deleting analyses:', error);
      showNotification('Failed to delete analyses', 'error');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'Low': return 'var(--success)';
      case 'Medium': return 'var(--warning)';
      case 'High': return 'var(--danger)';
      default: return 'var(--text-muted)';
    }
  };

  const getRecommendationColor = (rec) => {
    if (rec?.toLowerCase().includes('sell')) return 'var(--danger)';
    if (rec?.toLowerCase().includes('hold')) return 'var(--warning)';
    if (rec?.toLowerCase().includes('stop')) return 'var(--info)';
    return 'var(--text-muted)';
  };

  const getTradeOutcome = (analysis) => {
    if (!analysis.trade) return null;
    if (analysis.trade.status === 'open') return { status: 'Open', color: 'var(--info)' };
    if (analysis.trade.netProfit > 0) return { status: 'Profit', color: 'var(--success)', value: analysis.trade.netProfit };
    if (analysis.trade.netProfit < 0) return { status: 'Loss', color: 'var(--danger)', value: analysis.trade.netProfit };
    return { status: 'Break Even', color: 'var(--warning)', value: 0 };
  };

  return (
    <div className="ai-insights-page">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">AI Insights</h1>
        <div className="quick-actions">
          {analyses.length > 0 && (
            <button className="btn btn-danger" onClick={handleDeleteAll}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading analyses...</p>
        </div>
      ) : analyses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <h3>No AI Analyses Yet</h3>
          <p>Generate AI suggestions for your open trades and save them here for future reference.</p>
          <p className="text-muted">Go to Trades → View an open trade → Get AI Suggestion → Save Analysis</p>
        </div>
      ) : (
        <>
          <div className="analyses-grid">
            {analyses.map(analysis => {
              const outcome = getTradeOutcome(analysis);
              return (
                <div key={analysis._id} className="analysis-card">
                  <div className="analysis-card-header">
                    <div className="analysis-stock">
                      <span className="analysis-stock-name">{analysis.stockName}</span>
                      <span className="analysis-stock-symbol">{analysis.stockSymbol}</span>
                    </div>
                    <span className={`badge badge-${analysis.tradeType}`}>
                      {analysis.tradeType}
                    </span>
                  </div>
                  
                  <div className="analysis-card-body">
                    <div className="analysis-meta">
                      <div className="analysis-meta-item">
                        <span className="label">Buy Price</span>
                        <span className="value">{formatCurrency(analysis.buyPrice)}</span>
                      </div>
                      <div className="analysis-meta-item">
                        <span className="label">Quantity</span>
                        <span className="value">{analysis.quantity}</span>
                      </div>
                      <div className="analysis-meta-item">
                        <span className="label">Investment</span>
                        <span className="value">{formatCurrency(analysis.investment)}</span>
                      </div>
                      <div className="analysis-meta-item">
                        <span className="label">Holding Days</span>
                        <span className="value">{analysis.holdingDays} days</span>
                      </div>
                    </div>

                    <div className="analysis-suggestion-preview">
                      <div className="suggestion-item">
                        <span className="label">Target</span>
                        <span className="value positive">{analysis.suggestion?.targetPriceRange?.percentageGain || 'N/A'}</span>
                      </div>
                      <div className="suggestion-item">
                        <span className="label">Stop Loss</span>
                        <span className="value negative">{analysis.suggestion?.stopLoss?.percentageLoss || 'N/A'}</span>
                      </div>
                      <div className="suggestion-item">
                        <span className="label">Risk</span>
                        <span className="value" style={{ color: getRiskColor(analysis.suggestion?.riskLevel) }}>
                          {analysis.suggestion?.riskLevel || 'N/A'}
                        </span>
                      </div>
                      <div className="suggestion-item">
                        <span className="label">Recommendation</span>
                        <span className="value" style={{ color: getRecommendationColor(analysis.suggestion?.recommendation) }}>
                          {analysis.suggestion?.recommendation || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {outcome && (
                      <div className="analysis-outcome" style={{ borderColor: outcome.color }}>
                        <span className="outcome-label">Trade Status:</span>
                        <span className="outcome-value" style={{ color: outcome.color }}>
                          {outcome.status}
                          {outcome.value !== undefined && ` (${formatCurrency(outcome.value)})`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="analysis-card-footer">
                    <span className="analysis-date">
                      {format(new Date(analysis.createdAt), 'MMM dd, yyyy HH:mm')}
                    </span>
                    <div className="analysis-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => handleView(analysis)}>
                        View
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(analysis._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary"
                disabled={pagination.page === 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <button
                className="btn btn-secondary"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showModal && selectedAnalysis && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title">AI Analysis: {selectedAnalysis.stockName}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="analysis-detail-grid">
                <div className="analysis-detail-section">
                  <h4>Trade Information</h4>
                  <div className="detail-row">
                    <span>Stock</span>
                    <span>{selectedAnalysis.stockName} ({selectedAnalysis.stockSymbol})</span>
                  </div>
                  <div className="detail-row">
                    <span>Trade Type</span>
                    <span className={`badge badge-${selectedAnalysis.tradeType}`}>{selectedAnalysis.tradeType}</span>
                  </div>
                  <div className="detail-row">
                    <span>Buy Price</span>
                    <span>{formatCurrency(selectedAnalysis.buyPrice)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Quantity</span>
                    <span>{selectedAnalysis.quantity}</span>
                  </div>
                  <div className="detail-row">
                    <span>Investment</span>
                    <span>{formatCurrency(selectedAnalysis.investment)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Holding Days (at analysis)</span>
                    <span>{selectedAnalysis.holdingDays} days</span>
                  </div>
                  <div className="detail-row">
                    <span>Analysis Date</span>
                    <span>{format(new Date(selectedAnalysis.createdAt), 'PPpp')}</span>
                  </div>
                </div>

                <div className="analysis-detail-section">
                  <h4>AI Suggestion</h4>
                  <div className="detail-row">
                    <span>Target Price Range</span>
                    <span className="positive">
                      {formatCurrency(selectedAnalysis.suggestion?.targetPriceRange?.min)} - {formatCurrency(selectedAnalysis.suggestion?.targetPriceRange?.max)}
                      <br />
                      <small>({selectedAnalysis.suggestion?.targetPriceRange?.percentageGain})</small>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>Stop Loss</span>
                    <span className="negative">
                      {formatCurrency(selectedAnalysis.suggestion?.stopLoss?.price)}
                      <br />
                      <small>({selectedAnalysis.suggestion?.stopLoss?.percentageLoss})</small>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>Risk Level</span>
                    <span style={{ color: getRiskColor(selectedAnalysis.suggestion?.riskLevel), fontWeight: 600 }}>
                      {selectedAnalysis.suggestion?.riskLevel}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>Recommendation</span>
                    <span style={{ color: getRecommendationColor(selectedAnalysis.suggestion?.recommendation), fontWeight: 600 }}>
                      {selectedAnalysis.suggestion?.recommendation}
                    </span>
                  </div>
                </div>

                {selectedAnalysis.suggestion?.keyFactors?.length > 0 && (
                  <div className="analysis-detail-section full-width">
                    <h4>Key Factors</h4>
                    <ul className="key-factors-list">
                      {selectedAnalysis.suggestion.keyFactors.map((factor, index) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedAnalysis.suggestion?.reasoning && (
                  <div className="analysis-detail-section full-width">
                    <h4>Reasoning</h4>
                    <p className="reasoning-text">{selectedAnalysis.suggestion.reasoning}</p>
                  </div>
                )}

                {selectedAnalysis.trade && selectedAnalysis.trade.status === 'closed' && (
                  <div className="analysis-detail-section full-width">
                    <h4>Trade Outcome</h4>
                    <div className="trade-outcome-details">
                      <div className="detail-row">
                        <span>Sell Price</span>
                        <span>{formatCurrency(selectedAnalysis.trade.sellPrice)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Net Profit/Loss</span>
                        <span style={{ color: selectedAnalysis.trade.netProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                          {formatCurrency(selectedAnalysis.trade.netProfit)}
                          {selectedAnalysis.trade.profitPercentage && ` (${selectedAnalysis.trade.profitPercentage.toFixed(2)}%)`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedAnalysis.suggestion?.disclaimer && (
                  <div className="analysis-detail-section full-width">
                    <p className="disclaimer">{selectedAnalysis.suggestion.disclaimer}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => handleDelete(selectedAnalysis._id)}>
                Delete Analysis
              </button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIInsights;
