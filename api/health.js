const { query } = require('./_lib/db');

const REQUIRED_TABLES = [
    'users',
    'user_preferences',
    'bank_accounts',
    'transactions',
    'subscriptions',
    'investments',
    'budgets'
];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const startedAt = Date.now();
    const payload = {
        ok: false,
        service: 'expense-tracker-api',
        timestamp: new Date().toISOString(),
        checks: {
            db: { ok: false },
            schema: { ok: false, missingTables: [] }
        }
    };

    try {
        await query('SELECT 1');
        payload.checks.db.ok = true;

        const tableResult = await query(
            `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            `
        );

        const existing = new Set(tableResult.rows.map((r) => r.table_name));
        const missingTables = REQUIRED_TABLES.filter((name) => !existing.has(name));
        payload.checks.schema.missingTables = missingTables;
        payload.checks.schema.ok = missingTables.length === 0;

        payload.ok = payload.checks.db.ok && payload.checks.schema.ok;
        payload.latencyMs = Date.now() - startedAt;

        return res.status(payload.ok ? 200 : 503).json(payload);
    } catch (err) {
        payload.error = err?.message || 'Health check failed';
        payload.latencyMs = Date.now() - startedAt;
        return res.status(503).json(payload);
    }
};
