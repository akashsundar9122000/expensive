const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';

function generateToken(email) {
    return jwt.sign({ sub: email }, SECRET_KEY, { expiresIn: '24h' });
}

function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        return decoded.sub; // email
    } catch (e) {
        return null;
    }
}

function getEmailFromRequest(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return verifyToken(auth.substring(7));
}

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
}

module.exports = { generateToken, verifyToken, getEmailFromRequest, cors };
