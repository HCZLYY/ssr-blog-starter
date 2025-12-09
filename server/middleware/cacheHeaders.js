// server/middleware/cacheHeaders.js
const crypto = require('crypto');

function makeETag(body) {
    return crypto.createHash('md5').update(typeof body === 'string' ? body : JSON.stringify(body)).digest('hex');
}

function isApiRequest(req) {
    if (!req) return false;
    const url = req.originalUrl || req.url || '';
    return url.startsWith('/api/');
}

function etagMiddleware(req, res, next) {
    const apiRequest = isApiRequest(req);
    if (apiRequest) {
        // API responses should always be fresh; don't let browsers cache them
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    // only attach weak etag handler for GET html responses
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'GET' || apiRequest) {
        return next();
    }

    const origJson = res.json.bind(res);
    res.json = (body) => {
        try {
            const tag = makeETag(body);
            res.set('ETag', tag);
            if (body && body.updated_at) res.set('Last-Modified', new Date(body.updated_at).toUTCString());
            const inm = req.get('If-None-Match');
            if (inm && inm === tag) {
                res.status(304).end();
                return;
            }
        } catch (e) {
            console.error('etag err', e);
        }
        return origJson(body);
    };
    next();
}

module.exports = etagMiddleware;
