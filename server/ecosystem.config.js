module.exports = {
    apps: [
        {
            name: 'ssr-blog-server',
            script: './index.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            env: { NODE_ENV: 'production' }
        }
        /*
        ,{
            name: 'warm_cache',
            script: './scripts/warm_cache.js',
            cwd: __dirname,
            instances: 1,
            exec_mode: 'fork',
            autorestart: false,
            watch: false,
            env: { NODE_ENV: 'production' }
        }
        */
    ]
};
