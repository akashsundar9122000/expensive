const { query } = require('../_lib/db');
const { getEmailFromRequest, cors } = require('../_lib/auth');

module.exports = async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const email = getEmailFromRequest(req);
    if (!email) return res.status(401).json({ error: 'Unauthorized' });

    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;

    try {
        if (req.method === 'GET') {
            const result = await query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
            if (result.rows.length === 0) return res.status(200).json({});
            const p = result.rows[0];
            return res.status(200).json({
                goalName: p.goal_name,
                goalRequired: parseFloat(p.goal_required || 0),
                goalCollected: parseFloat(p.goal_collected || 0),
                totalInvestment: parseFloat(p.total_investment || 0),
                investAmount: parseFloat(p.invest_amount || 0)
            });
        }

        if (req.method === 'PUT') {
            const { goalName, goalRequired, goalCollected, totalInvestment, investAmount } = req.body;
            const existing = await query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);

            if (existing.rows.length === 0) {
                await query(
                    'INSERT INTO user_preferences (user_id, goal_name, goal_required, goal_collected, total_investment, invest_amount) VALUES ($1, $2, $3, $4, $5, $6)',
                    [userId, goalName || 'Savings Goal', goalRequired || 100000, goalCollected || 0, totalInvestment || 0, investAmount || 0]
                );
            } else {
                const updates = [];
                const values = [];
                let i = 1;
                if (goalName !== undefined) { updates.push(`goal_name = $${i++}`); values.push(goalName); }
                if (goalRequired !== undefined) { updates.push(`goal_required = $${i++}`); values.push(goalRequired); }
                if (goalCollected !== undefined) { updates.push(`goal_collected = $${i++}`); values.push(goalCollected); }
                if (totalInvestment !== undefined) { updates.push(`total_investment = $${i++}`); values.push(totalInvestment); }
                if (investAmount !== undefined) { updates.push(`invest_amount = $${i++}`); values.push(investAmount); }

                if (updates.length > 0) {
                    values.push(userId);
                    await query(`UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = $${i}`, values);
                }
            }

            const result = await query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
            const p = result.rows[0];
            return res.status(200).json({
                goalName: p.goal_name,
                goalRequired: parseFloat(p.goal_required || 0),
                goalCollected: parseFloat(p.goal_collected || 0),
                totalInvestment: parseFloat(p.total_investment || 0),
                investAmount: parseFloat(p.invest_amount || 0)
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Preferences error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
