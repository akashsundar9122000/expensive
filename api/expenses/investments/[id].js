const { query } = require('../../_lib/db');
const { getEmailFromRequest, cors } = require('../../_lib/auth');

module.exports = async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

    const email = getEmailFromRequest(req);
    if (!email) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const { id } = req.query;
        await query('DELETE FROM investments WHERE id = $1', [id]);
        res.status(200).json({});
    } catch (err) {
        console.error('Delete investment error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
