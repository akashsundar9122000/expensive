const { getPerfSummary, resetPerfSummary } = require('./_lib/perf');

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Perf-Key');
}

function isAuthorized(req) {
    const configured = String(process.env.PERF_ADMIN_KEY || '').trim();
    if (!configured) return true;

    const headerKey = String(req.headers['x-perf-key'] || '').trim();
    const queryKey = String(req.query?.key || '').trim();
    return headerKey === configured || queryKey === configured;
}

module.exports = async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'POST' && String(req.query?.action || '').toLowerCase() === 'reset') {
        resetPerfSummary();
        return res.status(200).json({ ok: true, reset: true });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(200).json({ ok: true, summary: getPerfSummary() });
};