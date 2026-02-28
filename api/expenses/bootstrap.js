const { query } = require('../_lib/db');
const { getUserFromRequest, cors } = require('../_lib/auth');
const { instrumentRequest } = require('../_lib/perf');

module.exports = async (req, res) => {
    instrumentRequest(req, res, 'expenses.bootstrap');
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userFromToken = await getUserFromRequest(req);
    if (!userFromToken) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const userResult = await query('SELECT id, email, name FROM users WHERE id = $1', [userFromToken.id]);
        if (userResult.rows.length === 0) return res.status(401).json({ error: 'User not found' });
        const user = userResult.rows[0];
        const userId = user.id;

        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        const [
            transactionsResult,
            subscriptionsResult,
            investmentsResult,
            sipsResult,
            budgetsResult,
            banksResult,
            prefsResult,
            monthlyExpensesResult,
            totalInvestmentResult
        ] = await Promise.all([
            query(
                `SELECT t.id, t.amount, t.category, t.sub_category as "subCategory", t.date, t.mode, b.name as "bankName"
                 FROM transactions t
                 LEFT JOIN bank_accounts b ON b.id = t.bank_account_id
                 WHERE t.user_id = $1
                 ORDER BY t.date DESC`,
                [userId]
            ),
            query('SELECT id, name, amount, date, icon, color FROM subscriptions WHERE user_id = $1 ORDER BY id DESC', [userId]),
            query('SELECT id, type, name, amount, return_pct as "returnPct" FROM investments WHERE user_id = $1 ORDER BY id DESC', [userId]),
            query(
                'SELECT id, type, COALESCE(investment_name, \'\') as "investmentName", monthly_amount as "monthlyAmount", sip_day as "sipDay" FROM sips WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
                [userId]
            ),
            query('SELECT id, category, limit_amount as "limitAmount" FROM budgets WHERE user_id = $1 ORDER BY category ASC', [userId]),
            query('SELECT id, name, balance FROM bank_accounts WHERE user_id = $1 ORDER BY id ASC', [userId]),
            query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]),
            query('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND date >= $2', [userId, monthStart]),
            query('SELECT COALESCE(SUM(amount), 0) as total FROM investments WHERE user_id = $1', [userId])
        ]);

        const prefs = prefsResult.rows[0] || {};
        const banks = banksResult.rows.map((bank) => ({
            ...bank,
            balance: Number(bank.balance || 0)
        }));

        const bankBalances = {};
        let totalBalance = 0;
        for (const bank of banks) {
            bankBalances[bank.name] = bank.balance;
            totalBalance += bank.balance;
        }

        return res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                bankAccounts: banks.map((bank) => bank.name)
            },
            transactions: transactionsResult.rows,
            subscriptions: subscriptionsResult.rows,
            investments: investmentsResult.rows,
            sips: sipsResult.rows,
            budgets: budgetsResult.rows,
            banks,
            stats: {
                balance: totalBalance,
                bankBalances,
                goalName: prefs.goal_name || 'Savings Goal',
                goalRequired: Number(prefs.goal_required || 100000),
                goalCollected: Number(prefs.goal_collected || 0),
                totalInvestment: Number(totalInvestmentResult.rows[0]?.total || 0),
                investAmount: Number(prefs.invest_amount || 0),
                monthlyExpenses: Number(monthlyExpensesResult.rows[0]?.total || 0)
            }
        });
    } catch (err) {
        console.error('Bootstrap error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};