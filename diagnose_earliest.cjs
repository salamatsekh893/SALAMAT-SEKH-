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
      SELECT branch_id, MIN(date) as min_date
      FROM daily_cash_balances
      GROUP BY branch_id
    `);
    console.log("=== EARLIEST DATES ===");
    console.log(rows);

    for (const r of rows) {
      const [firstRow] = await pool.query(`
        SELECT * FROM daily_cash_balances
        WHERE branch_id = ? AND date = ?
      `, [r.branch_id, r.min_date]);
      console.log(`Earliest record for branch ${r.branch_id}:`, firstRow);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
