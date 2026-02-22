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
            const result = await query(
                'SELECT id, type, name, amount, return_pct as "returnPct" FROM investments WHERE user_id = $1',
                [userId]
            );
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            const { type, name, amount, returnPct } = req.body;
            const result = await query(
                'INSERT INTO investments (user_id, type, name, amount, return_pct) VALUES ($1, $2, $3, $4, $5) RETURNING id, type, name, amount, return_pct as "returnPct"',
                [userId, type, name, amount, returnPct || null]
            );
            return res.status(200).json(result.rows[0]);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Investments error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
