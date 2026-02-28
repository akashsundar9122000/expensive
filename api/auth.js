const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { query } = require('./_lib/db');
const { generateToken, getEmailFromRequest, cors } = require('./_lib/auth');
const { instrumentRequest } = require('./_lib/perf');

const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT = 10;
const authAttemptCache = new Map();

function getClientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return forwarded || String(req.socket?.remoteAddress || 'unknown');
}

function isRateLimited(req, action) {
    const key = `${action}:${getClientIp(req)}`;
    const now = Date.now();
    const existing = authAttemptCache.get(key);

    if (!existing || existing.expiresAt <= now) {
        authAttemptCache.set(key, { count: 1, expiresAt: now + AUTH_RATE_WINDOW_MS });
        return false;
    }

    existing.count += 1;
    authAttemptCache.set(key, existing);
    return existing.count > AUTH_RATE_LIMIT;
}

module.exports = async (req, res) => {
    instrumentRequest(req, res, 'auth');
    cors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const path = String(req.url || '').split('?')[0].toLowerCase();
    const action = String(req.query?.action || '').toLowerCase();
    const isAction = (...names) => names.some((name) => action === name || path.endsWith(`/${name}`));

    // ROUTING: /api/auth/login
    if (isAction('login') && req.method === 'POST') {
        try {
            if (isRateLimited(req, 'login')) {
                return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
            }

            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

            const result = await query('SELECT id, name, email, password, avatar_url FROM users WHERE LOWER(email) = LOWER($1)', [email]);
            if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

            const user = result.rows[0];
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

            const token = generateToken(user.email, user.id);
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
    if (isAction('register') && req.method === 'POST') {
        try {
            if (isRateLimited(req, 'register')) {
                return res.status(429).json({ error: 'Too many registration attempts. Please try again later.' });
            }

            const { name, email, password } = req.body;
            if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

            const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
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

            const token = generateToken(user.email, user.id);
            return res.status(200).json({ token, name: user.name, email: user.email });
        } catch (err) {
            console.error('Register error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ROUTING: /api/auth/google
    if (isAction('google') && req.method === 'POST') {
        try {
            const { idToken } = req.body;
            if (!idToken) return res.status(400).json({ error: 'Missing Google token' });

            const verifyResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
            if (!verifyResponse.ok) return res.status(400).json({ error: 'Invalid Google token' });

            const googleData = await verifyResponse.json();
            const email = (googleData.email || '').toLowerCase().trim();
            if (!email) return res.status(400).json({ error: 'Email missing in Google profile' });

            let userResult = await query('SELECT id, name, email, password, avatar_url FROM users WHERE LOWER(email) = $1', [email]);

            if (userResult.rows.length === 0) {
                const name = googleData.name || email.split('@')[0] || 'User';
                const avatarUrl = googleData.picture || null;
                const userId = randomUUID();
                const generatedPassword = await bcrypt.hash(randomUUID(), 10);

                userResult = await query(
                    'INSERT INTO users (id, name, email, password, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, password, avatar_url',
                    [userId, name, email, generatedPassword, avatarUrl]
                );

                await query(
                    'INSERT INTO user_preferences (user_id, goal_name, goal_required, goal_collected, total_investment, invest_amount) VALUES ($1, $2, $3, $4, $5, $6)',
                    [userId, 'Savings Goal', 100000, 0, 0, 0]
                );
            }

            const user = userResult.rows[0];
            const token = generateToken(user.email, user.id);
            return res.status(200).json({
                token,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatar_url
            });
        } catch (err) {
            console.error('Google auth error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ROUTING: /api/auth/forgot-password
    if (isAction('forgot-password') && req.method === 'POST') {
        try {
            if (isRateLimited(req, 'forgot-password')) {
                return res.status(429).json({ error: 'Too many password reset attempts. Please try again later.' });
            }

            const authenticatedEmail = getEmailFromRequest(req);
            if (!authenticatedEmail) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { email, newPassword } = req.body;
            if (!email || !newPassword || String(newPassword).trim().length < 6) {
                return res.status(400).json({ error: 'Email and valid new password are required' });
            }

            const normalizedEmail = String(email).toLowerCase().trim();
            if (normalizedEmail !== String(authenticatedEmail).toLowerCase().trim()) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const userResult = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);

            if (userResult.rows.length > 0) {
                const hashedPassword = await bcrypt.hash(String(newPassword).trim(), 10);
                await query('UPDATE users SET password = $1 WHERE LOWER(email) = $2', [hashedPassword, normalizedEmail]);
            }

            return res.status(200).json({ message: 'Password updated successfully' });
        } catch (err) {
            console.error('Forgot password error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ROUTING: /api/auth/profile
    if (isAction('profile')) {
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
                await query(`UPDATE users SET ${updates.join(', ')} WHERE LOWER(email) = LOWER($${i})`, values);
                return res.status(200).json({ message: 'Profile updated successfully' });
            }
        } catch (err) {
            console.error('Profile update error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
