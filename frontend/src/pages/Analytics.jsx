import { useState, useEffect } from 'react';
import { tradeApi } from '../services/api';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const TIMEFRAMES = [
  { key: 'all', label: 'All Time' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'last3Months', label: 'Last 3 Months' },
  { key: 'last6Months', label: 'Last 6 Months' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'lastYear', label: 'Last Year' },
  { key: 'custom', label: 'Custom' }
];

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState({ data: [], pagination: {} });
  const [profitTrend, setProfitTrend] = useState([]);
  const [timeframe, setTimeframe] = useState('all');
  const [customRange, setCustomRange] = useState({
    startDate: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [trendPeriod, setTrendPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [monthlyPage, setMonthlyPage] = useState(1);

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, customRange]);

  useEffect(() => {
    fetchMonthlySummary();
  }, [monthlyPage]);

  useEffect(() => {
    fetchProfitTrend();
  }, [trendPeriod]);

  const fetchAnalytics = async () => {
    try {
      let params = {};
      if (timeframe === 'custom') {
        params = { startDate: customRange.startDate, endDate: customRange.endDate };
      } else if (timeframe !== 'all') {
        params = { timeframe };
      }
      
      const response = await tradeApi.getAnalytics(params);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      const response = await tradeApi.getMonthlySummary({ page: monthlyPage, limit: 12 });
      setMonthlySummary(response.data);
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
    }
  };

  const fetchProfitTrend = async () => {
    try {
      const response = await tradeApi.getProfitTrend({ period: trendPeriod, days: 90 });
      setProfitTrend(response.data);
    } catch (error) {
      console.error('Error fetching profit trend:', error);
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

  if (loading) {
    return <div className="text-center mt-3">Loading...</div>;
  }

  const maxProfit = Math.max(...profitTrend.map(d => Math.abs(d.profit)), 1);

  return (
    <div>
      <h1 className="page-title mb-3">Analytics</h1>

      <div className="card mb-3">
        <div className="card-body">
          <div className="timeframe-selector mb-2">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.key}
                className={`timeframe-btn ${timeframe === tf.key ? 'active' : ''}`}
                onClick={() => setTimeframe(tf.key)}
              >
                {tf.label}
              </button>
            ))}
          </div>
          
          {timeframe === 'custom' && (
            <div className="form-row mt-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={customRange.startDate}
                  onChange={(e) => setCustomRange({ ...customRange, startDate: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={customRange.endDate}
                  onChange={(e) => setCustomRange({ ...customRange, endDate: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {analytics && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Net Profit</div>
              <div className={`stat-value ${analytics.totalNetProfit >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(analytics.totalNetProfit)}
              </div>
              <div className="stat-subtext">After all fees</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Gross Profit</div>
              <div className={`stat-value ${analytics.totalGrossProfit >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(analytics.totalGrossProfit)}
              </div>
              <div className="stat-subtext">Before fees</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Fees</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>
                {formatCurrency(analytics.totalFees)}
              </div>
              <div className="stat-subtext">GST: {formatCurrency(analytics.totalGst || 0)}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Capital Deployed</div>
              <div className="stat-value">{formatCurrency(analytics.totalInvested)}</div>
              <div className="stat-subtext">Total buy value</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Overall ROI</div>
              <div className={`stat-value ${analytics.overallROI >= 0 ? 'positive' : 'negative'}`}>
                {analytics.overallROI >= 0 ? '+' : ''}{analytics.overallROI}%
              </div>
              <div className="stat-subtext">Net / Invested</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Avg Annualized ROI</div>
              <div className={`stat-value ${analytics.avgAnnualizedROI >= 0 ? 'positive' : 'negative'}`}>
                {analytics.avgAnnualizedROI >= 0 ? '+' : ''}{analytics.avgAnnualizedROI}%
              </div>
              <div className="stat-subtext">Per trade</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Win Rate</div>
              <div className={`stat-value ${analytics.winRate >= 50 ? 'positive' : 'negative'}`}>
                {analytics.winRate}%
              </div>
              <div className="stat-subtext">{analytics.winningTrades}W / {analytics.losingTrades}L</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Trades</div>
              <div className="stat-value">{analytics.totalTrades}</div>
              <div className="stat-subtext">Avg hold: {analytics.avgHoldingDays} days</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Avg Profit/Trade</div>
              <div className={`stat-value ${analytics.avgProfit >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(analytics.avgProfit)}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Avg Win</div>
              <div className="stat-value positive">{formatCurrency(analytics.avgWin)}</div>
              <div className="stat-subtext">Per winning trade</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Avg Loss</div>
              <div className="stat-value negative">{formatCurrency(analytics.avgLoss)}</div>
              <div className="stat-subtext">Per losing trade</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Best Trade</div>
              {analytics.bestTrade ? (
                <>
                  <div className="stat-value positive">{formatCurrency(analytics.bestTrade.netProfit)}</div>
                  <div className="stat-subtext">{analytics.bestTrade.stockSymbol}</div>
                </>
              ) : <div className="stat-value">-</div>}
            </div>

            <div className="stat-card">
              <div className="stat-label">Worst Trade</div>
              {analytics.worstTrade ? (
                <>
                  <div className="stat-value negative">{formatCurrency(analytics.worstTrade.netProfit)}</div>
                  <div className="stat-subtext">{analytics.worstTrade.stockSymbol}</div>
                </>
              ) : <div className="stat-value">-</div>}
            </div>

            <div className="stat-card">
              <div className="stat-label">Intraday Profit</div>
              <div className={`stat-value ${analytics.intradayStats.profit >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(analytics.intradayStats.profit)}
              </div>
              <div className="stat-subtext">{analytics.intradayStats.trades} trades</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Delivery Profit</div>
              <div className={`stat-value ${analytics.deliveryStats.profit >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(analytics.deliveryStats.profit)}
              </div>
              <div className="stat-subtext">{analytics.deliveryStats.trades} trades</div>
            </div>
          </div>
        </>
      )}

      <div className="card mt-3">
        <div className="card-header">
          <h2 className="card-title">Profit Trend</h2>
          <div className="timeframe-selector">
            {['daily', 'weekly', 'monthly'].map(p => (
              <button
                key={p}
                className={`timeframe-btn ${trendPeriod === p ? 'active' : ''}`}
                onClick={() => setTrendPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {profitTrend.length === 0 ? (
            <div className="chart-placeholder">No data available for this period</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '200px', padding: '1rem 0' }}>
              {profitTrend.map((d, i) => {
                const height = Math.abs(d.profit) / maxProfit * 150;
                const isPositive = d.profit >= 0;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      minWidth: '20px',
                      maxWidth: '60px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%'
                    }}
                    title={`${d.date}: ${formatCurrency(d.profit)} (${d.trades} trades)`}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(height, 4)}px`,
                        background: isPositive ? 'var(--success)' : 'var(--danger)',
                        borderRadius: '4px 4px 0 0',
                        opacity: 0.8
                      }}
                    />
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
                      {d.date.slice(-5)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header">
          <h2 className="card-title">Monthly Summary</h2>
        </div>
        <div className="card-body">
          {monthlySummary.data.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No monthly data</div>
              <p>Close some trades to see monthly summaries.</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Trades</th>
                      <th>Win Rate</th>
                      <th>Fees</th>
                      <th className="text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummary.data.map((month) => (
                      <tr key={month.month}>
                        <td><strong>{month.month}</strong></td>
                        <td>{month.trades}</td>
                        <td>
                          <span className={month.winRate >= 50 ? 'text-success' : 'text-danger'}>
                            {month.winRate}%
                          </span>
                        </td>
                        <td>{formatCurrency(month.fees)}</td>
                        <td className="text-right">
                          <span className={`profit-display ${month.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(month.profit)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {monthlySummary.pagination.pages > 1 && (
                <div className="pagination">
                  <div className="pagination-info">
                    Page {monthlySummary.pagination.page} of {monthlySummary.pagination.pages}
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn"
                      onClick={() => setMonthlyPage(monthlyPage - 1)}
                      disabled={monthlyPage <= 1}
                    >
                      Previous
                    </button>
                    <button
                      className="pagination-btn"
                      onClick={() => setMonthlyPage(monthlyPage + 1)}
                      disabled={monthlyPage >= monthlySummary.pagination.pages}
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
    </div>
  );
}

export default Analytics;
