# Stock Trading Tracker

A comprehensive stock trading tracker built with React and MongoDB that helps you manage and analyze your trades.

## Features

### Trade Management
- Add buy/sell trades with stock selection, price, quantity, and dates
- Support for **Intraday** and **Delivery** trading types
- Track open positions and close trades when selling
- Automatic fee calculation based on configured fee structures
- View trade history with filtering options

### Fee Configuration
- Configure separate fees for Intraday and Delivery trading
- Support for multiple fee types:
  - **Percentage**: Fee as % of trade value (e.g., STT, GST)
  - **Flat**: Fixed amount per transaction (e.g., brokerage)
  - **Per Share**: Fee per share traded
- Fees can apply to Buy only, Sell only, or Both
- Toggle fees active/inactive

### Stock Management
- Add and manage stock symbols with company names
- Search stocks quickly when adding trades
- Organize by sector

### Analytics & Reporting
- **Daily/Weekly/Monthly/Yearly profit tracking**
- **Win rate** calculation
- **Annualized ROI** for each trade
- **Holding period** tracking (days between buy and sell)
- Top performing and worst performing trades
- Intraday vs Delivery profit comparison
- Custom date range analysis

### Profit Calculations
- **Gross Profit**: Sell value - Buy value
- **Net Profit**: Gross profit - Total fees
- **Profit %**: (Net profit / Buy value) × 100
- **Annualized ROI**: Compound return extrapolated to one year

## Tech Stack

- **Frontend**: React 18 with Vite
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Styling**: Custom CSS

## Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud instance)

## Installation

### 1. Clone and Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

Edit `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/stock-tracker
PORT=5000
```

### 3. Start MongoDB

Make sure MongoDB is running locally, or update the connection string for a cloud instance.

### 4. Start the Application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage Guide

### Setting Up

1. **Add Stocks**: Go to Settings → Stocks and add the stocks you trade
2. **Configure Fees**: Go to Settings → Fee Configuration and add your broker's fee structure:
   - Common Indian market fees:
     - Brokerage (flat or %)
     - STT (Securities Transaction Tax)
     - Exchange Transaction Charges
     - GST
     - SEBI Charges
     - Stamp Duty

### Adding Trades

1. Click "Add Trade" on Dashboard or Trades page
2. Search and select a stock
3. Choose trade type (Intraday/Delivery)
4. Enter quantity, buy price, and buy date
5. Fees are calculated automatically based on your configuration
6. For completed trades, enter sell price and date
7. For open positions, you can close them later

### Analyzing Performance

- **Dashboard**: Quick overview of daily/weekly/monthly profits
- **Analytics**: Deep dive into performance metrics
  - Custom date ranges
  - Win rate tracking
  - Best/worst trades
  - ROI analysis

## API Endpoints

### Stocks
- `GET /api/stocks` - List stocks
- `POST /api/stocks` - Create stock
- `PUT /api/stocks/:id` - Update stock
- `DELETE /api/stocks/:id` - Delete stock

### Fees
- `GET /api/fees` - List fee configurations
- `POST /api/fees` - Create fee config
- `POST /api/fees/calculate` - Calculate fees for a trade
- `PUT /api/fees/:id` - Update fee config
- `DELETE /api/fees/:id` - Delete fee config

### Trades
- `GET /api/trades` - List trades (with filters)
- `POST /api/trades` - Create trade
- `PUT /api/trades/:id` - Update trade
- `PUT /api/trades/:id/close` - Close an open trade
- `DELETE /api/trades/:id` - Delete trade
- `GET /api/trades/dashboard` - Dashboard stats
- `GET /api/trades/analytics` - Detailed analytics
- `GET /api/trades/profit/:period` - Profit by period (daily/weekly/monthly/yearly)

## Sample Fee Configuration (Indian Markets)

### Intraday Trading
| Fee | Type | Value | Applies To |
|-----|------|-------|------------|
| Brokerage | Flat | ₹20 | Both |
| STT | Percentage | 0.025% | Sell |
| Exchange Charges | Percentage | 0.00345% | Both |
| GST | Percentage | 18% on brokerage | Both |
| SEBI Charges | Percentage | 0.0001% | Both |
| Stamp Duty | Percentage | 0.003% | Buy |

### Delivery Trading
| Fee | Type | Value | Applies To |
|-----|------|-------|------------|
| Brokerage | Flat | ₹0 (free with most brokers) | Both |
| STT | Percentage | 0.1% | Both |
| Exchange Charges | Percentage | 0.00345% | Both |
| GST | Percentage | 18% on brokerage | Both |
| SEBI Charges | Percentage | 0.0001% | Both |
| Stamp Duty | Percentage | 0.015% | Buy |
