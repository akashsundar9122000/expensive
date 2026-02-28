const { query } = require('../_lib/db');
const { getUserFromRequest, cors } = require('../_lib/auth');
const bcrypt = require('bcryptjs');
const { instrumentRequest } = require('../_lib/perf');

module.exports = async (req, res) => {
    instrumentRequest(req, res, 'expenses.sips');
    cors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const requiresPassword = req.method === 'DELETE';
    const user = await getUserFromRequest(req, { includePassword: requiresPassword });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const parsePositiveAmount = (value) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return null;
        return parsed;
    };

    const parseSipDay = (value) => {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) return null;
        return parsed;
    };

    try {
        const userId = user.id;
        const userPassword = user.password;

        if (req.method === 'GET') {
            const result = await query(
                "SELECT id, type, COALESCE(investment_name, '') as \"investmentName\", monthly_amount as \"monthlyAmount\", sip_day as \"sipDay\", bank_name as \"bankName\" FROM sips WHERE user_id = $1 ORDER BY created_at DESC, id DESC",
                [userId]
            );
            return res.status(200).json(result.rows);
        }

        if (req.method === 'POST') {
            const { type, investmentName, monthlyAmount, sipDay, bankName } = req.body || {};
            const sanitizedType = String(type || '').trim();
            const sanitizedInvestmentName = String(investmentName || '').trim();
            const sanitizedBankName = String(bankName || '').trim();
            const sanitizedMonthlyAmount = parsePositiveAmount(monthlyAmount);
            const sanitizedSipDay = parseSipDay(sipDay);

            if (!sanitizedType || !sanitizedInvestmentName || !sanitizedBankName || sanitizedMonthlyAmount === null || sanitizedSipDay === null) {
                return res.status(400).json({ error: 'Type, investmentName, bankName, monthlyAmount (>0), and sipDay (1-31) are required' });
            }

            const result = await query(
                'INSERT INTO sips (user_id, type, investment_name, monthly_amount, sip_day, bank_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, type, investment_name as "investmentName", monthly_amount as "monthlyAmount", sip_day as "sipDay", bank_name as "bankName"',
                [userId, sanitizedType, sanitizedInvestmentName, sanitizedMonthlyAmount, sanitizedSipDay, sanitizedBankName]
            );

            return res.status(200).json(result.rows[0]);
        }

        if (req.method === 'PUT') {
            const { id, type, investmentName, monthlyAmount, sipDay, bankName } = req.body || {};
            const parsedId = Number(id);
            const sanitizedType = String(type || '').trim();
            const sanitizedInvestmentName = String(investmentName || '').trim();
            const sanitizedBankName = String(bankName || '').trim();
            const sanitizedMonthlyAmount = parsePositiveAmount(monthlyAmount);
            const sanitizedSipDay = parseSipDay(sipDay);

            if (!Number.isInteger(parsedId) || parsedId <= 0) {
                return res.status(400).json({ error: 'Valid ID is required' });
            }

            if (!sanitizedType || !sanitizedInvestmentName || !sanitizedBankName || sanitizedMonthlyAmount === null || sanitizedSipDay === null) {
                return res.status(400).json({ error: 'Type, investmentName, bankName, monthlyAmount (>0), and sipDay (1-31) are required' });
            }

            const result = await query(
                `UPDATE sips
                 SET type = $1, investment_name = $2, monthly_amount = $3, sip_day = $4, bank_name = $5
                 WHERE id = $6 AND user_id = $7
                 RETURNING id, type, investment_name as "investmentName", monthly_amount as "monthlyAmount", sip_day as "sipDay", bank_name as "bankName"`,
                [sanitizedType, sanitizedInvestmentName, sanitizedMonthlyAmount, sanitizedSipDay, sanitizedBankName, parsedId, userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'SIP not found' });
            }

            return res.status(200).json(result.rows[0]);
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            const parsedId = Number(id);
            if (!Number.isInteger(parsedId) || parsedId <= 0) {
                return res.status(400).json({ error: 'Valid ID is required' });
            }

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

            await query('DELETE FROM sips WHERE id = $1 AND user_id = $2', [parsedId, userId]);
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('SIPs error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
