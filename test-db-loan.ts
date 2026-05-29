import mysql from 'mysql2/promise';

async function test() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });
  
  const [cols] = await pool.query('SELECT * FROM collections WHERE loan_id = 56 ORDER BY id');
  console.log("Collections:", cols);
  pool.end();
}

test();


