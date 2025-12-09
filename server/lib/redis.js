// server/lib/redis.js
// 简单、可靠的 Promise 风格 Redis wrapper
// 使用方法：const redis = require('../lib/redis');
// await redis.set('key', JSON.stringify(val), 30); // ttl 秒
// const v = await redis.get('key');

const { createClient } = require('redis');
const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let client;
let connected = false;

function makeClient() {
    if (client) return client;
    client = createClient({ url });
    client.on('error', (err) => console.error('[redis] error', err && (err.stack || err.message || err)));
    client.on('connect', () => console.log('[redis] connecting...'));
    client.on('ready', () => {
        connected = true;
        console.log('[redis] connected');
    });
    // connect immediately
    client.connect().catch(err => {
        console.error('[redis] connect failed', err && (err.stack || err.message || err));
    });
    return client;
}

makeClient();

async function get(key) {
    if (!client) makeClient();
    try {
        const v = await client.get(key);
        return v;
    } catch (e) {
        console.error('[redis] get error', e && (e.stack || e.message || e));
        return null;
    }
}

async function set(key, value, ttlSeconds) {
    if (!client) makeClient();
    try {
        if (typeof ttlSeconds === 'number' && ttlSeconds > 0) {
            // SET key value EX ttl
            await client.set(key, value, { EX: ttlSeconds });
        } else {
            await client.set(key, value);
        }
        return true;
    } catch (e) {
        console.error('[redis] set error', e && (e.stack || e.message || e));
        return false;
    }
}

async function del(key) {
    if (!client) makeClient();
    try {
        await client.del(key);
        return true;
    } catch (e) {
        console.error('[redis] del error', e && (e.stack || e.message || e));
        return false;
    }
}

async function disconnect() {
    if (!client) return;
    try {
        await client.quit();
        connected = false;
    } catch (e) {
        try { await client.disconnect(); } catch (_) { }
    }
}

module.exports = { get, set, del, disconnect, client };
