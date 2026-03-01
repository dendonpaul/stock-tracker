import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signup(formData.name, formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">📈</div>
            <h1 className="login-title">StockTracker</h1>
            <p className="login-subtitle">Track your trades, maximize your profits</p>
          </div>

          <div className="login-tabs">
            <button
              className={`login-tab ${!isSignup ? 'active' : ''}`}
              onClick={() => { setIsSignup(false); setError(''); }}
            >
              Login
            </button>
            <button
              className={`login-tab ${isSignup ? 'active' : ''}`}
              onClick={() => { setIsSignup(true); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="login-error">{error}</div>}

            {isSignup && (
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
                minLength={6}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                  Please wait...
                </>
              ) : (
                isSignup ? 'Create Account' : 'Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
