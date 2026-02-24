const { query } = require('../_lib/db');
const { getEmailFromRequest, cors } = require('../_lib/auth');

module.exports = async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const email = getEmailFromRequest(req);
    console.log('Auth header:', req.headers.authorization);
    console.log('Method:', req.method);
    if (!email) {
        console.log('Unauthorized - email not found');
        return res.status(401).json({ error: 'Unauthorized - Invalid or missing token' });
    }

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
            const updateId = req.query.id || req.body?.id;
            if (updateId) {
                const { name, amount, icon, color, date } = req.body;
                const subId = parseInt(updateId, 10);
                if (isNaN(subId)) return res.status(400).json({ error: 'Invalid ID format' });

                const updateResult = await query(
                    'UPDATE subscriptions SET name = $1, amount = $2, icon = $3, color = $4, date = $5 WHERE id = $6 AND user_id = $7 RETURNING id, name, amount, icon, color, date',
                    [name, amount, icon, color, date, subId, userId]
                );
                if (updateResult.rows.length === 0) return res.status(404).json({ error: 'Subscription not found' });
                return res.status(200).json(updateResult.rows[0]);
            }

            const { name, amount, icon, color, date } = req.body;
            const result = await query(
                'INSERT INTO subscriptions (user_id, name, amount, icon, color, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, amount, icon, color, date',
                [userId, name, amount, icon, color, date]
            );
            return res.status(200).json(result.rows[0]);
        }

        if (req.method === 'PUT') {
            // Vercel routes /subscriptions/123 to /subscriptions.js?id=123
            let id = req.query.id;
            
            const { name, amount, icon, color, date } = req.body;
            console.log('PUT Request - ID:', id, 'Query:', req.query, 'Name:', name, 'Amount:', amount, 'Date:', date);
            
            if (!id) return res.status(400).json({ error: 'Missing ID' });
            const subId = parseInt(id, 10);
            if (isNaN(subId)) return res.status(400).json({ error: 'Invalid ID format' });
            
            const result = await query(
                'UPDATE subscriptions SET name = $1, amount = $2, icon = $3, color = $4, date = $5 WHERE id = $6 AND user_id = $7 RETURNING id, name, amount, icon, color, date',
                [name, amount, icon, color, date, subId, userId]
            );
            console.log('Update result rows:', result.rows.length);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Subscription not found' });
            return res.status(200).json(result.rows[0]);
        }

        if (req.method === 'DELETE') {
            // Vercel routes /subscriptions/123 to /subscriptions.js?id=123
            let id = req.query.id;
            
            if (!id) return res.status(400).json({ error: 'Missing ID' });
            const subId = parseInt(id, 10);
            if (isNaN(subId)) return res.status(400).json({ error: 'Invalid ID format' });
            await query('DELETE FROM subscriptions WHERE id = $1 AND user_id = $2', [subId, userId]);
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Subscriptions error:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};
