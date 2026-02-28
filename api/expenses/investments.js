const { query } = require('../_lib/db');
const { getUserFromRequest, cors } = require('../_lib/auth');
const bcrypt = require('bcryptjs');
const { instrumentRequest } = require('../_lib/perf');

module.exports = async (req, res) => {
    instrumentRequest(req, res, 'expenses.investments');
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const requiresPassword = req.method === 'DELETE';
    const user = await getUserFromRequest(req, { includePassword: requiresPassword });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const parsePositiveAmount = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return null;
        return parsed;
    };

    try {
        const userId = user.id;
        const userPassword = user.password;

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
            const rawPassword = String(req.body?.password || '').trim();
            if (!rawPassword) {
                return res.status(400).json({ error: 'Password is required' });
            }

            const isBcryptHash = typeof userPassword === 'string' && /^\$2[aby]?\$\d{2}\$/.test(userPassword);
            const passwordMatches = isBcryptHash
                ? await bcrypt.compare(rawPassword, userPassword)
                : userPassword === rawPassword;

            if (!passwordMatches) {
                return res.status(400).json({ error: 'Incorrect password' });
            }

            await query('DELETE FROM investments WHERE id = $1 AND user_id = $2', [id, userId]);
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Investments error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
