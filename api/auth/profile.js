const { query } = require('../_lib/db');
const { getEmailFromRequest, cors } = require('../_lib/auth');

module.exports = async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const email = getEmailFromRequest(req);
    if (!email) return res.status(401).json({ error: 'Unauthorized' });

    try {
        if (req.method === 'PUT') {
            const { name, avatarUrl } = req.body;

            const updates = [];
            const values = [];
            let i = 1;

            if (name !== undefined) {
                updates.push(`name = $${i++}`);
                values.push(name);
            }
            if (avatarUrl !== undefined) {
                updates.push(`avatar_url = $${i++}`);
                values.push(avatarUrl);
            }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            values.push(email);
            await query(
                `UPDATE users SET ${updates.join(', ')} WHERE email = $${i}`,
                values
            );

            return res.status(200).json({ message: 'Profile updated successfully' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
