const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('./db');

const configuredSecret = String(process.env.JWT_SECRET || '').trim();
const SECRET_KEY = configuredSecret || crypto.randomBytes(64).toString('hex');
if (!configuredSecret) {
    console.warn('[security] JWT_SECRET is not set; using an ephemeral runtime secret. Set JWT_SECRET in production.');
}

const JWT_ISSUER = String(process.env.JWT_ISSUER || 'expense-tracker-api').trim();

const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

function getAllowedOrigins() {
    const configured = String(process.env.ALLOWED_ORIGINS || '').trim();
    if (!configured) return DEFAULT_ALLOWED_ORIGINS;

    return configured
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

function generateToken(email, userId) {
    return jwt.sign(
        { sub: email, uid: userId || undefined },
        SECRET_KEY,
        { expiresIn: '24h', algorithm: 'HS256', issuer: JWT_ISSUER }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'], issuer: JWT_ISSUER });
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

function cors(reqOrRes, maybeRes) {
    const req = maybeRes ? reqOrRes : null;
    const res = maybeRes || reqOrRes;
    const origin = req?.headers?.origin;
    const allowedOrigins = getAllowedOrigins();

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
}

module.exports = { generateToken, verifyToken, getAuthContextFromRequest, getEmailFromRequest, getUserFromRequest, cors };
