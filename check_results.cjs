const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });

  try {
    const [branches] = await pool.query("SELECT id, branch_name, wallet_balance FROM branches");
    console.log("=== BRANCHES ===");
    console.log(branches);

    const [dcb] = await pool.query(`
      SELECT branch_id, DATE_FORMAT(date, '%Y-%m-%d') as d_date, opening_balance, total_inflow, total_outflow, closing_balance, status
      FROM daily_cash_balances
      WHERE date >= '2026-06-18'
      ORDER BY date DESC, branch_id ASC
    `);
    console.log("=== DAILY CASH BALANCES >= 2026-06-18 ===");
    console.log(dcb);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
