import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tradeApi } from '../services/api';
import { format } from 'date-fns';

const TIMEFRAMES = [
  { key: 'all', label: 'All Time' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'last3Months', label: 'Last 3 Months' },
  { key: 'last6Months', label: 'Last 6 Months' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'lastYear', label: 'Last Year' }
];

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [timeframe, setTimeframe] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, monthlyRes] = await Promise.all([
        tradeApi.getDashboard(),
        tradeApi.getMonthlySummary({ limit: 6 })
      ]);
      setStats(dashboardRes.data);
      setMonthlySummary(monthlyRes.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = timeframe !== 'all' ? { timeframe } : {};
      const response = await tradeApi.getAnalytics(params);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <Link to="/trades" className="btn btn-primary">
          + Add Trade
        </Link>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="timeframe-selector">
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
        </div>
      </div>

      {analytics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Net Profit</div>
            <div className={`stat-value ${analytics.totalNetProfit >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(analytics.totalNetProfit)}
            </div>
            <div className="stat-subtext">After all fees & GST</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Fees Paid</div>
            <div className="stat-value" style={{ color: 'var(--warning)' }}>
              {formatCurrency(analytics.totalFees)}
            </div>
            <div className="stat-subtext">Including GST: {formatCurrency(analytics.totalGst || 0)}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Win Rate</div>
            <div className={`stat-value ${analytics.winRate >= 50 ? 'positive' : 'negative'}`}>
              {analytics.winRate}%
            </div>
            <div className="stat-subtext">
              {analytics.winningTrades}W / {analytics.losingTrades}L ({analytics.totalTrades} total)
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Avg Annualized ROI</div>
            <div className={`stat-value ${analytics.avgAnnualizedROI >= 0 ? 'positive' : 'negative'}`}>
              {analytics.avgAnnualizedROI >= 0 ? '+' : ''}{analytics.avgAnnualizedROI}%
            </div>
            <div className="stat-subtext">Per trade average</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Best Trade</div>
            {analytics.bestTrade ? (
              <>
                <div className="stat-value positive">{formatCurrency(analytics.bestTrade.netProfit)}</div>
                <div className="stat-subtext">{analytics.bestTrade.stockSymbol} (+{analytics.bestTrade.profitPercentage}%)</div>
              </>
            ) : (
              <div className="stat-value">-</div>
            )}
          </div>

          <div className="stat-card">
            <div className="stat-label">Worst Trade</div>
            {analytics.worstTrade ? (
              <>
                <div className="stat-value negative">{formatCurrency(analytics.worstTrade.netProfit)}</div>
                <div className="stat-subtext">{analytics.worstTrade.stockSymbol} ({analytics.worstTrade.profitPercentage}%)</div>
              </>
            ) : (
              <div className="stat-value">-</div>
            )}
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
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Open Positions</h2>
          </div>
          <div className="card-body">
            <div className="stats-grid" style={{ marginBottom: 0 }}>
              <div className="stat-card">
                <div className="stat-label">Count</div>
                <div className="stat-value">{stats?.openPositions?.count || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Capital Deployed</div>
                <div className="stat-value">{formatCurrency(stats?.openPositions?.totalValue || 0)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Holding Days</div>
                <div className="stat-value">{stats?.openPositions?.avgHoldingDays || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Period Comparison</h2>
          </div>
          <div className="card-body">
            <div className="stats-grid" style={{ marginBottom: 0 }}>
              <div className="stat-card">
                <div className="stat-label">Today</div>
                <div className={`stat-value ${(stats?.daily?.profit || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(stats?.daily?.profit || 0)}
                </div>
                <div className="stat-subtext">{stats?.daily?.count || 0} trades</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">This Week</div>
                <div className={`stat-value ${(stats?.weekly?.profit || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(stats?.weekly?.profit || 0)}
                </div>
                <div className="stat-subtext">{stats?.weekly?.count || 0} trades</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">This Month</div>
                <div className={`stat-value ${(stats?.monthly?.profit || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(stats?.monthly?.profit || 0)}
                </div>
                <div className="stat-subtext">{stats?.monthly?.count || 0} trades</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2 mt-3">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Trades</h2>
            <Link to="/trades" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="card-body">
            {stats?.recentTrades?.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No trades yet</div>
                <p>Add your first trade to start tracking.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Stock</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th className="text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recentTrades?.map((trade) => (
                      <tr key={trade._id}>
                        <td><strong>{trade.stockSymbol}</strong></td>
                        <td>
                          <span className={`badge ${trade.tradeType === 'intraday' ? 'badge-info' : 'badge-secondary'}`}>
                            {trade.tradeType}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${trade.status === 'open' ? 'badge-warning' : 'badge-success'}`}>
                            {trade.status}
                          </span>
                        </td>
                        <td className="text-right">
                          {trade.status === 'closed' ? (
                            <span className={trade.netProfit >= 0 ? 'text-success' : 'text-danger'}>
                              {formatCurrency(trade.netProfit)}
                            </span>
                          ) : '-'}
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
            <h2 className="card-title">Monthly Summary</h2>
            <Link to="/analytics" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="card-body">
            {monthlySummary.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No data yet</div>
                <p>Close some trades to see monthly summary.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Trades</th>
                      <th>Win Rate</th>
                      <th className="text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummary.map((month) => (
                      <tr key={month.month}>
                        <td><strong>{month.month}</strong></td>
                        <td>{month.trades}</td>
                        <td>{month.winRate}%</td>
                        <td className="text-right">
                          <span className={month.profit >= 0 ? 'text-success' : 'text-danger'}>
                            {formatCurrency(month.profit)}
                          </span>
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
  );
}

export default Dashboard;
