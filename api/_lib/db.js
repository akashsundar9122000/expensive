const { Pool } = require('pg');

let pool;

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://postgres.qukgojqbtlolatavllht:2iVE5drWiUlKDY88@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
            ssl: { rejectUnauthorized: false },
            max: 5,
        });
    }
    return pool;
}

async function query(text, params) {
    const client = await getPool().connect();
    try {
        const result = await client.query(text, params);
        return result;
    } finally {
        client.release();
    }
}

module.exports = { query, getPool };
