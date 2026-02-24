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
            const result = await query('SELECT category, limit_amount as "limitAmount" FROM budgets WHERE user_id = $1', [userId]);
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST' || req.method === 'PUT') {
            const { category, limitAmount } = req.body;
            if (!category || limitAmount === undefined) {
                return res.status(400).json({ error: 'Category and limitAmount are required' });
            }

            await query(`
                INSERT INTO budgets (user_id, category, limit_amount)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, category)
                DO UPDATE SET limit_amount = EXCLUDED.limit_amount
            `, [userId, category, limitAmount]);

            return res.status(200).json({ success: true, category, limitAmount });
        }

        if (req.method === 'DELETE') {
            const { category } = req.query;
            await query('DELETE FROM budgets WHERE user_id = $1 AND category = $2', [userId, category]);
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Budgets error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
