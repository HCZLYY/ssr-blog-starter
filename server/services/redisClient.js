// server/services/redisClient.js
const redis = require('redis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const client = redis.createClient({
    url: redisUrl,
    socket: {
        // optional: timeout settings
        reconnectStrategy: attempts => Math.min(attempts * 50, 5000)
    }
});

let connected = false;

async function connect() {
    if (connected) return client;
    client.on('error', err => {
        console.error('Redis connect error', err);
    });
    await client.connect();
    connected = true;
    console.log('Redis client connected (services/redisClient.js)');
    return client;
}

module.exports = {
    client,
    connect
};
