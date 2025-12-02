const db = require('./services/db');
(async () => {
  try {
    const [rows] = await db.query('SELECT @@character_set_client as client, @@character_set_connection as connection, @@character_set_results as results;');
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
