const jwt = require('jsonwebtoken');
const { query } = require('./db');

const SECRET_KEY = process.env.JWT_SECRET || '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';

function generateToken(email, userId) {
    return jwt.sign({ sub: email, uid: userId || undefined }, SECRET_KEY, { expiresIn: '24h' });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (e) {
        return null;
    }
}

const USER_CACHE_TTL_MS = 5 * 60 * 1000;
const userIdCache = new Map();

function getAuthContextFromRequest(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;

    const decoded = verifyToken(auth.substring(7));
    if (!decoded) return null;

    const email = typeof decoded.sub === 'string' ? decoded.sub : null;
    const userId = typeof decoded.uid === 'string' ? decoded.uid : null;

    if (!email) return null;
    return { email, userId };
}

function getEmailFromRequest(req) {
    return getAuthContextFromRequest(req)?.email || null;
}

async function resolveUserByEmail(email, includePassword = false) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return null;

    const cached = userIdCache.get(normalizedEmail);
    const now = Date.now();
    if (cached && cached.expiresAt > now && !includePassword) {
        return { id: cached.id, email: normalizedEmail };
    }

    const columns = includePassword ? 'id, email, password' : 'id, email';
    const userResult = await query(`SELECT ${columns} FROM users WHERE LOWER(email) = LOWER($1)`, [normalizedEmail]);
    if (userResult.rows.length === 0) return null;

    const user = userResult.rows[0];
    userIdCache.set(normalizedEmail, {
        id: user.id,
        expiresAt: now + USER_CACHE_TTL_MS
    });

    return user;
}

async function getUserFromRequest(req, { includePassword = false } = {}) {
    try {
        const context = getAuthContextFromRequest(req);
        if (!context) return null;

        if (context.userId) {
            if (!includePassword) {
                return { id: context.userId, email: context.email };
            }

            const userResult = await query('SELECT id, email, password FROM users WHERE id = $1', [context.userId]);
            if (userResult.rows.length > 0) {
                return userResult.rows[0];
            }
        }

        return resolveUserByEmail(context.email, includePassword);
    } catch (error) {
        return null;
    }
}

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
}

module.exports = { generateToken, verifyToken, getAuthContextFromRequest, getEmailFromRequest, getUserFromRequest, cors };
