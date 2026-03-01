const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const auth = require('./middleware/auth');

dotenv.config();

connectDB();

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));

app.use('/api/stocks', auth, require('./routes/stockRoutes'));
app.use('/api/fees', auth, require('./routes/feeRoutes'));
app.use('/api/trades', auth, require('./routes/tradeRoutes'));
app.use('/api/ai', auth, require('./routes/aiRoutes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
