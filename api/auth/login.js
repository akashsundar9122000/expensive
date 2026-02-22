const bcrypt = require('bcryptjs');
const { query } = require('../_lib/db');
const { generateToken, cors } = require('../_lib/auth');

module.exports = async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

        const result = await query('SELECT id, name, email, password, avatar_url FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = generateToken(email);
        res.status(200).json({
            token,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatar_url
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
