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
        // Ensure investments table exists (idempotent)
        await query(`
            CREATE TABLE IF NOT EXISTS investments (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                amount NUMERIC NOT NULL,
                return_pct NUMERIC,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

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

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Missing ID' });
            await query('DELETE FROM investments WHERE id = $1 AND user_id = $2', [id, userId]);
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Investments error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
