// server/services/cache.js
const redis = require('redis');
require('dotenv').config();

let client = null;
let ready = false;

async function initRedis() {
    if (client) return;
    try {
        client = redis.createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
        client.on('error', (err) => {
            console.error('Redis client error', err);
            ready = false;
        });
        await client.connect();
        ready = true;
        console.log('Redis connected');
    } catch (err) {
        console.error('Redis connect error', err);
        client = null;
        ready = false;
    }
}

// 尝试初始化（非阻塞）
initRedis().catch(err => console.error('initRedis failed', err));

async function cacheGet(key) {
    if (!ready || !client) return null;
    try {
        const v = await client.get(key);
        return v ? JSON.parse(v) : null;
    } catch (err) {
        console.error('cacheGet error', err);
        return null;
    }
}
async function cacheSet(key, value, ttl = 60) {
    if (!ready || !client) return false;
    try {
        await client.set(key, JSON.stringify(value), { EX: ttl });
        return true;
    } catch (err) {
        console.error('cacheSet error', err);
        return false;
    }
}
async function cacheDel(key) {
    if (!ready || !client) return false;
    try {
        await client.del(key);
        return true;
    } catch (err) {
        console.error('cacheDel error', err);
        return false;
    }
}

function getClient() {
    // 返回客户端实例（可能为 null）
    return client;
}

module.exports = { initRedis, cacheGet, cacheSet, cacheDel, getClient };
