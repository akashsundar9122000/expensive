const bcrypt = require('bcryptjs');
const { query } = require('../_lib/db');
const { generateToken, cors } = require('../_lib/auth');

module.exports = async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

        // Check if user exists
        const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const userResult = await query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
            [name, email, hashedPassword]
        );
        const user = userResult.rows[0];

        // Create default preferences
        await query(
            'INSERT INTO user_preferences (user_id, goal_name, goal_required, goal_collected, total_investment, invest_amount) VALUES ($1, $2, $3, $4, $5, $6)',
            [user.id, 'Savings Goal', 100000, 0, 0, 0]
        );

        const token = generateToken(email);
        res.status(200).json({ token, name: user.name, email: user.email });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
