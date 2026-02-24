const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { query } = require('./_lib/db');
const { generateToken, getEmailFromRequest, cors } = require('./_lib/auth');

module.exports = async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const path = req.url.split('?')[0];

    // ROUTING: /api/auth/login
    if (path.endsWith('/login') && req.method === 'POST') {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

            const result = await query('SELECT id, name, email, password, avatar_url FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

            const user = result.rows[0];
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

            const token = generateToken(email);
            return res.status(200).json({
                token,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatar_url
            });
        } catch (err) {
            console.error('Login error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ROUTING: /api/auth/register
    if (path.endsWith('/register') && req.method === 'POST') {
        try {
            const { name, email, password } = req.body;
            if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

            const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
            if (existing.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = randomUUID();
            const userResult = await query(
                'INSERT INTO users (id, name, email, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
                [userId, name, email, hashedPassword]
            );
            const user = userResult.rows[0];

            await query(
                'INSERT INTO user_preferences (user_id, goal_name, goal_required, goal_collected, total_investment, invest_amount) VALUES ($1, $2, $3, $4, $5, $6)',
                [user.id, 'Savings Goal', 100000, 0, 0, 0]
            );

            const token = generateToken(email);
            return res.status(200).json({ token, name: user.name, email: user.email });
        } catch (err) {
            console.error('Register error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ROUTING: /api/auth/profile
    if (path.endsWith('/profile')) {
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

                if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

                values.push(email);
                await query(`UPDATE users SET ${updates.join(', ')} WHERE email = $${i}`, values);
                return res.status(200).json({ message: 'Profile updated successfully' });
            }
        } catch (err) {
            console.error('Profile update error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
