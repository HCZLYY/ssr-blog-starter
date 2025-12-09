// server/scripts/warm_cache.js
// Robust cache warmer: waits until server ready, then warms list + detail keys
const fetch = globalThis.fetch || require('node-fetch'); // node 18+ has fetch; fallback to node-fetch if installed
const db = require('../services/db');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const HEALTH_PATH = '/api/v1/articles?page=1&limit=1'; // light check
const MAX_WAIT_MS = 30 * 1000; // wait up to 30s for server to be ready
const CHECK_INTERVAL_MS = 1000;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function waitForServer() {
    const start = Date.now();
    while (Date.now() - start < MAX_WAIT_MS) {
        try {
            const r = await fetch(`${API_BASE}${HEALTH_PATH}`, { method: 'GET', timeout: 3000 });
            if (r.ok) return true;
        } catch (e) {
            // ignore
        }
        await sleep(CHECK_INTERVAL_MS);
    }
    return false;
}

async function warmList() {
    console.log('Warming list cache...');
    try {
        const r = await fetch(`${API_BASE}/api/v1/articles?page=1&limit=10`);
        if (!r.ok) throw new Error('list warm failed status ' + r.status);
        console.log('warmList ok');
    } catch (e) {
        console.warn('warmList failed', e.message);
        throw e;
    }
}

async function warmDetail() {
    console.log('Warming detail cache...');
    // get top N ids from db directly (avoid another HTTP roundtrip)
    try {
        const [rows] = await db.query('SELECT id FROM articles WHERE status="published" AND (deleted_at IS NULL) ORDER BY id DESC LIMIT 5');
        for (const r of rows) {
            let attempts = 0;
            while (attempts < MAX_RETRIES) {
                attempts++;
                try {
                    const resp = await fetch(`${API_BASE}/api/v1/articles/${r.id}`);
                    if (resp.ok) {
                        console.log('warmed', r.id);
                        break;
                    } else {
                        console.warn('warm detail', r.id, 'status', resp.status);
                    }
                } catch (err) {
                    console.warn('warm detail fetch error', r.id, err.message);
                }
                await sleep(RETRY_DELAY_MS * attempts); // simple backoff
            }
        }
    } catch (e) {
        console.warn('warmDetail failed', e.message);
        throw e;
    }
}

(async () => {
    try {
        console.log('warm_cache: waiting for server to be ready...');
        const ok = await waitForServer();
        if (!ok) {
            console.warn('Server not ready after wait — attempting anyway');
        }
        await warmList();
        await warmDetail();
        console.log('Cache warming finished.');
        // graceful exit
        process.exit(0);
    } catch (e) {
        console.error('warming failed', e);
        // exit non-zero so pm2 can log the failure; but do it gracefully
        process.exit(1);
    }
})();
