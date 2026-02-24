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
                'SELECT id, name, amount, icon, color, date FROM subscriptions WHERE user_id = $1',
                [userId]
            );
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            const { name, amount, icon, color, date } = req.body;
            const result = await query(
                'INSERT INTO subscriptions (user_id, name, amount, icon, color, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, amount, icon, color, date',
                [userId, name, amount, icon, color, date]
            );
            return res.status(200).json(result.rows[0]);
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Missing ID' });
            await query('DELETE FROM subscriptions WHERE id = $1 AND user_id = $2', [id, userId]);
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Subscriptions error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
