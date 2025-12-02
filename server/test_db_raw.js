const db = require('./services/db');

(async () => {
  try {
    const [rows] = await db.query('SELECT id, title FROM articles LIMIT 10');
    console.log('JS strings (as returned):');
    console.log(rows.map(r => ({ id: r.id, title: r.title })));
    console.log('\nJS hex of title bytes using Buffer.from(title, "utf8") (hex):');
    rows.forEach(r => {
      try {
        const buf = Buffer.from(r.title, 'utf8');
        console.log(r.id, buf.toString('hex'));
      } catch (e) {
        console.log('error buffer from title', e);
      }
    });
    process.exit(0);
  } catch (err) {
    console.error('db query err', err);
    process.exit(1);
  }
})();
