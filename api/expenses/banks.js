const { query } = require('../_lib/db');
const { getEmailFromRequest, cors } = require('../_lib/auth');

function readParam(req, key) {
    if (req.query && req.query[key] !== undefined) return req.query[key];
    if (req.body && req.body[key] !== undefined) return req.body[key];
    try {
        const parsed = new URL(req.url, 'http://localhost');
        const value = parsed.searchParams.get(key);
        if (value !== null) return value;
    } catch (_) {
        // ignore URL parsing errors
    }
    return undefined;
}

module.exports = async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const email = getEmailFromRequest(req);
    if (!email) return res.status(401).json({ error: 'Unauthorized' });

    const userResult = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (userResult.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    const userId = userResult.rows[0].id;

    try {
        if (req.method === 'GET') {
            const result = await query('SELECT id, name, balance FROM bank_accounts WHERE user_id = $1 ORDER BY created_at ASC', [userId]);
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            const name = readParam(req, 'name');
            const balanceParam = readParam(req, 'balance');
            const parsedBalance = balanceParam !== undefined && balanceParam !== null && balanceParam !== ''
                ? parseFloat(balanceParam)
                : 0;
            const balance = Number.isFinite(parsedBalance) ? parsedBalance : 0;
            if (!name) return res.status(400).json({ error: 'Bank name required' });
            const result = await query(
                'INSERT INTO bank_accounts (user_id, name, balance) VALUES ($1, $2, $3) RETURNING id, name, balance',
                [userId, name, balance]
            );
            return res.status(200).json(result.rows[0]);
        }

        if (req.method === 'PUT') {
            const id = readParam(req, 'id');
            const name = readParam(req, 'name');
            const balanceParam = readParam(req, 'balance');
            const parsedBalance = balanceParam !== undefined && balanceParam !== null && balanceParam !== ''
                ? parseFloat(balanceParam)
                : null;
            const balance = parsedBalance === null
                ? null
                : (Number.isFinite(parsedBalance) ? parsedBalance : null);
            if (!id || !name) return res.status(400).json({ error: 'Bank id and name required' });
            const result = await query(
                'UPDATE bank_accounts SET name = $1, balance = COALESCE($2, balance) WHERE id = $3 AND user_id = $4 RETURNING id, name, balance',
                [name, balance, id, userId]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'Bank not found' });
            return res.status(200).json(result.rows[0]);
        }

        if (req.method === 'DELETE') {
            const id = readParam(req, 'id');
            if (!id) return res.status(400).json({ error: 'Bank id required' });

            const countResult = await query('SELECT COUNT(*)::int AS count FROM bank_accounts WHERE user_id = $1', [userId]);
            const bankCount = countResult.rows[0]?.count || 0;
            if (bankCount <= 1) {
                return res.status(400).json({ error: 'At least one bank account is required' });
            }

            await query('DELETE FROM bank_accounts WHERE id = $1 AND user_id = $2', [id, userId]);
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Banks error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
