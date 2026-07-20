const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'pathcare',
    password: 'localpass',
    database: 'pathcare_db',
  });

  await client.connect();
  const res = await client.query('SELECT id, name, code, "Rate" FROM tenant_demo.tests ORDER BY name LIMIT 10');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
