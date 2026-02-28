const { query } = require('../_lib/db');
const { getUserFromRequest, cors } = require('../_lib/auth');
const { instrumentRequest } = require('../_lib/perf');

module.exports = async (req, res) => {
    instrumentRequest(req, res, 'expenses.budgets');
    cors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const userId = user.id;

        if (req.method === 'GET') {
            const result = await query(
                'SELECT category, limit_amount as "limitAmount", month, year FROM budgets WHERE user_id = $1 ORDER BY year DESC, month ASC, category ASC',
                [userId]
            );
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST' || req.method === 'PUT') {
            const { category, limitAmount, month, year } = req.body;
            const parsedMonth = Number(month);
            const parsedYear = Number(year);
            if (!category || limitAmount === undefined) {
                return res.status(400).json({ error: 'Category and limitAmount are required' });
            }
            if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
                return res.status(400).json({ error: 'Month must be an integer between 1 and 12' });
            }
            if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 3000) {
                return res.status(400).json({ error: 'Year must be a valid integer between 2000 and 3000' });
            }

            await query(`
                INSERT INTO budgets (user_id, category, limit_amount, month, year)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (user_id, category, month, year)
                DO UPDATE SET limit_amount = EXCLUDED.limit_amount
            `, [userId, category, limitAmount, parsedMonth, parsedYear]);

            return res.status(200).json({ success: true, category, limitAmount, month: parsedMonth, year: parsedYear });
        }

        if (req.method === 'DELETE') {
            const { category, month, year } = req.query;
            const parsedMonth = Number(month);
            const parsedYear = Number(year);
            if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
                return res.status(400).json({ error: 'Month must be an integer between 1 and 12' });
            }
            if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 3000) {
                return res.status(400).json({ error: 'Year must be a valid integer between 2000 and 3000' });
            }
            await query('DELETE FROM budgets WHERE user_id = $1 AND category = $2 AND month = $3 AND year = $4', [userId, category, parsedMonth, parsedYear]);
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Budgets error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
