// server/index.js - Express entry with SSR + admin login
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const renderPage = require('./ssr/renderPage');

try {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
    console.warn('[dotenv] unable to load server/.env', e && e.message);
}

const metricsLogger = require('./middleware/metricsLogger');
const etagMiddleware = require('./middleware/cacheHeaders');

const ADMIN_USER = process.env.ADMIN_USER || 'LYY';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'my-admin-token';

function ensureAdminPage(req, res, next) {
    const token = req.cookies && req.cookies.admin_token;
    if (token === ADMIN_TOKEN) return next();
    return res.redirect('/admin/login');
}

const app = express();

const viewsDir = path.join(__dirname, 'views');
if (!fs.existsSync(viewsDir)) {
    console.warn(`[startup] views directory missing at ${viewsDir}`);
}
app.set('views', viewsDir);
app.set('view engine', 'ejs');

app.use(metricsLogger);
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(etagMiddleware);
const clientDir = path.join(__dirname, '../client');
app.use(express.static(clientDir));

app.get('/__debug_routes', (req, res) => {
    try {
        const routes = [];
        app._router.stack.forEach(mw => {
            if (mw.route) {
                routes.push({ path: mw.route.path, methods: Object.keys(mw.route.methods).join(',') });
            } else if (mw.name === 'router' && mw.handle && mw.handle.stack) {
                mw.handle.stack.forEach(r => {
                    if (r.route) routes.push({ path: r.route.path, methods: Object.keys(r.route.methods).join(',') });
                });
            }
        });
        res.json({ routes });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

try {
    const adminRouter = require('./routes/admin');
    app.use('/api/v1/admin', adminRouter);

    app.get('/admin/login', (req, res) => {
        if (req.cookies && req.cookies.admin_token) {
            res.clearCookie('admin_token');
        }
        return res.render('admin-login', { adminUser: ADMIN_USER });
    });

    app.get('/admin/logout', (req, res) => {
        res.clearCookie('admin_token');
        return res.redirect('/admin/login');
    });

    app.get('/admin/articles', ensureAdminPage, (req, res) => {
        return res.render('admin-articles');
    });
} catch (e) {
    console.warn('[startup] admin router not loaded', e && e.message);
}

let articleRoutes;
try {
    articleRoutes = require('./routes/articles');
    app.use('/api/v1/articles', articleRoutes);
} catch (e) {
    console.error('[startup] failed to load article routes', e && e.message);
}

// AI 写作助手已移除，不再挂载 /api/v1/ai

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err && (err.stack || err.message || err));
    if (res.headersSent) return next(err);
    res.status(500).send('Internal Server Error');
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log(`Express server started on ${port}`);
});

app.get('/', async (req, res) => {
    try {
        const html = await renderPage('list', { page: 1 });
        res.send(html);
    } catch (err) {
        console.error('SSR list error:', err && (err.stack || err.message || err));
        res.status(500).send('Server Error (SSR list)');
    }
});

app.get('/articles/:id', async (req, res) => {
    try {
        const html = await renderPage('detail', { id: req.params.id });
        res.send(html);
    } catch (err) {
        console.error('SSR detail error:', err && (err.stack || err.message || err));
        res.status(500).send('Server Error (SSR detail)');
    }
});
