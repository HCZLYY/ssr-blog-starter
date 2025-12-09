// server/index.js  �?完整替换该文�?
/* server entry �?loads .env from server/ explicitly to avoid pm2 cwd issues */
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const renderPage = require('./ssr/renderPage');

// --- dotenv: explicitly load server/.env using __dirname ---
try {
    // require dotenv from node_modules in project (must be installed in project)
    require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
    console.warn('[dotenv] warning: dotenv not loaded via require; continuing (check node_modules).', e && e.message);
}

// quick debug info to make env loading visible in logs
console.log('[startup] __dirname =', __dirname);
console.log('[startup] process.cwd() =', process.cwd());
console.log('[startup] ADMIN_USER from process.env =', process.env.ADMIN_USER || '(not set)');

const metricsLogger = require('./middleware/metricsLogger');
const etagMiddleware = require('./middleware/cacheHeaders');

const app = express();

app.get('/health', (req, res) => res.status(200).send('ok'));



// views 目录（确保存在）
const viewsDir = path.join(__dirname, 'views');
if (!fs.existsSync(viewsDir)) {
    console.warn(`WARNING: views directory not found at ${viewsDir}. Create it and add templates.`);
}
app.set('views', viewsDir);
app.set('view engine', 'ejs');

// 中间�?
app.use(metricsLogger);
app.use(cors());
app.use(express.json());
app.use(etagMiddleware);
app.use(express.static(path.join(__dirname, "../client")));

// 临时探测路由（添加到 server/index.js，重启服务后删除�?
app.get('/__debug_routes', (req, res) => {
    try {
        const routes = [];
        app._router.stack.forEach(mw => {
            if (mw.route) {
                const path = mw.route.path;
                const methods = Object.keys(mw.route.methods).join(',');
                routes.push({ path, methods });
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


// admin route (token + rate limited)
try {
    const adminRouter = require('./routes/admin');
    // 注意：前端JS�?ADMIN_API_BASE 要对应这个路径（默认�?api/v1/admin�?
    app.use('/api/v1/admin', adminRouter);

    // 服务器端渲染的管理页路由（简易）
    app.get('/admin/articles', (req, res) => {
        return res.render('admin-articles'); // 渲染 server/views/admin-articles.ejs
    });
} catch (e) {
    console.warn('[startup] admin router not loaded (ok if not present)', e && e.message);
}

// articles route (API + SSR)
let articleRoutes;
try {
    articleRoutes = require('./routes/articles');
    // 挂载 API 路径�?SSR 路径
    app.use('/api/v1/articles', articleRoutes); // JSON API 风格
    // SSR 页面由下方 renderPage('/' 和 '/articles/:id') 负责输出
} catch (e) {
    console.error('[startup] Failed to load routes/articles.js - check file syntax', e && e.message);
}

// ai route (optional)
try {
    const aiRouter = require('./routes/ai');
    app.use('/api/v1/ai', aiRouter);
} catch (e) {
    // ignore if not present
}

// simple health route
app.get('/health', (req, res) => res.json({ ok: true }));

// friendly error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err && (err.stack || err.message || err));
    if (res.headersSent) return next(err);
    res.status(500).send('Internal Server Error');
});

// start
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log(`Express server started on ${port}`);
    console.log('Views dir =', app.get('views'));
    if (articleRoutes) {
        console.log('articles routes mounted at: /api/v1/articles  and /articles');
    } else {
        console.log('articles routes NOT mounted (check server/routes/articles.js)');
    }
});

app.get('/', async (req, res) => {
    try {
        // 这里我们可以在服务端预取文章数据（先用占位）
        // 后续会把 db.query 返回的文章列表注入模板
        const html = await renderPage('list', { page: 1 });
        res.send(html);
    } catch (err) {
        console.error('SSR list error:', err && (err.stack || err.message || err));
        res.status(500).send('Server Error (SSR list)');
    }
});

// SSR 详情页
app.get('/articles/:id', async (req, res) => {
    try {
        const html = await renderPage('detail', { id: req.params.id });
        res.send(html);
    } catch (err) {
        console.error('SSR detail error:', err && (err.stack || err.message || err));
        res.status(500).send('Server Error (SSR detail)');
    }
});
