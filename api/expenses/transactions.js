const { query } = require('../_lib/db');
const { getUserFromRequest, cors } = require('../_lib/auth');
const { instrumentRequest } = require('../_lib/perf');

module.exports = async (req, res) => {
    instrumentRequest(req, res, 'expenses.transactions');
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const userId = user.id;

        if (req.method === 'GET') {
            const result = await query(
                `SELECT t.id, t.amount, t.category, t.sub_category as "subCategory", t.date, t.mode, b.name as "bankName"
                 FROM transactions t
                 LEFT JOIN bank_accounts b ON b.id = t.bank_account_id
                 WHERE t.user_id = $1
                 ORDER BY t.date DESC`,
                [userId]
            );
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            const { amount, category, subCategory, date, mode } = req.body;
            const bankName = req.query.bankName;
            if (!bankName) return res.status(400).json({ error: 'bankName is required' });

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
                `INSERT INTO transactions (user_id, amount, category, sub_category, date, mode, bank_account_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id, amount, category, sub_category as "subCategory", date, mode`,
                [userId, amount, category, subCategory, date, mode, bankId]
            );

            // Update balance
            await query('UPDATE bank_accounts SET balance = $1 WHERE id = $2', [balance - parseFloat(amount), bankId]);

            return res.status(200).json({ ...txResult.rows[0], bankName });
        }

        if (req.method === 'PUT') {
            const id = req.query.id || req.body?.id;
            if (!id) return res.status(400).json({ error: 'Missing ID' });

            const { amount, category, subCategory, date, mode, bankName } = req.body || {};

            const existingResult = await query(
                `SELECT t.id, t.amount, t.bank_account_id, b.name as "bankName", b.balance
                 FROM transactions t
                 LEFT JOIN bank_accounts b ON b.id = t.bank_account_id
                 WHERE t.id = $1 AND t.user_id = $2`,
                [id, userId]
            );

            if (existingResult.rows.length === 0) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            const existing = existingResult.rows[0];

            let targetBankId = existing.bank_account_id;
            let targetBankName = existing.bankName;

            if (bankName && String(bankName).trim()) {
                const normalizedBankName = String(bankName).trim();
                let bankResult = await query(
                    'SELECT id FROM bank_accounts WHERE user_id = $1 AND name = $2',
                    [userId, normalizedBankName]
                );

                if (bankResult.rows.length === 0) {
                    bankResult = await query(
                        'INSERT INTO bank_accounts (user_id, name, balance) VALUES ($1, $2, 0) RETURNING id',
                        [userId, normalizedBankName]
                    );
                }

                targetBankId = bankResult.rows[0].id;
                targetBankName = normalizedBankName;
            }

            const updatedResult = await query(
                `UPDATE transactions
                 SET amount = $1, category = $2, sub_category = $3, date = $4, mode = $5, bank_account_id = $6
                 WHERE id = $7 AND user_id = $8
                 RETURNING id, amount, category, sub_category as "subCategory", date, mode`,
                [amount, category, subCategory, date, mode, targetBankId, id, userId]
            );

            if (updatedResult.rows.length === 0) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            return res.status(200).json({
                ...updatedResult.rows[0],
                bankName: targetBankName
            });
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
