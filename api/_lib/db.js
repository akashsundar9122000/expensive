const { Pool } = require('pg');

let pool;
let schemaReadyPromise;

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

async function ensureSchema() {
    if (schemaReadyPromise) return schemaReadyPromise;

    schemaReadyPromise = (async () => {
        const p = getPool();

        await p.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password TEXT NOT NULL,
                avatar_url TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        await p.query(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                goal_name TEXT DEFAULT 'Savings Goal',
                goal_required NUMERIC DEFAULT 100000,
                goal_collected NUMERIC DEFAULT 0,
                total_investment NUMERIC DEFAULT 0,
                invest_amount NUMERIC DEFAULT 0
            )
        `);

        await p.query(`
            CREATE TABLE IF NOT EXISTS bank_accounts (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                balance NUMERIC DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        await p.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                bank_account_id BIGINT REFERENCES bank_accounts(id) ON DELETE SET NULL,
                amount NUMERIC NOT NULL,
                category TEXT NOT NULL,
                sub_category TEXT,
                date DATE NOT NULL,
                mode TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        await p.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                amount NUMERIC NOT NULL,
                date TEXT NOT NULL,
                icon TEXT,
                color TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        await p.query(`
            CREATE TABLE IF NOT EXISTS investments (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                amount NUMERIC NOT NULL,
                return_pct NUMERIC,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        await p.query(`
            CREATE TABLE IF NOT EXISTS budgets (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                category TEXT NOT NULL,
                limit_amount NUMERIC NOT NULL,
                UNIQUE(user_id, category)
            )
        `);

        await p.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
        await p.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

        await p.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS goal_name TEXT DEFAULT 'Savings Goal'`);
        await p.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS goal_required NUMERIC DEFAULT 100000`);
        await p.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS goal_collected NUMERIC DEFAULT 0`);
        await p.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS total_investment NUMERIC DEFAULT 0`);
        await p.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS invest_amount NUMERIC DEFAULT 0`);

        await p.query(`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0`);
        await p.query(`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

        await p.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_account_id BIGINT REFERENCES bank_accounts(id) ON DELETE SET NULL`);
        await p.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sub_category TEXT`);
        await p.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'Card'`);
        await p.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

        await p.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS icon TEXT`);
        await p.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS color TEXT`);
        await p.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

        await p.query(`ALTER TABLE investments ADD COLUMN IF NOT EXISTS return_pct NUMERIC`);
        await p.query(`ALTER TABLE investments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

        await p.query(`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS limit_amount NUMERIC DEFAULT 0`);
    })().catch((err) => {
        schemaReadyPromise = null;
        throw err;
    });

    return schemaReadyPromise;
}

async function query(text, params) {
    await ensureSchema();
    const client = await getPool().connect();
    try {
        const result = await client.query(text, params);
        return result;
    } finally {
        client.release();
    }
}

module.exports = { query, getPool };
