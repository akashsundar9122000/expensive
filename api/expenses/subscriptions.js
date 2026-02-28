const { query } = require('../_lib/db');
const { getUserFromRequest, cors } = require('../_lib/auth');
const { instrumentRequest } = require('../_lib/perf');

module.exports = async (req, res) => {
    instrumentRequest(req, res, 'expenses.subscriptions');
    cors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized - Invalid or missing token' });
    }

    try {
        const userId = user.id;

        if (req.method === 'GET') {
            const result = await query(
                'SELECT id, name, amount, icon, color, date, bank_name as "bankName" FROM subscriptions WHERE user_id = $1',
                [userId]
            );
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            const updateId = req.query.id || req.body?.id;
            if (updateId) {
                const { name, amount, icon, color, date, bankName } = req.body;
                const subId = parseInt(updateId, 10);
                if (isNaN(subId)) return res.status(400).json({ error: 'Invalid ID format' });

                const sanitizedBankName = String(bankName || '').trim();
                if (!sanitizedBankName) return res.status(400).json({ error: 'bankName is required' });

                const updateResult = await query(
                    'UPDATE subscriptions SET name = $1, amount = $2, icon = $3, color = $4, date = $5, bank_name = $6 WHERE id = $7 AND user_id = $8 RETURNING id, name, amount, icon, color, date, bank_name as "bankName"',
                    [name, amount, icon, color, date, sanitizedBankName, subId, userId]
                );
                if (updateResult.rows.length === 0) return res.status(404).json({ error: 'Subscription not found' });
                return res.status(200).json(updateResult.rows[0]);
            }

            const { name, amount, icon, color, date, bankName } = req.body;
            const sanitizedBankName = String(bankName || '').trim();
            if (!sanitizedBankName) return res.status(400).json({ error: 'bankName is required' });

            const result = await query(
                'INSERT INTO subscriptions (user_id, name, amount, icon, color, date, bank_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, amount, icon, color, date, bank_name as "bankName"',
                [userId, name, amount, icon, color, date, sanitizedBankName]
            );
            return res.status(200).json(result.rows[0]);
        }

        if (req.method === 'PUT') {
            // Vercel routes /subscriptions/123 to /subscriptions.js?id=123
            let id = req.query.id;
            
            const { name, amount, icon, color, date, bankName } = req.body;
            const sanitizedBankName = String(bankName || '').trim();
            if (!sanitizedBankName) return res.status(400).json({ error: 'bankName is required' });

            if (!id) return res.status(400).json({ error: 'Missing ID' });
            const subId = parseInt(id, 10);
            if (isNaN(subId)) return res.status(400).json({ error: 'Invalid ID format' });
            
            const result = await query(
                'UPDATE subscriptions SET name = $1, amount = $2, icon = $3, color = $4, date = $5, bank_name = $6 WHERE id = $7 AND user_id = $8 RETURNING id, name, amount, icon, color, date, bank_name as "bankName"',
                [name, amount, icon, color, date, sanitizedBankName, subId, userId]
            );
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
