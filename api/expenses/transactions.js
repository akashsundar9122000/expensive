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
                'SELECT id, amount, category, sub_category as "subCategory", date, mode FROM transactions WHERE user_id = $1 ORDER BY date DESC',
                [userId]
            );
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            const { amount, category, subCategory, date, mode } = req.body;
            const bankName = req.query.bankName || 'SBI';

            // Get or create bank account
            let bankResult = await query('SELECT id, balance FROM bank_accounts WHERE user_id = $1 AND name = $2', [userId, bankName]);
            let bankId, balance;
            if (bankResult.rows.length === 0) {
                const newBank = await query('INSERT INTO bank_accounts (user_id, name, balance) VALUES ($1, $2, 0) RETURNING id, balance', [userId, bankName]);
                bankId = newBank.rows[0].id;
                balance = 0;
            } else {
                bankId = bankResult.rows[0].id;
                balance = parseFloat(bankResult.rows[0].balance);
            }

            // Insert transaction
            const txResult = await query(
                'INSERT INTO transactions (user_id, amount, category, sub_category, date, mode, bank_account_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, amount, category, sub_category as "subCategory", date, mode',
                [userId, amount, category, subCategory, date, mode, bankId]
            );

            // Update balance
            await query('UPDATE bank_accounts SET balance = $1 WHERE id = $2', [balance - parseFloat(amount), bankId]);

            return res.status(200).json(txResult.rows[0]);
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Missing ID' });
            await query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Transactions error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
