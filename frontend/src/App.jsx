import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Trades from './pages/Trades';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import AIInsights from './pages/AIInsights';
import Login from './pages/Login';
import './index.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <nav className="navbar">
        <div className="container navbar-content">
          <NavLink to="/" className="nav-brand">
            <span className="nav-brand-icon">📈</span>
            <span className="nav-brand-text">StockTracker</span>
          </NavLink>
          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              Dashboard
            </NavLink>
            <NavLink to="/trades" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Trades
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Analytics
            </NavLink>
            <NavLink to="/ai-insights" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              AI Insights
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Settings
            </NavLink>
          </div>
          <div className="nav-user">
            <div className="nav-user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="nav-user-name">{user?.name}</span>
            <button className="btn btn-secondary btn-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="main-content">
        <div className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ai-insights" element={<AIInsights />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
