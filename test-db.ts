import mysql from 'mysql2/promise';

async function test() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });
  
  const [res] = await pool.query(
    `DELETE FROM daily_cash_balances WHERE id = 27`
  );
  console.log("Deleted wrong daybook row ID 27:", res);

  pool.end();
}

test();
