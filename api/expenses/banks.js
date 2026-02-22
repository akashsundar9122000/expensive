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
            const result = await query('SELECT id, name, balance FROM bank_accounts WHERE user_id = $1', [userId]);
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            const name = req.query.name || req.body?.name;
            if (!name) return res.status(400).json({ error: 'Bank name required' });
            const result = await query(
                'INSERT INTO bank_accounts (user_id, name, balance) VALUES ($1, $2, 0) RETURNING id, name, balance',
                [userId, name]
            );
            return res.status(200).json(result.rows[0]);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Banks error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
