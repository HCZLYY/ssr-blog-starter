// server/scripts/sync_views.js
const db = require('../services/db');
const cache = require('../services/cache');

async function syncOnce() {
    const client = cache.getClient ? cache.getClient() : null;
    if (!client) {
        console.log('No redis client, skipping sync');
        return;
    }
    try {
        const keys = await client.keys('views:article:*');
        for (const key of keys) {
            const id = key.split(':').pop();
            const strVal = await client.get(key);
            const incrCount = parseInt(strVal, 10) || 0;
            if (incrCount > 0) {
                await db.query('UPDATE articles SET view_count = view_count + ? WHERE id = ?', [incrCount, id]);
                await client.del(key);
                console.log(`Synced ${incrCount} views for article ${id}`);
            }
        }
    } catch (err) {
        console.error('sync error', err);
    }
}

if (require.main === module) {
    syncOnce().then(() => process.exit(0));
}

module.exports = syncOnce;
