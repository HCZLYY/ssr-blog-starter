/**
 * 简单的标签补录脚本，便于把演示文章的 tags 字段一次性写入数据库。
 * 使用 node server/scripts/seed-tags.js 执行（需要 MySQL/Redis 已启动）。
 */

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: Number(process.env.DATABASE_PORT || 6606),
  user: process.env.DATABASE_USER || 'ssr_user',
  password: process.env.DATABASE_PASSWORD || '20035313pass',
  database: process.env.DATABASE_NAME || 'ssr_blog',
  charset: 'utf8mb4'
};

const TAGS = {
  1: '数码配件,学生党,性价比',
  2: '手机摄影,拍摄技巧,构图',
  3: '续航,电池保养,效率',
  4: '云存储,备份工具,安全',
  5: '智能家居,智能灯,居家',
  6: '耳机,通勤,运动',
  7: '电脑优化,清理,提速',
  8: '短视频,剪辑,APP',
  9: '避雷,网红单品,踩坑',
  10: '远程办公,效率工具,硬件',
  11: '存储,硬盘,扩容'
};

async function main() {
  const conn = await mysql.createConnection(config);
  try {
    for (const [id, tags] of Object.entries(TAGS)) {
      await conn.execute('UPDATE articles SET tags=? WHERE id=?', [tags, Number(id)]);
    }
    console.log('[seed-tags] done');
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('[seed-tags] failed:', err);
  process.exitCode = 1;
});
