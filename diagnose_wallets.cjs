const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: 'u926896353_aljooya1',
    password: 'Payel@098765',
    database: 'u926896353_aljooya1',
  });

  try {
    const [branches] = await pool.query("SELECT id, branch_name, wallet_balance, DATE_FORMAT(opening_date, '%Y-%m-%d') as op_date FROM branches");
    console.log("=== BRANCHES IN DATABASE ===");
    console.log(branches);

    for (const b of branches) {
      console.log(`\n--- WALLET CALCULATION FOR BRANCH: ${b.branch_name} (ID: ${b.id}) ---`);
      
      // Get sum of approved collections
      const [[{ approved_collections_sum }]] = await pool.query(
        "SELECT SUM(amount_paid) as approved_collections_sum FROM collections WHERE branch_id = ? AND status = 'approved'",
        [b.id]
      );
      
      // Get sum of disbursements
      const [[{ disbursements_sum }]] = await pool.query(
        "SELECT SUM(amount) as disbursements_sum FROM loans WHERE branch_id = ? AND status IN ('active', 'closed')",
        [b.id]
      );

      // Get sum of cash expenses
      const [[{ cash_expenses_sum }]] = await pool.query(
        "SELECT SUM(amount) as cash_expenses_sum FROM expenses WHERE branch_id = ? AND payment_method = 'cash'",
        [b.id]
      );

      // Get sum of approved wallet transfers (transfers from HO/Bank)
      // Wait, let's see where wallet transfers are stored
      const [walletReqTable] = await pool.query("SHOW TABLES LIKE 'branch_wallet_requests'");
      let transfers_sum = 0;
      if (walletReqTable.length > 0) {
        const [[{ t_sum }]] = await pool.query(
          "SELECT SUM(amount) as t_sum FROM branch_wallet_requests WHERE branch_id = ? AND status = 'approved'",
          [b.id]
        );
        transfers_sum = parseFloat(t_sum || 0);
      }

      console.log(`  Approved Collections:   ${approved_collections_sum || 0}`);
      console.log(`  Disbursements:          ${disbursements_sum || 0}`);
      console.log(`  Cash Expenses:          ${cash_expenses_sum || 0}`);
      console.log(`  Wallet Transfers (In):  ${transfers_sum}`);
      
      const computed_wallet = parseFloat(approved_collections_sum || 0) + transfers_sum - parseFloat(disbursements_sum || 0) - parseFloat(cash_expenses_sum || 0);
      console.log(`  Computed Wallet Balance: ${computed_wallet}`);
      console.log(`  Actual wallet_balance:   ${b.wallet_balance}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
