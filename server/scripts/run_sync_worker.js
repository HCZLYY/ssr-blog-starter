const syncOnce = require('./sync_views');

console.log('Starting sync worker (runs every 60s)...');
syncOnce(); // run immediately
setInterval(() => {
    syncOnce();
}, 60 * 1000);