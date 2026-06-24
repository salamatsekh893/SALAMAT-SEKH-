const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });

  try {
    console.log("=== EARLIEST TRANSACTIONS IN COLLECTIONS ===");
    const [cRows] = await pool.query("SELECT branch_id, MIN(payment_date) as min_date, MAX(payment_date) as max_date, COUNT(*) as cnt FROM collections GROUP BY branch_id");
    console.log(cRows);

    console.log("=== EARLIEST TRANSACTIONS IN SAVINGS ===");
    const [sRows] = await pool.query("SELECT m.branch_id, MIN(st.date) as min_date, MAX(st.date) as max_date, COUNT(*) as cnt FROM savings_transactions st JOIN savings_accounts sa ON st.savings_account_id = sa.id JOIN members m ON sa.member_id = m.id GROUP BY m.branch_id");
    console.log(sRows);

    console.log("=== EARLIEST EXPENSES ===");
    const [eRows] = await pool.query("SELECT branch_id, MIN(date) as min_date, MAX(date) as max_date, COUNT(*) as cnt FROM expenses GROUP BY branch_id");
    console.log(eRows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
