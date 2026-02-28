const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load handlers
const auth = require('./api/auth');
const health = require('./api/health');
const perfSummary = require('./api/perf-summary');
const transactions = require('./api/expenses/transactions');
const subscriptions = require('./api/expenses/subscriptions');
const investments = require('./api/expenses/investments');
const sips = require('./api/expenses/sips');
const budgets = require('./api/expenses/budgets');
const stats = require('./api/expenses/stats');
const preferences = require('./api/expenses/preferences');
const banks = require('./api/expenses/banks');
const bootstrap = require('./api/expenses/bootstrap');
const market = require('./api/expenses/market');
const indianStocks = require('./api/expenses/stocks/indian');

// Helper: adapt Vercel-style handler (req, res) to Express
function handle(handler) {
    return (req, res) => {
        // Merge path params into query for DELETE /transactions/:id etc.
        req.query = { ...req.query, ...req.params };
        return handler(req, res);
    };
}

// Auth
app.all('/api/auth', handle(auth));
app.all('/api/auth/*', handle(auth));

// Health
app.all('/api/health', handle(health));

// Perf Summary
app.all('/api/perf-summary', handle(perfSummary));

// Transactions: DELETE /api/expenses/transactions/:id must pass id as query param
app.all('/api/expenses/transactions/:id', handle(transactions));
app.all('/api/expenses/transactions', handle(transactions));

// Subscriptions
app.all('/api/expenses/subscriptions/:id', handle(subscriptions));
app.all('/api/expenses/subscriptions', handle(subscriptions));

// Investments
app.all('/api/expenses/investments/:id', handle(investments));
app.all('/api/expenses/investments', handle(investments));

// SIPs
app.all('/api/expenses/sips/:id', handle(sips));
app.all('/api/expenses/sips', handle(sips));

// Budgets
app.all('/api/expenses/budgets', handle(budgets));

// Stats
app.all('/api/expenses/stats', handle(stats));

// Preferences
app.all('/api/expenses/preferences', handle(preferences));

// Banks
app.all('/api/expenses/banks', handle(banks));

// Bootstrap
app.all('/api/expenses/bootstrap', handle(bootstrap));

// Market
app.all('/api/expenses/market', handle(market));

// Indian Stocks list
app.all('/api/expenses/stocks/indian', handle(indianStocks));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
