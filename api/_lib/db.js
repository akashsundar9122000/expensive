const { Pool } = require('pg');

let schemaReadyPromise;
const shouldAutoInitSchema = process.env.DB_AUTO_INIT
    ? process.env.DB_AUTO_INIT !== 'false'
    : process.env.NODE_ENV !== 'production';

const dbConfig = {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.qukgojqbtlolatavllht:2iVE5drWiUlKDY88@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
};

const pool = new Pool({
    ...dbConfig,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
});

async function ensureSchema() {
    if (schemaReadyPromise) return schemaReadyPromise;

    schemaReadyPromise = (async () => {
        const client = await pool.connect();
        try {
            await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password TEXT NOT NULL,
                avatar_url TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

            await client.query(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                goal_name TEXT DEFAULT 'Savings Goal',
                goal_required NUMERIC DEFAULT 100000,
                goal_collected NUMERIC DEFAULT 0,
                total_investment NUMERIC DEFAULT 0,
                invest_amount NUMERIC DEFAULT 0
            )
        `);

            await client.query(`
            CREATE TABLE IF NOT EXISTS bank_accounts (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                balance NUMERIC DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

            await client.query(`
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

            await client.query(`
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

            await client.query(`
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

            await client.query(`
            CREATE TABLE IF NOT EXISTS budgets (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                category TEXT NOT NULL,
                limit_amount NUMERIC NOT NULL,
                UNIQUE(user_id, category)
            )
        `);

            await client.query(`
            CREATE TABLE IF NOT EXISTS sips (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                investment_name TEXT,
                monthly_amount NUMERIC NOT NULL,
                sip_day INTEGER NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

            await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
            await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

            await client.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS goal_name TEXT DEFAULT 'Savings Goal'`);
            await client.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS goal_required NUMERIC DEFAULT 100000`);
            await client.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS goal_collected NUMERIC DEFAULT 0`);
            await client.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS total_investment NUMERIC DEFAULT 0`);
            await client.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS invest_amount NUMERIC DEFAULT 0`);

            await client.query(`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0`);
            await client.query(`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

            await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_account_id BIGINT REFERENCES bank_accounts(id) ON DELETE SET NULL`);
            await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sub_category TEXT`);
            await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'Card'`);
            await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

            await client.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS icon TEXT`);
            await client.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS color TEXT`);
            await client.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

            await client.query(`ALTER TABLE investments ADD COLUMN IF NOT EXISTS return_pct NUMERIC`);
            await client.query(`ALTER TABLE investments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

            await client.query(`ALTER TABLE budgets ADD COLUMN IF NOT EXISTS limit_amount NUMERIC DEFAULT 0`);

            await client.query(`ALTER TABLE sips ADD COLUMN IF NOT EXISTS investment_name TEXT`);
            await client.query(`ALTER TABLE sips ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

            await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email))`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_name ON bank_accounts (user_id, name)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments (user_id)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets (user_id)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_sips_user_created_at ON sips (user_id, created_at DESC, id DESC)`);
        } finally {
            client.release();
        }
    })().catch((err) => {
        schemaReadyPromise = null;
        throw err;
    });

    return schemaReadyPromise;
}

async function query(text, params) {
    if (shouldAutoInitSchema) {
        await ensureSchema();
    }
    return pool.query(text, params);
}

module.exports = { query };
