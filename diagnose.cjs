const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });

  try {
    console.log("=== BRANCHES ===");
    const [branches] = await pool.query("SELECT id, branch_name, wallet_balance FROM branches");
    console.log(branches);

    console.log("\n=== COLLECTIONS STATUS COUNTS ===");
    const [collCounts] = await pool.query(`
      SELECT branch_id, status, COUNT(*) as count, SUM(amount_paid) as total_amount
      FROM collections
      GROUP BY branch_id, status
    `);
    console.log(collCounts);

    console.log("\n=== RECENT APPROVED COLLECTIONS ===");
    const [recentColls] = await pool.query(`
      SELECT id, branch_id, amount_paid, DATE_FORMAT(payment_date, '%Y-%m-%d') as pay_date, DATE_FORMAT(approved_at, '%Y-%m-%d %H:%i:%s') as approved_time, status
      FROM collections
      WHERE status = 'approved'
      ORDER BY id DESC
      LIMIT 10
    `);
    console.log(recentColls);

    console.log("\n=== COLLECTIONS BY PAYMENT_DATE IN JUNE ===");
    const [juneColls] = await pool.query(`
      SELECT DATE_FORMAT(payment_date, '%Y-%m-%d') as pay_date, branch_id, status, COUNT(*) as count, SUM(amount_paid) as total_amount
      FROM collections
      WHERE payment_date >= '2026-06-01'
      GROUP BY pay_date, branch_id, status
      ORDER BY pay_date DESC, branch_id
    `);
    console.log(juneColls);

    console.log("\n=== RECENT DAILY CASH BALANCES ===");
    const [cashBalances] = await pool.query(`
      SELECT id, branch_id, DATE_FORMAT(date, '%Y-%m-%d') as d_date, opening_balance, total_inflow, total_outflow, closing_balance, status
      FROM daily_cash_balances
      WHERE date >= '2026-06-15'
      ORDER BY date DESC, branch_id
    `);
    console.log(cashBalances);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
