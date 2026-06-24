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
      SELECT id, branch_id, amount, disbursement_method, status
      FROM loans
      WHERE disbursement_method = 'wallet'
    `);
    console.log("=== WALLET DISBURSEMENTS ===");
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
