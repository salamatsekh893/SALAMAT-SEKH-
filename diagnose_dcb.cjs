const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });

  try {
    const [rows] = await pool.query(`
      SELECT id, branch_id, DATE_FORMAT(date, '%Y-%m-%d') as d_date, opening_balance, total_inflow, total_outflow, closing_balance, status
      FROM daily_cash_balances
      ORDER BY date DESC, branch_id ASC
      LIMIT 100
    `);
    console.log("=== DAILY CASH BALANCES (NEWEST) ===");
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
