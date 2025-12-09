// server/middleware/metricsLogger.js
const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, '..', 'logs', 'metrics.log');

if (!fs.existsSync(path.dirname(logPath))) fs.mkdirSync(path.dirname(logPath), { recursive: true });

module.exports = function metricsLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        const entry = {
            time: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl || req.url,
            status: res.statusCode,
            durationMs: ms,
            cacheHit: !!res.locals.cacheHit || false,
            clientIp: req.ip || req.connection?.remoteAddress || null
        };
        fs.appendFile(logPath, JSON.stringify(entry) + '\n', err => {
            if (err) console.warn('metrics log error', err);
        });
    });
    next();
};
