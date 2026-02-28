#!/usr/bin/env node

const baseUrl = (process.argv[2] || process.env.PERF_BASE_URL || '').replace(/\/$/, '');
const token = process.argv[3] || process.env.PERF_TOKEN || '';
const runs = Math.max(1, Number(process.argv[4] || process.env.PERF_RUNS || 5));
const requestTimeoutMs = Math.max(1000, Number(process.env.PERF_TIMEOUT_MS || 7000));

if (!baseUrl) {
    console.error('Usage: node scripts/perf-check.js <baseUrl> [token] [runs]');
    console.error('Example: node scripts/perf-check.js https://your-app.vercel.app <JWT_TOKEN> 8');
    process.exit(1);
}

const endpoints = [
    { name: 'health', path: '/api/health' },
    { name: 'login-probe', path: '/api/auth/login', method: 'POST', body: { email: 'nope@example.com', password: 'x' } },
    { name: 'bootstrap', path: '/api/expenses/bootstrap', auth: true },
    { name: 'transactions', path: '/api/expenses/transactions', auth: true },
    { name: 'stats', path: '/api/expenses/stats', auth: true },
    { name: 'banks', path: '/api/expenses/banks', auth: true }
];

function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

async function timedFetch(endpoint) {
    const headers = { 'Content-Type': 'application/json' };
    if (endpoint.auth && token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs);

    const init = {
        method: endpoint.method || 'GET',
        headers,
        signal: controller.signal
    };

    if (endpoint.body) {
        init.body = JSON.stringify(endpoint.body);
    }

    const start = Date.now();
    let status = 0;
    let ok = false;

    try {
        const response = await fetch(`${baseUrl}${endpoint.path}`, init);
        status = response.status;
        ok = response.ok;
    } catch (error) {
        const aborted = error && error.name === 'AbortError';
        return {
            duration: Date.now() - start,
            status: 0,
            ok: false,
            error: true,
            timeout: aborted
        };
    } finally {
        clearTimeout(timer);
    }

    return { duration: Date.now() - start, status, ok, error: false };
}

(async () => {
    console.log(`Running perf check against ${baseUrl}`);
    console.log(`Runs per endpoint: ${runs}`);
    console.log('');

    for (const endpoint of endpoints) {
        if (endpoint.auth && !token) {
            console.log(`${endpoint.name.padEnd(14)} skipped (no token provided)`);
            continue;
        }

        const results = [];
        for (let i = 0; i < runs; i += 1) {
            const sample = await timedFetch(endpoint);
            results.push(sample);
        }

        const durations = results.map((r) => r.duration).sort((a, b) => a - b);
        const errors = results.filter((r) => r.error).length;
        const timeouts = results.filter((r) => r.timeout).length;
        const success = results.filter((r) => r.ok).length;
        const p50 = percentile(durations, 50);
        const p95 = percentile(durations, 95);
        const avg = Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
        const statusSample = results.find((r) => r.status)?.status || 0;

        console.log(
            `${endpoint.name.padEnd(14)} status=${String(statusSample).padEnd(3)} ok=${String(success).padEnd(2)}/${runs} ` +
            `avg=${String(avg).padStart(4)}ms p50=${String(p50).padStart(4)}ms p95=${String(p95).padStart(4)}ms err=${errors} timeout=${timeouts}`
        );
    }

    console.log('');
    console.log('Tip: run twice; compare first run (cold-ish) vs second run (warm).');
})();
