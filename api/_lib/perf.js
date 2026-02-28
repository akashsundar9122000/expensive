const MAX_EVENTS = Number(process.env.PERF_MAX_EVENTS || 300);
const perfState = {
    events: [],
    byLabel: new Map(),
    startedAt: new Date().toISOString()
};

function pushEvent(event) {
    perfState.events.push(event);
    if (perfState.events.length > MAX_EVENTS) {
        perfState.events.shift();
    }
}

function updateAggregates(event) {
    const key = event.label;
    const current = perfState.byLabel.get(key) || {
        count: 0,
        errors: 0,
        slowCount: 0,
        totalMs: 0,
        maxMs: 0,
        minMs: Number.POSITIVE_INFINITY,
        lastStatus: 0,
        lastSeenAt: null,
        samples: []
    };

    current.count += 1;
    if (event.statusCode >= 400) current.errors += 1;
    if (event.isSlow) current.slowCount += 1;
    current.totalMs += event.durationMs;
    current.maxMs = Math.max(current.maxMs, event.durationMs);
    current.minMs = Math.min(current.minMs, event.durationMs);
    current.lastStatus = event.statusCode;
    current.lastSeenAt = event.at;
    current.samples.push(event.durationMs);

    if (current.samples.length > 120) {
        current.samples.shift();
    }

    perfState.byLabel.set(key, current);
}

function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function getPerfSummary() {
    const labels = [];

    for (const [label, value] of perfState.byLabel.entries()) {
        const durations = [...value.samples].sort((a, b) => a - b);
        const avgMs = value.count > 0 ? Math.round(value.totalMs / value.count) : 0;

        labels.push({
            label,
            count: value.count,
            errors: value.errors,
            slowCount: value.slowCount,
            avgMs,
            p50Ms: percentile(durations, 50),
            p95Ms: percentile(durations, 95),
            minMs: Number.isFinite(value.minMs) ? value.minMs : 0,
            maxMs: value.maxMs,
            lastStatus: value.lastStatus,
            lastSeenAt: value.lastSeenAt
        });
    }

    labels.sort((a, b) => (b.p95Ms || 0) - (a.p95Ms || 0));

    return {
        startedAt: perfState.startedAt,
        maxEvents: MAX_EVENTS,
        bufferedEvents: perfState.events.length,
        labels,
        recentSlow: perfState.events.filter((event) => event.isSlow).slice(-20).reverse()
    };
}

function resetPerfSummary() {
    perfState.events = [];
    perfState.byLabel.clear();
    perfState.startedAt = new Date().toISOString();
}

function instrumentRequest(req, res, label) {
    const start = Date.now();
    const shouldLog = String(process.env.PERF_LOG || '').toLowerCase() === 'true';
    const slowMs = Number(process.env.PERF_SLOW_MS || 800);

    res.on('finish', () => {
        const durationMs = Date.now() - start;
        const isSlow = durationMs >= slowMs;

        if (!shouldLog && !isSlow) {
            return;
        }

        const method = req.method || 'UNKNOWN';
        const url = req.url || '';
        const statusCode = res.statusCode;
        const tag = isSlow ? 'SLOW_API' : 'API';
        const event = {
            at: new Date().toISOString(),
            label,
            method,
            url,
            statusCode,
            durationMs,
            isSlow
        };

        pushEvent(event);
        updateAggregates(event);

        console.log(`[${tag}] ${label} ${method} ${url} status=${statusCode} durationMs=${durationMs}`);
    });
}

module.exports = { instrumentRequest, getPerfSummary, resetPerfSummary };