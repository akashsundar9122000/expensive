const { query } = require('../_lib/db');
const { getUserFromRequest, cors } = require('../_lib/auth');
const { instrumentRequest } = require('../_lib/perf');

module.exports = async (req, res) => {
    instrumentRequest(req, res, 'expenses.stats');
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const userId = user.id;

        // Bank balances
        const banksResult = await query('SELECT name, balance FROM bank_accounts WHERE user_id = $1', [userId]);
        const bankBalances = {};
        let totalBalance = 0;
        banksResult.rows.forEach(b => {
            bankBalances[b.name] = parseFloat(b.balance);
            totalBalance += parseFloat(b.balance);
        });

        // Preferences
        const prefsResult = await query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
        const prefs = prefsResult.rows[0] || {};

        // Total investment from investments table (resilient to missing table)
        let totalInvestment = 0;
        try {
            const invResult = await query('SELECT COALESCE(SUM(amount), 0) as total FROM investments WHERE user_id = $1', [userId]);
            totalInvestment = parseFloat(invResult.rows[0].total);
        } catch (e) {
            totalInvestment = 0;
        }

        // Monthly expenses
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const expResult = await query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND date >= $2",
            [userId, monthStart]
        );
        const monthlyExpenses = parseFloat(expResult.rows[0].total);

        res.status(200).json({
            balance: totalBalance,
            bankBalances,
            goalName: prefs.goal_name || 'Savings Goal',
            goalRequired: parseFloat(prefs.goal_required || 100000),
            goalCollected: parseFloat(prefs.goal_collected || 0),
            totalInvestment,
            investAmount: parseFloat(prefs.invest_amount || 0),
            monthlyExpenses
        });
    } catch (err) {
        console.error('Stats error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
