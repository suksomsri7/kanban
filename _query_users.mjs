import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const res = await client.query('SELECT username, "displayName", role FROM "User" ORDER BY role, username');
console.log(JSON.stringify(res.rows, null, 2));
await client.end();
