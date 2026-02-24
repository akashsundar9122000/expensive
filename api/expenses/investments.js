const { query } = require('../_lib/db');
const { getEmailFromRequest, cors } = require('../_lib/auth');

module.exports = async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const email = getEmailFromRequest(req);
    if (!email) return res.status(401).json({ error: 'Unauthorized' });

    const parsePositiveAmount = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return null;
        return parsed;
    };

    try {
        const userResult = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        if (userResult.rows.length === 0) return res.status(401).json({ error: 'User not found' });
        const userId = userResult.rows[0].id;

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
                'SELECT id, type, name, amount, return_pct as "returnPct" FROM investments WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
                [userId]
            );
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            const { type, name, amount, returnPct } = req.body;
            const sanitizedType = String(type || '').trim();
            const sanitizedName = String(name || '').trim();
            const sanitizedAmount = parsePositiveAmount(amount);
            const sanitizedReturnPct = returnPct === undefined || returnPct === null || returnPct === ''
                ? null
                : Number(returnPct);

            if (!sanitizedType || !sanitizedName || sanitizedAmount === null) {
                return res.status(400).json({ error: 'Type, name, and a positive amount are required' });
            }

            if (sanitizedReturnPct !== null && !Number.isFinite(sanitizedReturnPct)) {
                return res.status(400).json({ error: 'Invalid return percentage' });
            }

            const result = await query(
                'INSERT INTO investments (user_id, type, name, amount, return_pct) VALUES ($1, $2, $3, $4, $5) RETURNING id, type, name, amount, return_pct as "returnPct"',
                [userId, sanitizedType, sanitizedName, sanitizedAmount, sanitizedReturnPct]
            );
            return res.status(200).json(result.rows[0]);
        }

        if (req.method === 'PUT') {
            const { id, type, name, amount, returnPct } = req.body || {};
            const parsedId = Number(id);
            const sanitizedType = String(type || '').trim();
            const sanitizedName = String(name || '').trim();
            const sanitizedAmount = parsePositiveAmount(amount);
            const sanitizedReturnPct = returnPct === undefined || returnPct === null || returnPct === ''
                ? null
                : Number(returnPct);

            if (!Number.isInteger(parsedId) || parsedId <= 0) {
                return res.status(400).json({ error: 'Valid ID is required' });
            }

            if (!sanitizedType || !sanitizedName || sanitizedAmount === null) {
                return res.status(400).json({ error: 'Type, name, and a positive amount are required' });
            }

            if (sanitizedReturnPct !== null && !Number.isFinite(sanitizedReturnPct)) {
                return res.status(400).json({ error: 'Invalid return percentage' });
            }

            const result = await query(
                `UPDATE investments
                 SET type = $1, name = $2, amount = $3, return_pct = $4
                 WHERE id = $5 AND user_id = $6
                 RETURNING id, type, name, amount, return_pct as "returnPct"`,
                [sanitizedType, sanitizedName, sanitizedAmount, sanitizedReturnPct, parsedId, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Investment not found' });
            }

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
