const { query } = require('../_lib/db');
const { getEmailFromRequest, cors } = require('../_lib/auth');

module.exports = async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const email = getEmailFromRequest(req);
    if (!email) return res.status(401).json({ error: 'Unauthorized' });

    const userResult = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (userResult.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;

    try {
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
