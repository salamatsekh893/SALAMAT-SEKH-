import mysql from 'mysql2/promise';

async function test() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });
  
  const bId = 2; // Bhatar
  const date = '2026-06-01';

  const [opResult]: any = await pool.query(
    `SELECT COALESCE(
      (SELECT opening_balance FROM daily_cash_balances WHERE branch_id = ? AND DATE(date) = ? AND status = 'closed'),
      (SELECT closing_balance FROM daily_cash_balances WHERE branch_id = ? AND DATE(date) < ? ORDER BY date DESC LIMIT 1),
      0
    ) as opening_balance`,
    [bId, date, bId, date]
  );
  console.log("Calculated Opening Balance for June 1st:", opResult[0]?.opening_balance);

  pool.end();
}

test();
