const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });

  try {
    console.log("=== ALL JUNE COLLECTIONS ===");
    const [rows] = await pool.query(`
      SELECT id, branch_id, amount_paid, DATE_FORMAT(payment_date, '%Y-%m-%d') as pay_date, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_time, DATE_FORMAT(approved_at, '%Y-%m-%d %H:%i:%s') as approved_time, status
      FROM collections
      WHERE payment_date >= '2026-06-15'
      ORDER BY payment_date DESC, id DESC
    `);
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
