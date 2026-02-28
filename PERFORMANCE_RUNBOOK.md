# Performance Runbook

## 1) Required production env vars

- `DB_AUTO_INIT=false`
- `DB_POOL_MAX=10` (tune to 10-20 depending on DB limits)
- `PERF_LOG=true` (optional; logs all endpoint timings)
- `PERF_SLOW_MS=800` (optional; always logs slower-than-threshold requests)
- `PERF_ADMIN_KEY=<strong-secret>` (recommended for `/api/perf-summary` protection)

## 2) Validate hosted latency

1. Get a JWT token by logging in once from app or API.
2. Run:

```bash
npm run perf:check -- https://<your-hosted-domain> <jwt-token> 8
```

This reports per-endpoint `avg`, `p50`, and `p95`.

## 3) How to interpret

- First run is often slower (cold start + pool warmup).
- Second run should be significantly faster.
- `bootstrap` should replace many older dashboard calls; if slow, inspect DB query timings.

## 4) Expected good signs

- `health` stable and low.
- `bootstrap` lower total user wait than separate endpoint fan-out.
- Fewer repeated dashboard requests after UI actions due to refresh coalescing.

## 5) Runtime summary endpoint

- Get live aggregate summary:

```bash
curl -s https://<your-hosted-domain>/api/perf-summary -H "X-Perf-Key: <PERF_ADMIN_KEY>"
```

- Reset counters and buffers:

```bash
curl -s -X POST "https://<your-hosted-domain>/api/perf-summary?action=reset" -H "X-Perf-Key: <PERF_ADMIN_KEY>"
```

This endpoint returns per-label `count`, `errors`, `avgMs`, `p50Ms`, `p95Ms`, and recent slow requests.
