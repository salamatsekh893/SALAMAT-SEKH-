import mysql from 'mysql2/promise';

async function test() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'u926896353_aljooya1',
    password: process.env.DB_PASSWORD || 'rayhan123456',
    database: process.env.DB_NAME || 'u926896353_aljooya1',
  });
  
  const [rows] = await pool.query('SELECT name, phone, role FROM users');
  console.log(rows);
  pool.end();
}

test();
